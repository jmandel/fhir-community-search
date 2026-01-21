/**
 * FHIR Chat (chat.fhir.org) Message Downloader
 * 
 * Downloads messages from the FHIR Zulip chat into a local SQLite database.
 * 
 * Authentication options:
 *   --email/--api-key    Use Zulip API credentials
 *   --cred-file          Path to zuliprc-style credentials file
 *   --browser            Use browser scraping (slower, for public streams only)
 * 
 * Usage:
 *   bun run src/download.ts --email user@example.com --api-key xxx
 *   bun run src/download.ts --cred-file ~/.zuliprc
 *   bun run src/download.ts --browser  # Scrape public streams only
 */

import { Database } from "bun:sqlite";
import { parseArgs } from "util";
import { existsSync, readFileSync } from "fs";

const BASE_URL = "https://chat.fhir.org";
const API_URL = `${BASE_URL}/api/v1`;

interface Credentials {
  email: string;
  apiKey: string;
}

interface ZulipStream {
  stream_id: number;
  name: string;
  description: string;
  is_web_public: boolean;
  message_retention_days: number | null;
}

interface ZulipMessage {
  id: number;
  sender_id: number;
  sender_full_name: string;
  sender_email: string;
  content: string;
  subject: string;  // topic
  timestamp: number;
  stream_id: number;
  display_recipient: string;  // stream name
  reactions: Array<{ emoji_name: string; user_id: number }>;
}

function parseCredFile(path: string): Credentials {
  const content = readFileSync(path, "utf-8");
  let email = "";
  let apiKey = "";
  
  for (const line of content.split("\n")) {
    const [key, val] = line.split("=").map(s => s.trim());
    if (key === "email") email = val;
    if (key === "key") apiKey = val;
  }
  
  if (!email || !apiKey) {
    throw new Error("Credentials file must contain email= and key= lines");
  }
  
  return { email, apiKey };
}

async function apiRequest(endpoint: string, creds: Credentials, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  
  const auth = Buffer.from(`${creds.email}:${creds.apiKey}`).toString("base64");
  
  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Basic ${auth}`,
      "Accept": "application/json",
    },
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
  }
  
  return response.json();
}

async function getStreams(creds: Credentials): Promise<ZulipStream[]> {
  const result = await apiRequest("/streams", creds, { include_web_public: "true" });
  return result.streams;
}

async function getMessages(
  creds: Credentials,
  streamId: number,
  anchor: string | number = "oldest",
  numAfter = 1000
): Promise<{ messages: ZulipMessage[]; found_newest: boolean }> {
  const narrow = JSON.stringify([{ operator: "stream", operand: streamId }]);
  const result = await apiRequest("/messages", creds, {
    anchor: String(anchor),
    num_before: "0",
    num_after: String(numAfter),
    narrow,
  });
  return { messages: result.messages, found_newest: result.found_newest };
}

function createDatabase(dbPath: string): Database {
  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  
  // Drop old tables for fresh start
  db.exec("DROP TABLE IF EXISTS messages_fts");
  db.exec("DROP TABLE IF EXISTS messages");
  db.exec("DROP TABLE IF EXISTS streams");
  
  db.exec(`
    CREATE TABLE streams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_web_public INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0
    )
  `);
  
  db.exec(`
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY,
      stream_id INTEGER NOT NULL,
      stream_name TEXT NOT NULL,
      topic TEXT NOT NULL,
      sender_id INTEGER,
      sender_name TEXT,
      sender_email TEXT,
      content TEXT,
      timestamp INTEGER,
      created_at TEXT,
      reactions TEXT,
      FOREIGN KEY (stream_id) REFERENCES streams(id)
    )
  `);
  
  db.exec(`
    CREATE VIRTUAL TABLE messages_fts USING fts5(
      stream_name,
      topic,
      sender_name,
      content,
      content='messages',
      content_rowid='id'
    )
  `);
  
  return db;
}

function openDatabaseForResume(dbPath: string): Database {
  return new Database(dbPath);
}

function getLastMessageId(db: Database, streamId: number): number | null {
  const row = db.query(
    "SELECT MAX(id) as max_id FROM messages WHERE stream_id = ?"
  ).get(streamId) as any;
  return row?.max_id || null;
}

function insertStream(db: Database, stream: ZulipStream) {
  db.prepare(`
    INSERT OR REPLACE INTO streams (id, name, description, is_web_public)
    VALUES (?, ?, ?, ?)
  `).run(stream.stream_id, stream.name, stream.description, stream.is_web_public ? 1 : 0);
}

function insertMessages(db: Database, messages: ZulipMessage[]) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO messages 
    (id, stream_id, stream_name, topic, sender_id, sender_name, sender_email, content, timestamp, created_at, reactions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const msg of messages) {
    const createdAt = new Date(msg.timestamp * 1000).toISOString();
    const reactions = msg.reactions?.length ? JSON.stringify(msg.reactions) : null;
    
    insert.run(
      msg.id,
      msg.stream_id,
      msg.display_recipient,
      msg.subject,
      msg.sender_id,
      msg.sender_full_name,
      msg.sender_email,
      msg.content,
      msg.timestamp,
      createdAt,
      reactions
    );
  }
}

function createIndexes(db: Database) {
  console.log("Creating indexes...");
  db.exec("CREATE INDEX IF NOT EXISTS idx_stream ON messages(stream_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_topic ON messages(topic)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_sender ON messages(sender_name)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_stream_topic ON messages(stream_id, topic)");
}

function updateStreamCounts(db: Database) {
  db.exec(`
    UPDATE streams SET message_count = (
      SELECT COUNT(*) FROM messages WHERE messages.stream_id = streams.id
    )
  `);
}

async function downloadWithApi(creds: Credentials, dbPath: string, resume: boolean) {
  console.log("Testing connection...");
  const allStreams = await getStreams(creds);
  console.log(`Found ${allStreams.length} total streams`);
  
  // Filter to only web-public streams (no private channels)
  const streams = allStreams.filter(s => s.is_web_public);
  console.log(`Filtering to ${streams.length} PUBLIC streams only (skipping ${allStreams.length - streams.length} private)`);
  
  let db: Database;
  if (resume && existsSync(dbPath)) {
    console.log(`Resuming from existing database: ${dbPath}`);
    db = openDatabaseForResume(dbPath);
  } else {
    console.log(`Creating fresh database: ${dbPath}`);
    db = createDatabase(dbPath);
  }
  
  // Insert streams
  for (const stream of streams) {
    insertStream(db, stream);
  }
  
  let totalMessages = 0;
  
  // Download messages from each stream
  console.log("\n" + "=".repeat(60));
  console.log("Starting download of public streams...");
  console.log("=".repeat(60) + "\n");
  
  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    const progress = `[${i + 1}/${streams.length}]`;
    const startTime = Date.now();
    
    // Get anchor for resume
    let anchor: string | number = "oldest";
    if (resume) {
      const lastId = getLastMessageId(db, stream.stream_id);
      if (lastId) {
        anchor = lastId;
        console.log(`${progress} #${stream.name} - resuming from message ${lastId}`);
      } else {
        console.log(`${progress} #${stream.name} - starting fresh`);
      }
    } else {
      console.log(`${progress} #${stream.name}`);
    }
    
    let streamMessages = 0;
    let foundNewest = false;
    let batchCount = 0;
    
    while (!foundNewest) {
      try {
        const result = await getMessages(creds, stream.stream_id, anchor, 1000);
        batchCount++;
        
        if (result.messages.length === 0) {
          break;
        }
        
        db.exec("BEGIN");
        insertMessages(db, result.messages);
        db.exec("COMMIT");
        
        streamMessages += result.messages.length;
        anchor = result.messages[result.messages.length - 1].id;
        foundNewest = result.found_newest;
        
        // Show progress with batch info
        process.stdout.write(`\r        ${streamMessages.toLocaleString()} messages (batch ${batchCount})...`);
        
        // Rate limit
        await Bun.sleep(100);
      } catch (error: any) {
        console.error(`\n        Error: ${error.message}`);
        db.exec("ROLLBACK");
        break;
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\r        ✓ ${streamMessages.toLocaleString()} messages in ${elapsed}s`);
    totalMessages += streamMessages;
  }
  
  console.log("\n" + "=".repeat(60));
  
  console.log("\nBuilding FTS index...");
  db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
  
  createIndexes(db);
  updateStreamCounts(db);
  
  // Print stats
  const msgCount = db.query("SELECT COUNT(*) as cnt FROM messages").get() as any;
  const streamCount = db.query("SELECT COUNT(*) as cnt FROM streams").get() as any;
  
  console.log("\n✅ Done!");
  console.log(`   Streams: ${streamCount.cnt}`);
  console.log(`   Messages: ${msgCount.cnt}`);
  console.log(`   Database: ${dbPath}`);
  
  db.close();
}

// Browser-based scraping for public streams (when no API credentials)
async function downloadWithBrowser(dbPath: string) {
  console.log("Browser scraping not yet implemented.");
  console.log("Please provide API credentials with --email and --api-key");
  console.log("\nTo get API credentials:");
  console.log("1. Log in to https://chat.fhir.org");
  console.log("2. Go to Settings > Personal Settings > Account & Privacy");
  console.log("3. Click 'Show/change your API key'");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
FHIR Chat Downloader

Downloads messages from chat.fhir.org into a local SQLite database.

Usage:
  bun run src/download.ts --email <email> --api-key <key>
  bun run src/download.ts --cred-file <path>

Options:
  --email <email>      Your chat.fhir.org email
  --api-key <key>      Your Zulip API key
  --cred-file <path>   Path to zuliprc-style credentials file
  --output <file>      Output database path (default: fhir_chat.db)
  --resume             Resume interrupted download
  --help               Show this help

To get API credentials:
  1. Log in to https://chat.fhir.org
  2. Go to Settings > Personal Settings > Account & Privacy
  3. Click 'Show/change your API key'
`);
    return;
  }
  
  const { values } = parseArgs({
    args,
    options: {
      email: { type: "string" },
      "api-key": { type: "string" },
      "cred-file": { type: "string" },
      output: { type: "string", default: new URL("./data.db", import.meta.url).pathname },
      resume: { type: "boolean", default: false },
      browser: { type: "boolean", default: false },
    },
  });
  
  const dbPath = values.output as string;
  const resume = values.resume as boolean;
  
  // Determine credentials
  let creds: Credentials | null = null;
  
  if (values["cred-file"]) {
    creds = parseCredFile(values["cred-file"] as string);
  } else if (values.email && values["api-key"]) {
    creds = { email: values.email as string, apiKey: values["api-key"] as string };
  }
  
  if (creds) {
    await downloadWithApi(creds, dbPath, resume);
  } else if (values.browser) {
    await downloadWithBrowser(dbPath);
  } else {
    console.error("Usage:");
    console.error("  bun run src/download.ts --email <email> --api-key <key>");
    console.error("  bun run src/download.ts --cred-file <path>");
    console.error("  bun run src/download.ts --browser  (for public streams only)");
    console.error("\nOptions:");
    console.error("  --output <file>   Output database path (default: fhir_chat.db)");
    console.error("  --resume          Resume interrupted download");
    process.exit(1);
  }
}

main().catch(console.error);
