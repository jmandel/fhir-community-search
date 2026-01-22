/**
 * FHIR Jira Issue Search CLI
 * 
 * Search interface for exploring FHIR specification issues.
 * 
 * Usage:
 *   bun run jira/search.ts <command> [options]
 * 
 * Commands:
 *   fts <query>        Full-text search across all indexed fields
 *   ballot <key>       Find issues linked to a specific ballot (e.g., BALLOT-89190)
 *   resource <name>    Find issues for a specific FHIR resource
 *   version <ver>      Find issues for a specific FHIR version
 *   breaking           Find breaking (non-compatible) changes
 *   status <status>    Find issues by status
 *   get <key>          Get brief issue view
 *   snapshot <key>     Get complete issue snapshot (all fields, comments, metadata)
 *   stats              Show database statistics
 *   sql <query>        Execute raw SQL query
 */

import { Database } from "bun:sqlite";
import { parseArgs } from "util";

const DB_PATH = process.env.FHIR_JIRA_DB || new URL("./data.db", import.meta.url).pathname;

function getDb(): Database {
  return new Database(DB_PATH, { readonly: true });
}

/** Parse JSON from database row */
function parseIssue(row: any): any {
  if (!row) return null;
  if (typeof row.data === "string") {
    return JSON.parse(row.data);
  }
  return row.data || row;
}

function formatResults(rows: any[]): void {
  if (rows.length === 0) {
    console.log("No results found.");
    return;
  }

  for (const row of rows) {
    const issue = parseIssue(row);
    console.log(`\n${issue.key} [${issue.status}]`);
    console.log(`  ${(issue.summary || "").slice(0, 80)}${issue.summary?.length > 80 ? "..." : ""}`);
    
    const spec = Array.isArray(issue.specification) ? issue.specification.join(", ") : issue.specification;
    const artifacts = Array.isArray(issue.related_artifacts) ? issue.related_artifacts.join(", ") : issue.related_artifacts;
    const wg = Array.isArray(issue.work_group) ? issue.work_group.join(", ") : issue.work_group;
    const version = Array.isArray(issue.raised_in_version) ? issue.raised_in_version.join(", ") : issue.raised_in_version;
    const ballot = Array.isArray(issue.selected_ballot) ? issue.selected_ballot.join(", ") : issue.selected_ballot;
    
    if (spec) console.log(`  Spec: ${spec}`);
    if (artifacts) console.log(`  Resource: ${artifacts.slice(0, 60)}${artifacts.length > 60 ? "..." : ""}`);
    if (version) console.log(`  Version: ${version}`);
    if (wg) console.log(`  Work Group: ${wg}`);
    if (ballot) console.log(`  Ballot: ${ballot}`);
    if (issue.change_impact) console.log(`  Impact: ${issue.change_impact}`);
  }
  
  console.log(`\n--- ${rows.length} result(s) ---`);
}

interface SearchFilters {
  query?: string;
  ballot?: string;
  status?: string;
  version?: string;
  resource?: string;
  workGroup?: string;
  impact?: string;
}

function search(filters: SearchFilters, limit: number, json: boolean): void {
  const db = getDb();
  
  const conditions: string[] = [];
  const params: Record<string, any> = { $limit: limit };
  let useFts = false;
  
  // Full-text search
  if (filters.query) {
    useFts = true;
    params.$query = filters.query;
  }
  
  // Ballot filter
  if (filters.ballot) {
    const key = filters.ballot.toUpperCase().startsWith("BALLOT-") 
      ? filters.ballot.toUpperCase() 
      : `BALLOT-${filters.ballot}`;
    conditions.push(`json_extract(i.data, '$.selected_ballot') LIKE $ballot`);
    params.$ballot = `%${key}%`;
  }
  
  // Status filter
  if (filters.status) {
    conditions.push(`json_extract(i.data, '$.status') LIKE $status`);
    params.$status = `%${filters.status}%`;
  }
  
  // Version filter
  if (filters.version) {
    conditions.push(`json_extract(i.data, '$.raised_in_version') LIKE $version`);
    params.$version = `%${filters.version}%`;
  }
  
  // Resource/artifact filter
  if (filters.resource) {
    conditions.push(`json_extract(i.data, '$.related_artifacts') LIKE $resource`);
    params.$resource = `%${filters.resource}%`;
  }
  
  // Work group filter
  if (filters.workGroup) {
    conditions.push(`json_extract(i.data, '$.work_group') LIKE $wg`);
    params.$wg = `%${filters.workGroup}%`;
  }
  
  // Change impact filter
  if (filters.impact) {
    conditions.push(`json_extract(i.data, '$.change_impact') = $impact`);
    params.$impact = filters.impact;
  }
  
  let sql: string;
  if (useFts) {
    sql = `
      SELECT i.data
      FROM issues_fts fts
      JOIN issues i ON i.rowid = fts.rowid
      WHERE issues_fts MATCH $query
    `;
    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(" AND ")}`;
    }
    sql += ` ORDER BY fts.rank LIMIT $limit`;
  } else {
    sql = `SELECT data FROM issues i`;
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }
    sql += ` ORDER BY json_extract(i.data, '$.updated_at') DESC LIMIT $limit`;
  }
  
  const rows = db.query(sql).all(params);
  
  if (json) {
    console.log(JSON.stringify(rows.map(parseIssue), null, 2));
  } else {
    // Build description of search
    const parts: string[] = [];
    if (filters.query) parts.push(`text: "${filters.query}"`);
    if (filters.ballot) parts.push(`ballot: ${filters.ballot}`);
    if (filters.status) parts.push(`status: ${filters.status}`);
    if (filters.version) parts.push(`version: ${filters.version}`);
    if (filters.resource) parts.push(`resource: ${filters.resource}`);
    if (filters.workGroup) parts.push(`workgroup: ${filters.workGroup}`);
    if (filters.impact) parts.push(`impact: ${filters.impact}`);
    console.log(`Search: ${parts.join(", ")}`);
    formatResults(rows);
  }
  
  db.close();
}

function fts(query: string, limit: number, json: boolean): void {
  search({ query }, limit, json);
}

function searchBallot(ballotKey: string, filters: Partial<SearchFilters>, limit: number, json: boolean): void {
  search({ ...filters, ballot: ballotKey }, limit, json);
}

function searchResource(resource: string, filters: Partial<SearchFilters>, limit: number, json: boolean): void {
  search({ ...filters, resource }, limit, json);
}

function searchVersion(version: string, filters: Partial<SearchFilters>, limit: number, json: boolean): void {
  search({ ...filters, version }, limit, json);
}

function searchBreaking(version: string | undefined, limit: number, json: boolean): void {
  search({ impact: "Non-compatible", version }, limit, json);
}

function searchStatus(status: string, filters: Partial<SearchFilters>, limit: number, json: boolean): void {
  search({ ...filters, status }, limit, json);
}

/** Render issue as markdown */
function renderMarkdown(issue: any): string {
  const lines: string[] = [];
  
  lines.push(`# ${issue.key}: ${issue.summary}\n`);
  lines.push(`**URL:** ${issue.url}\n`);
  
  // Metadata table
  lines.push(`## Metadata\n`);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Status** | ${issue.status || "Unknown"} |`);
  lines.push(`| **Resolution** | ${issue.resolution || "Unresolved"} |`);
  lines.push(`| **Priority** | ${issue.priority || "N/A"} |`);
  lines.push(`| **Type** | ${issue.issue_type || "N/A"} |`);
  
  // Reporter/Assignee
  const reporter = issue.reporter?.name || issue.reporter || "Unknown";
  const reporterUser = issue.reporter?.username ? ` (${issue.reporter.username})` : "";
  lines.push(`| **Reporter** | ${reporter}${reporterUser} |`);
  
  const assignee = issue.assignee?.name || issue.assignee || "Unassigned";
  lines.push(`| **Assignee** | ${assignee} |`);
  
  // Spec info
  const spec = Array.isArray(issue.specification) ? issue.specification.join(", ") : issue.specification;
  const artifacts = Array.isArray(issue.related_artifacts) ? issue.related_artifacts.join(", ") : issue.related_artifacts;
  const version = Array.isArray(issue.raised_in_version) ? issue.raised_in_version.join(", ") : issue.raised_in_version;
  const wg = Array.isArray(issue.work_group) ? issue.work_group.join(", ") : issue.work_group;
  const ballot = Array.isArray(issue.selected_ballot) ? issue.selected_ballot.join(", ") : issue.selected_ballot;
  
  lines.push(`| **Specification** | ${spec || "N/A"} |`);
  if (artifacts) lines.push(`| **Related Artifacts** | ${artifacts} |`);
  lines.push(`| **Raised in Version** | ${version || "N/A"} |`);
  if (wg) lines.push(`| **Work Group** | ${wg} |`);
  if (ballot) lines.push(`| **Ballot** | ${ballot} |`);
  
  // Dates
  lines.push(`| **Created** | ${issue.created_at || "N/A"} |`);
  lines.push(`| **Updated** | ${issue.updated_at || "N/A"} |`);
  if (issue.resolved_at) lines.push(`| **Resolved** | ${issue.resolved_at} |`);
  
  // Resolution details
  if (issue.change_impact) lines.push(`| **Change Impact** | ${issue.change_impact} |`);
  if (issue.change_category) lines.push(`| **Change Category** | ${issue.change_category} |`);
  
  const appliedFor = Array.isArray(issue.applied_for_version) ? issue.applied_for_version.join(", ") : issue.applied_for_version;
  if (appliedFor) lines.push(`| **Applied for Version** | ${appliedFor} |`);
  
  if (issue.resolution_vote) lines.push(`| **Vote** | ${issue.resolution_vote} |`);
  if (issue.vote_date) lines.push(`| **Vote Date** | ${issue.vote_date} |`);
  
  // References
  if (issue.related_url) lines.push(`| **Related URL** | ${issue.related_url} |`);
  const pages = Array.isArray(issue.related_pages) ? issue.related_pages.join(", ") : issue.related_pages;
  if (pages) lines.push(`| **Related Pages** | ${pages} |`);
  if (issue.related_sections) lines.push(`| **Related Sections** | ${issue.related_sections} |`);
  
  // Grouping (block votes etc)
  const grouping = Array.isArray(issue.grouping) ? issue.grouping.join(", ") : issue.grouping;
  if (grouping) lines.push(`| **Grouping** | ${grouping} |`);
  
  // Labels/Components
  if (issue.labels?.length) lines.push(`| **Labels** | ${issue.labels.join(", ")} |`);
  if (issue.components?.length) lines.push(`| **Components** | ${issue.components.join(", ")} |`);
  
  // Comment count
  const commentCount = issue.comments?.length || 0;
  lines.push(`| **Comment Count** | ${commentCount} |`);
  
  // Issue Links
  if (issue.issue_links?.length > 0) {
    lines.push(`\n## Issue Links\n`);
    for (const link of issue.issue_links) {
      const status = link.target_status ? ` [${link.target_status}]` : "";
      lines.push(`- **${link.relation}** → [${link.target_key}](https://jira.hl7.org/browse/${link.target_key})${status}`);
      if (link.target_summary) {
        lines.push(`  - ${link.target_summary}`);
      }
    }
  }
  
  // Related Issues (custom field)
  if (issue.related_issues?.length > 0) {
    lines.push(`\n## Related Issues\n`);
    for (const rel of issue.related_issues) {
      const status = rel.status ? ` [${rel.status}]` : "";
      lines.push(`- [${rel.key}](https://jira.hl7.org/browse/${rel.key})${status}: ${rel.summary || ""}`);  
    }
  }
  
  // Duplicate
  if (issue.duplicate_of) {
    lines.push(`\n## Duplicate Of\n`);
    const dup = issue.duplicate_of;
    lines.push(`[${dup.key}](https://jira.hl7.org/browse/${dup.key}): ${dup.summary || ""}`);
  }
  
  // Description
  lines.push(`\n## Description\n`);
  lines.push(issue.description || "*No description provided*");
  
  // Resolution Description
  if (issue.resolution_description) {
    lines.push(`\n## Resolution\n`);
    lines.push(issue.resolution_description);
  }
  
  // Attachments
  if (issue.attachments?.length > 0) {
    lines.push(`\n## Attachments (${issue.attachments.length})\n`);
    for (const att of issue.attachments) {
      lines.push(`- [${att.filename}](${att.url}) (${att.size} bytes)`);
    }
  }
  
  // Comments
  if (issue.comments?.length > 0) {
    lines.push(`\n## Comments (${issue.comments.length})\n`);
    for (const c of issue.comments) {
      const author = c.author?.name || c.author || "Unknown";
      lines.push(`### [${c.created_at}] ${author}\n`);
      lines.push(c.body || "*empty*");
      lines.push("");
    }
  }
  
  return lines.join("\n");
}

function getIssue(key: string, json: boolean, snapshot: boolean): void {
  const db = getDb();
  
  const row = db.query(`SELECT data FROM issues WHERE key = $key`).get({ $key: key }) as any;
  
  if (!row) {
    console.error(`Issue ${key} not found`);
    db.close();
    return;
  }
  
  const issue = parseIssue(row);
  
  if (json) {
    console.log(JSON.stringify(issue, null, 2));
  } else if (snapshot) {
    console.log(renderMarkdown(issue));
  } else {
    // Brief view
    console.log(`\n${"=".repeat(70)}`);
    console.log(`${issue.key}: ${issue.summary}`);
    console.log(`${"=".repeat(70)}`);
    console.log(`URL: ${issue.url}`);
    console.log(`Status: ${issue.status}`);
    console.log(`Resolution: ${issue.resolution || "Unresolved"}`);
    console.log(`Type: ${issue.issue_type}`);
    
    const spec = Array.isArray(issue.specification) ? issue.specification.join(", ") : issue.specification;
    const ballot = Array.isArray(issue.selected_ballot) ? issue.selected_ballot.join(", ") : issue.selected_ballot;
    console.log(`Specification: ${spec || "N/A"}`);
    if (ballot) console.log(`Ballot: ${ballot}`);
    
    console.log(`\n--- Description (truncated) ---`);
    console.log((issue.description || "No description").slice(0, 500));
    if (issue.description?.length > 500) console.log("...");
    
    if (issue.comments?.length > 0) {
      console.log(`\n--- ${issue.comments.length} comment(s) - use 'snapshot' for full content ---`);
    }
  }
  
  db.close();
}

function showStats(): void {
  const db = getDb();
  
  const total = db.query("SELECT COUNT(*) as cnt FROM issues").get() as any;
  
  console.log(`\nDatabase Statistics`);
  console.log(`${"-".repeat(40)}`);
  console.log(`Total issues: ${total.cnt}`);
  
  // Status breakdown
  console.log(`\nBy Status:`);
  const statuses = db.query(`
    SELECT json_extract(data, '$.status') as status, COUNT(*) as cnt
    FROM issues GROUP BY status ORDER BY cnt DESC LIMIT 10
  `).all() as any[];
  for (const s of statuses) {
    console.log(`  ${s.status}: ${s.cnt}`);
  }
  
  // Ballot issues
  const ballotCount = db.query(`
    SELECT COUNT(*) as cnt FROM issues 
    WHERE json_extract(data, '$.selected_ballot') IS NOT NULL
  `).get() as any;
  console.log(`\nBallot-linked issues: ${ballotCount.cnt}`);
  
  // Top ballots
  console.log(`\nTop Ballots:`);
  const ballots = db.query(`
    SELECT json_extract(data, '$.selected_ballot') as ballot, COUNT(*) as cnt
    FROM issues 
    WHERE ballot IS NOT NULL
    GROUP BY ballot ORDER BY cnt DESC LIMIT 10
  `).all() as any[];
  for (const b of ballots) {
    console.log(`  ${b.ballot}: ${b.cnt}`);
  }
  
  // Change impact
  console.log(`\nBy Change Impact:`);
  const impacts = db.query(`
    SELECT json_extract(data, '$.change_impact') as impact, COUNT(*) as cnt
    FROM issues WHERE impact IS NOT NULL GROUP BY impact ORDER BY cnt DESC
  `).all() as any[];
  for (const i of impacts) {
    console.log(`  ${i.impact}: ${i.cnt}`);
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
      console.log(rows);
    }
  } catch (error: any) {
    console.error(`SQL Error: ${error.message}`);
  }
  
  db.close();
}

function printHelp(): void {
  console.log(`
FHIR Jira Search CLI

Usage: bun run jira/search.ts <command> [args] [options]

Commands:
  fts <query>         Full-text search (supports FTS5 syntax: AND, OR, "phrases")
  ballot <key>        Find issues linked to a ballot (e.g., BALLOT-89190 or just 89190)
  resource <name>     Find issues for a FHIR resource (e.g., Patient, Observation)
  version <ver>       Find issues for a FHIR version (e.g., R4, R5, R6)
  breaking [version]  Find breaking (non-compatible) changes
  status <status>     Find issues by status (e.g., Triaged, Published)
  get <key>           Brief issue view
  snapshot <key>      Complete issue snapshot - all fields, comments, links.
                      Use after FTS to get full context for analysis.
  stats               Database statistics
  sql <query>         Execute raw SQL (data column contains JSON)

Filter Options (can combine with any command):
  --ballot <key>      Filter by ballot (e.g., --ballot 89190)
  --status <status>   Filter by status (e.g., --status Triaged)
  --version <ver>     Filter by version (e.g., --version R6)
  --resource <name>   Filter by resource (e.g., --resource Patient)
  --workgroup <wg>    Filter by work group (e.g., --workgroup fhir-i)
  --impact <impact>   Filter by change impact (Non-compatible, Compatible, Non-substantive)

General Options:
  --limit <n>         Max results (default: 20)
  --json              Output as JSON
  --help              Show this help

Combined Filter Examples:
  # Ballot comments about Patient resource
  bun run jira/search.ts fts "Patient" --ballot 89190
  
  # Breaking changes in R6 ballot
  bun run jira/search.ts ballot 89190 --impact Non-compatible
  
  # Triaged issues for Patient in R6
  bun run jira/search.ts resource Patient --version R6 --status Triaged
  
  # FTS within a specific work group
  bun run jira/search.ts fts "security" --workgroup fhir-i

Recommended Workflow:
  1. Search:   bun run jira:search fts "your topic"
  2. Snapshot: bun run jira:search snapshot FHIR-XXXXX
  3. Follow links and related issues mentioned in the snapshot

Basic Examples:
  bun run jira/search.ts fts "Patient identifier"
  bun run jira/search.ts ballot 89190
  bun run jira/search.ts resource Patient --limit 50
  bun run jira/search.ts snapshot FHIR-43499
  bun run jira/search.ts sql "SELECT key, json_extract(data, '$.summary') FROM issues LIMIT 5"
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
      ballot: { type: "string" },
      status: { type: "string" },
      version: { type: "string" },
      resource: { type: "string" },
      workgroup: { type: "string" },
      impact: { type: "string" },
    },
    allowPositionals: true,
  });

  const limit = parseInt(values.limit as string, 10);
  const json = values.json as boolean;
  const command = positionals[0];
  const arg = positionals.slice(1).join(" ");
  
  // Build filters from options
  const filters: Partial<SearchFilters> = {};
  if (values.ballot) filters.ballot = values.ballot as string;
  if (values.status) filters.status = values.status as string;
  if (values.version) filters.version = values.version as string;
  if (values.resource) filters.resource = values.resource as string;
  if (values.workgroup) filters.workGroup = values.workgroup as string;
  if (values.impact) filters.impact = values.impact as string;

  switch (command) {
    case "fts":
      if (!arg) { console.error("Usage: fts <query>"); return; }
      search({ ...filters, query: arg }, limit, json);
      break;
      
    case "ballot":
      if (!arg) { console.error("Usage: ballot <key>"); return; }
      searchBallot(arg, filters, limit, json);
      break;
      
    case "resource":
      if (!arg) { console.error("Usage: resource <name>"); return; }
      searchResource(arg, filters, limit, json);
      break;
      
    case "version":
      if (!arg) { console.error("Usage: version <ver>"); return; }
      searchVersion(arg, filters, limit, json);
      break;
      
    case "breaking":
      searchBreaking(arg || values.version as string, limit, json);
      break;
      
    case "status":
      if (!arg) { console.error("Usage: status <status>"); return; }
      searchStatus(arg, filters, limit, json);
      break;
      
    case "get":
      if (!arg) { console.error("Usage: get <key>"); return; }
      getIssue(arg.toUpperCase(), json, false);
      break;
      
    case "snapshot":
      if (!arg) { console.error("Usage: snapshot <key>"); return; }
      getIssue(arg.toUpperCase(), json, true);
      break;
      
    case "stats":
      showStats();
      break;
      
    case "sql":
      if (!arg) { console.error("Usage: sql <query>"); return; }
      execSql(arg, json);
      break;
      
    default:
      // Treat as FTS query
      search({ ...filters, query: positionals.join(" ") }, limit, json);
  }
}

main().catch(console.error);
