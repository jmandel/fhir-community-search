/**
 * FHIR Chat Search CLI
 * 
 * Search interface for chat.fhir.org messages.
 * 
 * Usage:
 *   bun run src/search.ts <command> [options]
 * 
 * Commands:
 *   fts <query>         Full-text search across all messages
 *   stream <name>       Find messages in a specific stream/channel
 *   topic <topic>       Find messages in a specific topic
 *   thread <stream> <topic>  View conversation thread
 *   snapshot <stream> <topic>  Get COMPLETE thread snapshot (all messages, full content)
 *   user <name>         Find messages from a specific user
 *   recent [days]       Show recent messages (default: 7 days)
 *   stats               Show database statistics
 *   streams             List all streams
 *   topics <stream>     List topics in a stream
 *   sql <query>         Execute raw SQL query
 */

import { Database } from "bun:sqlite";
import { parseArgs } from "util";

const DB_PATH = process.env.FHIR_ZULIP_DB || new URL("./data.db", import.meta.url).pathname;

function getDb(): Database {
  return new Database(DB_PATH, { readonly: true });
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n+/g, " ")
    .trim();
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");
}

function formatResults(rows: any[], verbose = false): void {
  if (rows.length === 0) {
    console.log("No results found.");
    return;
  }
  
  for (const row of rows) {
    const time = formatTimestamp(row.timestamp);
    const content = stripHtml(row.content || "").slice(0, verbose ? 200 : 100);
    
    console.log(`\n[${time}] #${row.stream_name} > ${row.topic}`);
    console.log(`  ${row.sender_name}: ${content}${content.length >= (verbose ? 200 : 100) ? "..." : ""}`);
  }
  
  console.log(`\n--- ${rows.length} message(s) ---`);
}

function fts(query: string, limit: number, json: boolean, stream?: string): void {
  const db = getDb();
  
  let sql = `
    SELECT m.id, m.stream_name, m.topic, m.sender_name, m.content, m.timestamp
    FROM messages_fts fts
    JOIN messages m ON m.id = fts.rowid
    WHERE messages_fts MATCH $query
  `;
  
  const params: Record<string, any> = { $query: query, $limit: limit };
  
  if (stream) {
    sql += " AND m.stream_name LIKE $stream";
    params.$stream = `%${stream}%`;
  }
  
  sql += " ORDER BY m.timestamp DESC LIMIT $limit";
  
  const rows = db.query(sql).all(params);
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    console.log(`Full-text search: "${query}"${stream ? ` in #${stream}` : ""}`);
    formatResults(rows, true);
  }
  
  db.close();
}

function searchStream(streamName: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT id, stream_name, topic, sender_name, content, timestamp
    FROM messages
    WHERE stream_name LIKE $pattern
    ORDER BY timestamp DESC
    LIMIT $limit
  `).all({ $pattern: `%${streamName}%`, $limit: limit });
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    console.log(`Messages in stream: "${streamName}"`);
    formatResults(rows);
  }
  
  db.close();
}

function searchTopic(topic: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT id, stream_name, topic, sender_name, content, timestamp
    FROM messages
    WHERE topic LIKE $pattern
    ORDER BY timestamp DESC
    LIMIT $limit
  `).all({ $pattern: `%${topic}%`, $limit: limit });
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    console.log(`Messages in topic: "${topic}"`);
    formatResults(rows);
  }
  
  db.close();
}

function searchUser(userName: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT id, stream_name, topic, sender_name, content, timestamp
    FROM messages
    WHERE sender_name LIKE $pattern
    ORDER BY timestamp DESC
    LIMIT $limit
  `).all({ $pattern: `%${userName}%`, $limit: limit });
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    console.log(`Messages from user: "${userName}"`);
    formatResults(rows);
  }
  
  db.close();
}

function recentMessages(days: number, limit: number, json: boolean): void {
  const db = getDb();
  
  const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const rows = db.query(`
    SELECT id, stream_name, topic, sender_name, content, timestamp
    FROM messages
    WHERE timestamp > $cutoff
    ORDER BY timestamp DESC
    LIMIT $limit
  `).all({ $cutoff: cutoff, $limit: limit });
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    console.log(`Messages from last ${days} day(s)`);
    formatResults(rows);
  }
  
  db.close();
}

function showStats(): void {
  const db = getDb();
  
  console.log("FHIR Chat Database Statistics");
  console.log("=".repeat(60));
  
  const msgCount = db.query("SELECT COUNT(*) as cnt FROM messages").get() as any;
  const streamCount = db.query("SELECT COUNT(*) as cnt FROM streams").get() as any;
  const topicCount = db.query("SELECT COUNT(DISTINCT topic) as cnt FROM messages").get() as any;
  const userCount = db.query("SELECT COUNT(DISTINCT sender_name) as cnt FROM messages").get() as any;
  
  console.log(`\nTotal messages: ${msgCount.cnt.toLocaleString()}`);
  console.log(`Total streams: ${streamCount.cnt}`);
  console.log(`Total topics: ${topicCount.cnt.toLocaleString()}`);
  console.log(`Total users: ${userCount.cnt}`);
  
  // Date range
  const range = db.query(`
    SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM messages
  `).get() as any;
  if (range.oldest && range.newest) {
    console.log(`\nDate range: ${formatTimestamp(range.oldest)} to ${formatTimestamp(range.newest)}`);
  }
  
  console.log("\n--- Top Streams by Messages ---");
  const streams = db.query(`
    SELECT stream_name, COUNT(*) as cnt
    FROM messages
    GROUP BY stream_name
    ORDER BY cnt DESC
    LIMIT 15
  `).all() as any[];
  for (const row of streams) {
    console.log(`  ${row.stream_name.padEnd(35)} ${row.cnt.toString().padStart(8)}`);
  }
  
  console.log("\n--- Top Users by Messages ---");
  const users = db.query(`
    SELECT sender_name, COUNT(*) as cnt
    FROM messages
    GROUP BY sender_name
    ORDER BY cnt DESC
    LIMIT 15
  `).all() as any[];
  for (const row of users) {
    console.log(`  ${row.sender_name.padEnd(35)} ${row.cnt.toString().padStart(8)}`);
  }
  
  console.log("\n--- Recent Activity (messages/day, last 7 days) ---");
  const recent = db.query(`
    SELECT date(timestamp, 'unixepoch') as day, COUNT(*) as cnt
    FROM messages
    WHERE timestamp > unixepoch('now', '-7 days')
    GROUP BY day
    ORDER BY day DESC
  `).all() as any[];
  for (const row of recent) {
    console.log(`  ${row.day}  ${row.cnt.toString().padStart(6)}`);
  }
  
  db.close();
}

function listStreams(json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT s.id, s.name, s.description, s.is_web_public, 
           COALESCE(s.message_count, 0) as message_count
    FROM streams s
    ORDER BY message_count DESC
  `).all();
  
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log("Streams:");
    for (const row of rows as any[]) {
      const pub = row.is_web_public ? "[public]" : "";
      console.log(`  ${row.name.padEnd(35)} ${row.message_count.toString().padStart(8)} msgs ${pub}`);
    }
    console.log(`\n--- ${rows.length} stream(s) ---`);
  }
  
  db.close();
}

function listTopics(streamName: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT topic, COUNT(*) as msg_count, MAX(timestamp) as last_msg
    FROM messages
    WHERE stream_name LIKE $pattern
    GROUP BY topic
    ORDER BY last_msg DESC
    LIMIT $limit
  `).all({ $pattern: `%${streamName}%`, $limit: limit });
  
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Topics in stream "${streamName}":`);
    for (const row of rows as any[]) {
      const lastMsg = formatTimestamp(row.last_msg);
      console.log(`  ${row.topic.slice(0, 40).padEnd(42)} ${row.msg_count.toString().padStart(5)} msgs  (${lastMsg})`);
    }
    console.log(`\n--- ${rows.length} topic(s) ---`);
  }
  
  db.close();
}

function getThread(streamName: string, topic: string, limit: number, json: boolean, fullSnapshot = false): void {
  const db = getDb();
  
  // For snapshot mode, get all messages (no limit unless explicitly set)
  const effectiveLimit = fullSnapshot ? 1000 : limit;
  
  const rows = db.query(`
    SELECT id, stream_name, topic, sender_name, sender_email, content, timestamp, reactions
    FROM messages
    WHERE stream_name LIKE $stream AND topic LIKE $topic
    ORDER BY timestamp ASC
    LIMIT $limit
  `).all({ $stream: `%${streamName}%`, $topic: `%${topic}%`, $limit: effectiveLimit });
  
  if (json) {
    console.log(JSON.stringify(rows.map(r => ({
      ...r as any,
      content: stripHtml((r as any).content)
    })), null, 2));
  } else {
    if (rows.length > 0) {
      const first = rows[0] as any;
      const last = rows[rows.length - 1] as any;
      console.log(`${fullSnapshot ? "Snapshot" : "Thread"}: #${first.stream_name} > ${first.topic}`);
      console.log(`URL: https://chat.fhir.org/#narrow/stream/${encodeURIComponent(first.stream_name)}/topic/${encodeURIComponent(first.topic)}`);
      console.log(`Date range: ${formatTimestamp(first.timestamp)} to ${formatTimestamp(last.timestamp)}`);
      console.log("=".repeat(70));
    }
    for (const row of rows as any[]) {
      const time = formatTimestamp(row.timestamp);
      const content = stripHtml(row.content);
      console.log(`\n[${time}] ${row.sender_name}:`);
      console.log(content);
    }
    console.log(`\n--- ${rows.length} message(s) ---`);
    if (rows.length === effectiveLimit) {
      console.log(`(results limited to ${effectiveLimit}; use --limit to adjust)`);
    }
  }
  
  db.close();
}

function execSql(query: string, json: boolean): void {
  const db = getDb();
  
  try {
    const rows = db.query(query).all();
    
    if (json) {
      console.log(JSON.stringify(rows, null, 2));
    } else {
      if (rows.length === 0) {
        console.log("No results");
        return;
      }
      
      const keys = Object.keys(rows[0] as object);
      console.log(keys.join("\t"));
      for (const row of rows as any[]) {
        const vals = keys.map(k => {
          const v = row[k];
          if (v == null) return "";
          const s = String(v);
          return s.length > 60 ? s.slice(0, 57) + "..." : s;
        });
        console.log(vals.join("\t"));
      }
      console.log(`\n--- ${rows.length} row(s) ---`);
    }
  } catch (error: any) {
    console.error("SQL Error:", error.message);
  }
  
  db.close();
}

function printHelp(): void {
  console.log(`
FHIR Chat Search

Usage: bun run src/search.ts <command> [options]

Commands:
  fts <query>          Full-text search across all messages
  stream <name>        Find messages in a specific stream/channel
  topic <topic>        Find messages in a specific topic  
  thread <stream> <topic>  View conversation thread (limited)
  snapshot <stream> <topic>  Get COMPLETE thread snapshot - all messages with
                       full content. Use after FTS to get full context.
  user <name>          Find messages from a specific user
  recent [days]        Show recent messages (default: 7 days)
  stats                Show database statistics
  streams              List all streams
  topics <stream>      List topics in a stream
  sql <query>          Execute raw SQL query

Options:
  --limit <n>          Max results (default: 20)
  --json               Output as JSON
  --stream <name>      Filter FTS results to a specific stream
  --help               Show this help

Recommended Workflow:
  1. Search:   bun run zulip:search fts "your topic"
  2. Snapshot: bun run zulip:search snapshot "stream" "topic name"
  3. Analyze the full conversation, then search for related threads

Examples:
  bun run src/search.ts fts "Patient resource"
  bun run src/search.ts fts "validation" --stream implementers
  bun run src/search.ts stream implementers --limit 50
  bun run src/search.ts topic "FHIR R6"
  bun run src/search.ts thread implementers "validation error"
  bun run src/search.ts snapshot implementers "validation error"  # Full thread
  bun run src/search.ts snapshot smart "organization identity" --json
  bun run src/search.ts user "Grahame Grieve"
  bun run src/search.ts recent 3
  bun run src/search.ts topics implementers
  bun run src/search.ts sql "SELECT COUNT(*) FROM messages"

Environment:
  FHIR_CHAT_DB    Path to database file (default: fhir_chat.db)
`);
}

async function main() {
  const args = Bun.argv.slice(2);
  
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  
  const { values, positionals } = parseArgs({
    args,
    options: {
      limit: { type: "string", default: "20" },
      json: { type: "boolean", default: false },
      stream: { type: "string" },
    },
    allowPositionals: true,
  });
  
  const limit = parseInt(values.limit as string, 10);
  const json = values.json as boolean;
  const command = positionals[0];
  const arg = positionals.slice(1).join(" ");
  
  switch (command) {
    case "fts":
      if (!arg) { console.error("Usage: fts <query>"); return; }
      fts(arg, limit, json, values.stream as string);
      break;
      
    case "stream":
      if (!arg) { console.error("Usage: stream <name>"); return; }
      searchStream(arg, limit, json);
      break;
      
    case "topic":
      if (!arg) { console.error("Usage: topic <topic>"); return; }
      searchTopic(arg, limit, json);
      break;
      
    case "thread":
      if (positionals.length < 3) { 
        console.error("Usage: thread <stream> <topic>"); 
        return; 
      }
      getThread(positionals[1], positionals.slice(2).join(" "), limit, json, false);
      break;
      
    case "snapshot":
      if (positionals.length < 3) { 
        console.error("Usage: snapshot <stream> <topic>"); 
        return; 
      }
      getThread(positionals[1], positionals.slice(2).join(" "), limit, json, true);
      break;
      
    case "user":
      if (!arg) { console.error("Usage: user <name>"); return; }
      searchUser(arg, limit, json);
      break;
      
    case "recent":
      const days = arg ? parseInt(arg, 10) : 7;
      recentMessages(days, limit, json);
      break;
      
    case "stats":
      showStats();
      break;
      
    case "streams":
      listStreams(json);
      break;
      
    case "topics":
      if (!arg) { console.error("Usage: topics <stream>"); return; }
      listTopics(arg, limit, json);
      break;
      
    case "sql":
      if (!arg) { console.error("Usage: sql <query>"); return; }
      execSql(arg, json);
      break;
      
    default:
      // Treat as FTS query
      fts(positionals.join(" "), limit, json);
  }
}

main().catch(console.error);
