/**
 * FHIR Jira Issue Downloader
 * 
 * Downloads all FHIR specification issues from jira.hl7.org and loads them
 * into a local SQLite database with semantic column names.
 * 
 * Usage:
 *   bun run src/download.ts --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"
 *   bun run src/download.ts --cookie-file cookies.txt
 *   bun run src/download.ts --cookie-file cookies.txt --resume  # Resume interrupted download
 */

import { Database } from "bun:sqlite";
import { parseArgs } from "util";
import { existsSync } from "fs";

const BASE_URL = "https://jira.hl7.org/rest/api/2/search";

// All fields we want to capture - comprehensive list
const FIELDS = [
  // Standard Jira fields
  "key", "summary", "description", "issuetype", "status", "resolution",
  "priority", "created", "updated", "resolutiondate",
  "reporter", "assignee", "labels", "components", "comment",
  
  // FHIR custom fields (with their semantic meanings)
  "customfield_11302",  // Specification (e.g., FHIR-core)
  "customfield_11808",  // Raised in Version (e.g., R5, R6)
  "customfield_11300",  // Related Artifact(s) (e.g., Patient, Observation)
  "customfield_11400",  // Work Group (e.g., FHIR Infrastructure)
  "customfield_11807",  // Applied for Version
  "customfield_10618",  // Resolution Description
  "customfield_10510",  // Resolution Vote (e.g., "10-0-0")
  "customfield_10511",  // Change Impact (Non-compatible, Compatible, etc.)
  "customfield_10512",  // Change Category (Correction, Enhancement, etc.)
  "customfield_10525",  // Vote Date
  "customfield_10612",  // Related URL
  "customfield_11301",  // Related Page(s)
  "customfield_10518",  // Related Section(s)
  "customfield_10702",  // Outstanding Negatives
  "customfield_10704",  // Pre Applied
  "customfield_11810",  // Reconciled
];

interface JiraIssue {
  key: string;
  id: string;
  fields: Record<string, any>;
}

interface SearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

function parseCookies(cookieStr: string): string {
  return cookieStr.trim();
}

async function fetchBatch(
  startAt: number,
  cookies: string,
  maxResults = 100
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    jql: "project=FHIR ORDER BY key ASC",
    startAt: startAt.toString(),
    maxResults: maxResults.toString(),
    fields: FIELDS.join(","),
  });

  const response = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      Accept: "application/json",
      Cookie: cookies,
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

function arrayToStr(val: any): string {
  if (Array.isArray(val)) {
    return val.join(",");
  }
  return val || "";
}

function optionToStr(val: any): string {
  if (val && typeof val === "object") {
    return val.value || val.name || "";
  }
  return val || "";
}

function safeGet(obj: any, ...keys: string[]): string {
  let current = obj;
  for (const key of keys) {
    if (current == null) return "";
    current = current[key];
  }
  return current || "";
}

function createDatabase(dbPath: string): Database {
  const db = new Database(dbPath);
  
  db.exec("PRAGMA journal_mode = WAL");
  
  db.exec("DROP TABLE IF EXISTS issues_fts");
  db.exec("DROP TABLE IF EXISTS comments");
  db.exec("DROP TABLE IF EXISTS issues");

  db.exec(`
    CREATE TABLE issues (
      key TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      description TEXT,
      status TEXT,
      resolution TEXT,
      priority TEXT,
      issue_type TEXT,
      reporter_name TEXT,
      reporter_username TEXT,
      assignee_name TEXT,
      assignee_username TEXT,
      created_at TEXT,
      updated_at TEXT,
      resolved_at TEXT,
      specification TEXT,
      raised_in_version TEXT,
      related_artifact TEXT,
      work_group TEXT,
      applied_for_version TEXT,
      resolution_description TEXT,
      resolution_vote TEXT,
      change_category TEXT,
      change_impact TEXT,
      vote_date TEXT,
      related_url TEXT,
      related_pages TEXT,
      related_sections TEXT,
      labels TEXT,
      components TEXT,
      comment_count INTEGER DEFAULT 0
    )
  `);

  db.exec(`
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_key TEXT NOT NULL,
      author_name TEXT,
      author_username TEXT,
      body TEXT,
      created_at TEXT,
      FOREIGN KEY (issue_key) REFERENCES issues(key)
    )
  `);

  db.exec(`
    CREATE VIRTUAL TABLE issues_fts USING fts5(
      key,
      summary,
      description,
      specification,
      related_artifact,
      work_group,
      resolution_description,
      labels,
      content='issues',
      content_rowid='rowid'
    )
  `);

  return db;
}

function openDatabaseForResume(dbPath: string): Database {
  return new Database(dbPath);
}

function getResumePoint(db: Database): number {
  const result = db.query("SELECT COUNT(*) as cnt FROM issues").get() as any;
  return result?.cnt || 0;
}

function insertIssue(db: Database, issue: JiraIssue) {
  const f = issue.fields;

  const insert = db.prepare(`
    INSERT OR REPLACE INTO issues VALUES (
      $key, $summary, $description,
      $status, $resolution, $priority, $issue_type,
      $reporter_name, $reporter_username, $assignee_name, $assignee_username,
      $created_at, $updated_at, $resolved_at,
      $specification, $raised_in_version, $related_artifact, $work_group,
      $applied_for_version, $resolution_description, $resolution_vote,
      $change_category, $change_impact, $vote_date,
      $related_url, $related_pages, $related_sections,
      $labels, $components, $comment_count
    )
  `);

  const comments = f.comment?.comments || [];

  insert.run({
    $key: issue.key,
    $summary: f.summary || "",
    $description: f.description || "",
    $status: safeGet(f, "status", "name"),
    $resolution: safeGet(f, "resolution", "name"),
    $priority: safeGet(f, "priority", "name"),
    $issue_type: safeGet(f, "issuetype", "name"),
    $reporter_name: safeGet(f, "reporter", "displayName"),
    $reporter_username: safeGet(f, "reporter", "name"),
    $assignee_name: safeGet(f, "assignee", "displayName"),
    $assignee_username: safeGet(f, "assignee", "name"),
    $created_at: f.created || "",
    $updated_at: f.updated || "",
    $resolved_at: f.resolutiondate || "",
    $specification: arrayToStr(f.customfield_11302),
    $raised_in_version: arrayToStr(f.customfield_11808),
    $related_artifact: arrayToStr(f.customfield_11300),
    $work_group: arrayToStr(f.customfield_11400),
    $applied_for_version: arrayToStr(f.customfield_11807),
    $resolution_description: f.customfield_10618 || "",
    $resolution_vote: f.customfield_10510 || "",
    $change_category: optionToStr(f.customfield_10512),
    $change_impact: optionToStr(f.customfield_10511),
    $vote_date: f.customfield_10525 || "",
    $related_url: f.customfield_10612 || "",
    $related_pages: arrayToStr(f.customfield_11301),
    $related_sections: f.customfield_10518 || "",
    $labels: arrayToStr(f.labels),
    $components: arrayToStr(f.components?.map((c: any) => c.name)),
    $comment_count: comments.length,
  });

  // Delete existing comments for this issue (in case of resume/replace)
  db.prepare("DELETE FROM comments WHERE issue_key = $key").run({ $key: issue.key });

  if (comments.length > 0) {
    const insertComment = db.prepare(`
      INSERT INTO comments (issue_key, author_name, author_username, body, created_at)
      VALUES ($issue_key, $author_name, $author_username, $body, $created_at)
    `);

    for (const comment of comments) {
      insertComment.run({
        $issue_key: issue.key,
        $author_name: safeGet(comment, "author", "displayName"),
        $author_username: safeGet(comment, "author", "name"),
        $body: comment.body || "",
        $created_at: comment.created || "",
      });
    }
  }
}

function createIndexes(db: Database) {
  console.log("Creating indexes...");
  db.exec("CREATE INDEX IF NOT EXISTS idx_status ON issues(status)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_specification ON issues(specification)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_version ON issues(raised_in_version)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_artifact ON issues(related_artifact)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_work_group ON issues(work_group)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_created ON issues(created_at)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_change_impact ON issues(change_impact)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments(issue_key)");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      cookie: { type: "string" },
      "cookie-file": { type: "string" },
      output: { type: "string", default: new URL("./data.db", import.meta.url).pathname },
      resume: { type: "boolean", default: false },
    },
  });

  let cookies: string;
  
  if (values["cookie-file"]) {
    cookies = await Bun.file(values["cookie-file"]).text();
  } else if (values.cookie) {
    cookies = values.cookie;
  } else {
    console.error("Usage: bun run src/download.ts --cookie 'JSESSIONID=...'");
    console.error("   or: bun run src/download.ts --cookie-file cookies.txt");
    console.error("   Add --resume to continue an interrupted download");
    process.exit(1);
  }

  cookies = parseCookies(cookies);
  const dbPath = values.output as string;
  const resume = values.resume as boolean;

  console.log("Testing connection...");
  const testResponse = await fetchBatch(0, cookies, 1);
  const total = testResponse.total;
  console.log(`Total issues available: ${total}`);

  let db: Database;
  let startAt = 0;

  if (resume && existsSync(dbPath)) {
    console.log(`Resuming download from existing database: ${dbPath}`);
    db = openDatabaseForResume(dbPath);
    startAt = getResumePoint(db);
    console.log(`Already have ${startAt} issues, resuming from there...`);
  } else {
    console.log(`Creating fresh database: ${dbPath}`);
    db = createDatabase(dbPath);
  }

  const batchSize = 100;

  console.log("Downloading issues...");
  
  while (startAt < total) {
    try {
      const response = await fetchBatch(startAt, cookies, batchSize);
      
      db.exec("BEGIN");
      for (const issue of response.issues) {
        insertIssue(db, issue);
      }
      db.exec("COMMIT");

      startAt += response.issues.length;
      const pct = ((startAt / total) * 100).toFixed(1);
      process.stdout.write(`\r  ${startAt}/${total} (${pct}%)`);

      await Bun.sleep(150);
    } catch (error: any) {
      console.error(`\nError at ${startAt}:`, error.message);
      db.exec("ROLLBACK");
      
      if (error.message.includes("403") || error.message.includes("401")) {
        console.error("\n❌ Session expired! Save your progress and get fresh cookies.");
        console.error(`   Current progress: ${startAt}/${total} issues`);
        console.error(`   Resume with: bun run src/download.ts --cookie-file cookies.txt --resume`);
        break;
      }
      
      await Bun.sleep(2000);
    }
  }

  console.log("\n\nBuilding FTS index...");
  db.exec("INSERT INTO issues_fts(issues_fts) VALUES('rebuild')");

  createIndexes(db);

  // Print stats
  const issueCount = db.query("SELECT COUNT(*) as cnt FROM issues").get() as any;
  const commentCount = db.query("SELECT COUNT(*) as cnt FROM comments").get() as any;
  
  console.log("\n✅ Done!");
  console.log(`   Issues: ${issueCount.cnt}/${total}`);
  console.log(`   Comments: ${commentCount.cnt}`);
  console.log(`   Database: ${dbPath}`);
  
  if (issueCount.cnt < total) {
    console.log(`\n⚠️  Download incomplete! Missing ${total - issueCount.cnt} issues.`);
    console.log(`   Get fresh cookies and run with --resume to continue.`);
  }

  db.close();
}

main().catch(console.error);
