/**
 * FHIR Jira Issue Downloader
 * 
 * Downloads all FHIR specification issues from jira.hl7.org and stores them
 * as JSON documents in SQLite with full-text search indexes.
 * 
 * Usage:
 *   bun run jira/download.ts --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"
 *   bun run jira/download.ts --cookie-file cookies.txt
 *   bun run jira/download.ts --cookie-file cookies.txt --resume
 */

import { Database } from "bun:sqlite";
import { parseArgs } from "util";
import { existsSync } from "fs";

const BASE_URL = "https://jira.hl7.org/rest/api/2/search";

// Fetch all fields plus issuelinks (not included in *all for some reason)
const FIELDS = "*all,issuelinks";

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
  names?: Record<string, string>;
}

// Map Jira custom field IDs to semantic names
const FIELD_MAP: Record<string, string> = {
  // Ballot & Voting
  "customfield_10902": "selected_ballot",
  "customfield_11402": "grouping",
  "customfield_10510": "resolution_vote",
  "customfield_10525": "vote_date",
  
  // Spec Categorization
  "customfield_11302": "specification",
  "customfield_11808": "raised_in_version",
  "customfield_11807": "applied_for_version",
  "customfield_11400": "work_group",
  "customfield_11300": "related_artifacts",
  
  // Resolution Details
  "customfield_10618": "resolution_description",
  "customfield_10512": "change_category",
  "customfield_10511": "change_impact",
  "customfield_10702": "outstanding_negatives",
  "customfield_10704": "pre_applied",
  
  // Links & References
  "customfield_10612": "related_url",
  "customfield_11301": "related_pages",
  "customfield_10518": "related_sections",
  "customfield_14905": "related_issues",
  "customfield_14909": "duplicate_of",
  
  // Participation
  "customfield_11000": "in_person_requested_by",
};

// Fields to skip (system/UI/junk)
const SKIP_FIELDS = new Set([
  "customfield_11200",  // Development - internal Jira stuff
  "customfield_14904",  // Block Vote - HTML link, redundant
  "customfield_14600",  // emaildomainsearcher
  "customfield_10000",  // Rank
  "customfield_10500",  // issueFunction
  "customfield_10001",  // Sprint
  "customfield_10002",  // Epic Link
  "customfield_14000",  // Flagged
  "customfield_14400",  // Team
  "customfield_14401",  // Parent Link
  "customfield_14402",  // Target start
  "customfield_14403",  // Target end
  "customfield_14404",  // Original story points
  "customfield_11401",  // Scheduling
  "customfield_11101",  // Message - Vote Negative
  "customfield_11102",  // Message - Vote Affirmative
  "customfield_11103",  // Message - Issue Guidance Comment
  "customfield_11105",  // Message - Issue Guidance Technical Correction
  "customfield_11106",  // Message - Issue Guidance Change Request
  "customfield_11600",  // Message - Vote Remove
  "customfield_11601",  // Message - Vote Withdraw
  "customfield_11602",  // Message - Vote Retract
  "customfield_11800",  // Message - Transition Reopen
  "customfield_11801",  // Message - Transition Non-duplicate
  "customfield_11803",  // Message - Transition Duplicate
  "customfield_14906",  // Message - Manage related issues
  "customfield_14907",  // Duplicate Voted Issue
  "customfield_14908",  // Message - Transition Voted Duplicate
  "workratio",
  "watches",
  "lastViewed",
  "archiveddate",
  "archivedby",
  "project",  // Always FHIR
]);

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
    fields: FIELDS,
    expand: "names",
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

/** Extract simple value from Jira field objects */
function extractValue(val: any): any {
  if (val === null || val === undefined) return null;
  
  // Arrays - recursively extract
  if (Array.isArray(val)) {
    const extracted = val.map(v => extractValue(v)).filter(v => v !== null);
    return extracted.length > 0 ? extracted : null;
  }
  
  // Objects with common Jira patterns
  if (typeof val === "object") {
    // Issue reference (for related_issues, duplicate_of)
    if (val.key && val.fields) {
      return {
        key: val.key,
        summary: val.fields.summary,
        status: val.fields.status?.name,
        type: val.fields.issuetype?.name,
      };
    }
    // User object
    if (val.displayName && val.name) {
      return { name: val.displayName, username: val.name };
    }
    // Option object (for dropdowns)
    if (val.value !== undefined) return val.value;
    if (val.name !== undefined) return val.name;
    // Status/resolution objects
    if (val.name) return val.name;
    // Keep other objects as-is
    return val;
  }
  
  return val;
}

/** Transform raw Jira issue to clean JSON document */
function transformIssue(raw: JiraIssue): Record<string, any> {
  const f = raw.fields;
  const doc: Record<string, any> = {
    key: raw.key,
    url: `https://jira.hl7.org/browse/${raw.key}`,
  };
  
  // Standard fields with explicit mapping
  doc.summary = f.summary || null;
  doc.description = f.description || null;
  doc.status = extractValue(f.status);
  doc.resolution = extractValue(f.resolution);
  doc.priority = extractValue(f.priority);
  doc.issue_type = extractValue(f.issuetype);
  doc.created_at = f.created || null;
  doc.updated_at = f.updated || null;
  doc.resolved_at = f.resolutiondate || null;
  
  // People
  doc.reporter = extractValue(f.reporter);
  doc.assignee = extractValue(f.assignee);
  doc.creator = extractValue(f.creator);
  
  // Labels and components
  doc.labels = f.labels?.length > 0 ? f.labels : null;
  doc.components = f.components?.map((c: any) => c.name).filter(Boolean);
  if (doc.components?.length === 0) doc.components = null;
  
  // Attachments
  if (f.attachment?.length > 0) {
    doc.attachments = f.attachment.map((a: any) => ({
      filename: a.filename,
      size: a.size,
      url: a.content,
      created: a.created,
    }));
  }
  
  // Comments
  const comments = f.comment?.comments || [];
  if (comments.length > 0) {
    doc.comments = comments.map((c: any) => ({
      author: extractValue(c.author),
      body: c.body,
      created_at: c.created,
    }));
  }
  
  // Subtasks
  if (f.subtasks?.length > 0) {
    doc.subtasks = f.subtasks.map((s: any) => ({
      key: s.key,
      summary: s.fields?.summary,
      status: s.fields?.status?.name,
    }));
  }
  
  // Issue links (standard Jira field)
  if (f.issuelinks?.length > 0) {
    doc.issue_links = f.issuelinks.map((link: any) => {
      const target = link.outwardIssue || link.inwardIssue;
      const direction = link.outwardIssue ? "outward" : "inward";
      const relation = direction === "outward" ? link.type?.outward : link.type?.inward;
      return {
        relation,
        direction,
        target_key: target?.key,
        target_summary: target?.fields?.summary,
        target_status: target?.fields?.status?.name,
      };
    }).filter((l: any) => l.target_key);
    if (doc.issue_links.length === 0) doc.issue_links = undefined;
  }
  
  // Custom fields - map to semantic names
  for (const [jiraField, semanticName] of Object.entries(FIELD_MAP)) {
    const val = extractValue(f[jiraField]);
    if (val !== null && val !== undefined) {
      doc[semanticName] = val;
    }
  }
  
  return doc;
}

function createDatabase(dbPath: string): Database {
  const db = new Database(dbPath);
  
  db.exec("PRAGMA journal_mode = WAL");
  
  db.exec("DROP TABLE IF EXISTS issues_fts");
  db.exec("DROP TABLE IF EXISTS issues");

  // Simple schema: key + JSON document
  db.exec(`
    CREATE TABLE issues (
      key TEXT PRIMARY KEY,
      data JSON NOT NULL
    )
  `);

  // FTS5 index on searchable text fields
  // We'll populate this from the JSON
  db.exec(`
    CREATE VIRTUAL TABLE issues_fts USING fts5(
      key,
      summary,
      description,
      specification,
      work_group,
      related_artifacts,
      resolution_description,
      labels,
      comments_text,
      content='',
      contentless_delete=1
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
  const doc = transformIssue(issue);
  const json = JSON.stringify(doc);
  
  // Insert/replace main document
  db.prepare(`INSERT OR REPLACE INTO issues (key, data) VALUES (?, ?)`)
    .run(doc.key, json);
  
  // Build FTS content
  const commentsText = doc.comments?.map((c: any) => c.body).join("\n") || "";
  const labelsText = Array.isArray(doc.labels) ? doc.labels.join(" ") : (doc.labels || "");
  const artifactsText = Array.isArray(doc.related_artifacts) ? doc.related_artifacts.join(" ") : (doc.related_artifacts || "");
  const specText = Array.isArray(doc.specification) ? doc.specification.join(" ") : (doc.specification || "");
  const wgText = Array.isArray(doc.work_group) ? doc.work_group.join(" ") : (doc.work_group || "");
  
  // Delete old FTS entry if exists, then insert new
  db.prepare(`DELETE FROM issues_fts WHERE key = ?`).run(doc.key);
  db.prepare(`
    INSERT INTO issues_fts (key, summary, description, specification, work_group, 
                            related_artifacts, resolution_description, labels, comments_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc.key,
    doc.summary || "",
    doc.description || "",
    specText,
    wgText,
    artifactsText,
    doc.resolution_description || "",
    labelsText,
    commentsText
  );
}

function createIndexes(db: Database) {
  console.log("Creating indexes...");
  // JSON indexes for common queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_status ON issues(json_extract(data, '$.status'))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_resolution ON issues(json_extract(data, '$.resolution'))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_created ON issues(json_extract(data, '$.created_at'))`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_updated ON issues(json_extract(data, '$.updated_at'))`);
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
    console.error("Usage: bun run jira/download.ts --cookie 'JSESSIONID=...'");
    console.error("   or: bun run jira/download.ts --cookie-file cookies.txt");
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
        console.error(`   Resume with: bun run jira/download.ts --cookie-file cookies.txt --resume`);
        break;
      }
      
      await Bun.sleep(2000);
    }
  }

  createIndexes(db);

  // Print stats
  const issueCount = db.query("SELECT COUNT(*) as cnt FROM issues").get() as any;
  
  console.log("\n\n✅ Done!");
  console.log(`   Issues: ${issueCount.cnt}/${total}`);
  console.log(`   Database: ${dbPath}`);
  
  if (issueCount.cnt < total) {
    console.log(`\n⚠️  Download incomplete! Missing ${total - issueCount.cnt} issues.`);
    console.log(`   Get fresh cookies and run with --resume to continue.`);
  }

  db.close();
}

main().catch(console.error);
