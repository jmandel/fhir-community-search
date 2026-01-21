/**
 * FHIR Jira Issue Search CLI
 * 
 * Powerful search interface for LLM agents to iteratively search and refine results.
 * 
 * Usage:
 *   bun run src/search.ts <command> [options]
 * 
 * Commands:
 *   fts <query>        Full-text search across all indexed fields
 *   resource <name>    Find issues for a specific FHIR resource
 *   version <ver>      Find issues for a specific FHIR version
 *   breaking           Find breaking (non-compatible) changes
 *   status <status>    Find issues by status
 *   get <key>          Get full details for a specific issue
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

function formatResults(rows: any[], verbose = false): void {
  if (rows.length === 0) {
    console.log("No results found.");
    return;
  }

  for (const row of rows) {
    console.log(`\n${row.key} [${row.status}]`);
    console.log(`  ${(row.summary || "").slice(0, 75)}${row.summary?.length > 75 ? "..." : ""}`);
    
    if (row.specification) console.log(`  Spec: ${row.specification}`);
    if (row.related_artifact) console.log(`  Resource: ${row.related_artifact}`);
    if (row.raised_in_version) console.log(`  Version: ${row.raised_in_version}`);
    if (row.work_group) console.log(`  Work Group: ${row.work_group}`);
    if (row.change_impact) console.log(`  Impact: ${row.change_impact}`);
    
    if (verbose && row.description) {
      const desc = row.description.replace(/\n/g, " ").slice(0, 150);
      console.log(`  ${desc}...`);
    }
  }
  
  console.log(`\n--- ${rows.length} result(s) ---`);
}

function fts(query: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT i.key, i.summary, i.status, i.specification, 
           i.related_artifact, i.raised_in_version, i.work_group,
           i.change_impact, substr(i.description, 1, 300) as description
    FROM issues_fts fts
    JOIN issues i ON i.rowid = fts.rowid
    WHERE issues_fts MATCH $query
    ORDER BY rank
    LIMIT $limit
  `).all({ $query: query, $limit: limit });

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Full-text search: "${query}"`);
    formatResults(rows, true);
  }
  
  db.close();
}

function searchResource(resource: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT key, summary, status, specification, related_artifact,
           raised_in_version, work_group, change_impact
    FROM issues
    WHERE related_artifact LIKE $pattern
    ORDER BY created_at DESC
    LIMIT $limit
  `).all({ $pattern: `%${resource}%`, $limit: limit });

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Issues for resource: "${resource}"`);
    formatResults(rows);
  }
  
  db.close();
}

function searchVersion(version: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT key, summary, status, specification, related_artifact,
           raised_in_version, change_category, change_impact
    FROM issues
    WHERE raised_in_version LIKE $pattern
    ORDER BY created_at DESC
    LIMIT $limit
  `).all({ $pattern: `%${version}%`, $limit: limit });

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Issues for version: "${version}"`);
    formatResults(rows);
  }
  
  db.close();
}

function searchBreaking(version: string | undefined, limit: number, json: boolean): void {
  const db = getDb();
  
  let rows;
  if (version) {
    rows = db.query(`
      SELECT key, summary, status, specification, related_artifact,
             raised_in_version, applied_for_version, 
             substr(resolution_description, 1, 200) as resolution_description
      FROM issues
      WHERE change_impact = 'Non-compatible'
        AND raised_in_version LIKE $pattern
      ORDER BY resolved_at DESC
      LIMIT $limit
    `).all({ $pattern: `%${version}%`, $limit: limit });
  } else {
    rows = db.query(`
      SELECT key, summary, status, specification, related_artifact,
             raised_in_version, applied_for_version,
             substr(resolution_description, 1, 200) as resolution_description
      FROM issues
      WHERE change_impact = 'Non-compatible'
      ORDER BY resolved_at DESC
      LIMIT $limit
    `).all({ $limit: limit });
  }

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Breaking changes${version ? ` for ${version}` : ""}:`);
    formatResults(rows, true);
  }
  
  db.close();
}

function searchStatus(status: string, limit: number, json: boolean): void {
  const db = getDb();
  
  const rows = db.query(`
    SELECT key, summary, status, specification, related_artifact,
           raised_in_version, work_group
    FROM issues
    WHERE status LIKE $pattern
    ORDER BY updated_at DESC
    LIMIT $limit
  `).all({ $pattern: `%${status}%`, $limit: limit });

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`Issues with status: "${status}"`);
    formatResults(rows);
  }
  
  db.close();
}

function getIssue(key: string, json: boolean, fullSnapshot = false): void {
  const db = getDb();
  
  const issue = db.query("SELECT * FROM issues WHERE key = $key").get({ $key: key }) as any;
  
  if (!issue) {
    console.log(`Issue ${key} not found`);
    db.close();
    return;
  }

  const comments = db.query(`
    SELECT author_name, author_username, body, created_at 
    FROM comments 
    WHERE issue_key = $key 
    ORDER BY created_at
  `).all({ $key: key });

  if (json) {
    console.log(JSON.stringify({ ...issue, comments }, null, 2));
  } else {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`${issue.key}: ${issue.summary}`);
    console.log(`${"=".repeat(70)}`);
    console.log(`URL: https://jira.hl7.org/browse/${issue.key}`);
    console.log(`Status: ${issue.status}`);
    console.log(`Resolution: ${issue.resolution || "Unresolved"}`);
    console.log(`Priority: ${issue.priority}`);
    console.log(`Type: ${issue.issue_type}`);
    console.log(`Reporter: ${issue.reporter_name}`);
    console.log(`Assignee: ${issue.assignee_name || "Unassigned"}`);
    console.log(`\nSpecification: ${issue.specification}`);
    console.log(`Resource: ${issue.related_artifact || "N/A"}`);
    console.log(`Version: ${issue.raised_in_version}`);
    console.log(`Work Group: ${issue.work_group || "N/A"}`);
    console.log(`\nCreated: ${issue.created_at}`);
    console.log(`Updated: ${issue.updated_at}`);
    if (issue.resolved_at) console.log(`Resolved: ${issue.resolved_at}`);
    
    if (issue.change_impact || issue.change_category) {
      console.log(`\nChange Impact: ${issue.change_impact || "N/A"}`);
      console.log(`Change Category: ${issue.change_category || "N/A"}`);
    }
    
    if (issue.resolution_vote) {
      console.log(`Vote: ${issue.resolution_vote}`);
    }
    
    if (issue.applied_for_version) {
      console.log(`Applied for version: ${issue.applied_for_version}`);
    }
    
    if (issue.vote_date) {
      console.log(`Vote date: ${issue.vote_date}`);
    }
    
    if (issue.related_url) {
      console.log(`\nRelated URL: ${issue.related_url}`);
    }
    if (issue.related_pages) {
      console.log(`Related pages: ${issue.related_pages}`);
    }
    if (issue.related_sections) {
      console.log(`Related sections: ${issue.related_sections}`);
    }
    
    if (issue.labels) {
      console.log(`\nLabels: ${issue.labels}`);
    }
    if (issue.components) {
      console.log(`Components: ${issue.components}`);
    }
    
    console.log(`\n--- Description ---`);
    console.log(issue.description || "No description");
    
    if (issue.resolution_description) {
      console.log(`\n--- Resolution ---`);
      console.log(issue.resolution_description);
    }
    
    if (comments.length > 0) {
      console.log(`\n--- Comments (${comments.length}) ---`);
      for (const c of comments as any[]) {
        console.log(`\n[${c.created_at}] ${c.author_name}:`);
        // For snapshot mode, show full comments; otherwise truncate
        if (fullSnapshot) {
          console.log(c.body || "");
        } else {
          console.log(c.body?.slice(0, 500) || "");
          if (c.body?.length > 500) console.log("...");
        }
      }
    }
  }
  
  db.close();
}

function showStats(): void {
  const db = getDb();
  
  console.log("FHIR Jira Issue Database Statistics");
  console.log("=".repeat(60));
  
  const issueCount = db.query("SELECT COUNT(*) as cnt FROM issues").get() as any;
  const commentCount = db.query("SELECT COUNT(*) as cnt FROM comments").get() as any;
  console.log(`\nTotal issues: ${issueCount.cnt}`);
  console.log(`Total comments: ${commentCount.cnt}`);
  
  console.log("\n--- Status Distribution ---");
  const statuses = db.query(`
    SELECT status, COUNT(*) as cnt 
    FROM issues GROUP BY status ORDER BY cnt DESC
  `).all() as any[];
  for (const row of statuses) {
    console.log(`  ${row.status.padEnd(30)} ${row.cnt.toString().padStart(6)}`);
  }
  
  console.log("\n--- Top Specifications ---");
  const specs = db.query(`
    SELECT specification, COUNT(*) as cnt 
    FROM issues WHERE specification != '' 
    GROUP BY specification ORDER BY cnt DESC LIMIT 15
  `).all() as any[];
  for (const row of specs) {
    console.log(`  ${row.specification.padEnd(40)} ${row.cnt.toString().padStart(6)}`);
  }
  
  console.log("\n--- Top Resources ---");
  const artifacts = db.query(`
    SELECT related_artifact, COUNT(*) as cnt 
    FROM issues WHERE related_artifact != '' 
    GROUP BY related_artifact ORDER BY cnt DESC LIMIT 15
  `).all() as any[];
  for (const row of artifacts) {
    console.log(`  ${row.related_artifact.padEnd(40)} ${row.cnt.toString().padStart(6)}`);
  }
  
  console.log("\n--- Version Distribution ---");
  const versions = db.query(`
    SELECT raised_in_version, COUNT(*) as cnt 
    FROM issues WHERE raised_in_version != '' 
    GROUP BY raised_in_version ORDER BY cnt DESC LIMIT 10
  `).all() as any[];
  for (const row of versions) {
    console.log(`  ${row.raised_in_version.padEnd(20)} ${row.cnt.toString().padStart(6)}`);
  }
  
  console.log("\n--- Work Groups ---");
  const wgs = db.query(`
    SELECT work_group, COUNT(*) as cnt 
    FROM issues WHERE work_group != '' 
    GROUP BY work_group ORDER BY cnt DESC LIMIT 10
  `).all() as any[];
  for (const row of wgs) {
    console.log(`  ${row.work_group.padEnd(40)} ${row.cnt.toString().padStart(6)}`);
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
      
      // Print as table
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
FHIR Jira Issue Search

Usage: bun run src/search.ts <command> [options]

Commands:
  fts <query>         Full-text search across all indexed fields
  resource <name>     Find issues for a specific FHIR resource
  version <ver>       Find issues for a specific FHIR version  
  breaking [version]  Find breaking (non-compatible) changes
  status <status>     Find issues by workflow status
  get <key>           Get details for a specific issue (e.g., FHIR-43499)
  snapshot <key>      Get COMPLETE issue snapshot - all fields, full comments,
                      metadata. Use after FTS to get full context for analysis.
  stats               Show database statistics
  sql <query>         Execute raw SQL query

Options:
  --limit <n>         Max results (default: 20)
  --json              Output as JSON
  --help              Show this help

Recommended Workflow:
  1. Search:   bun run jira:search fts "your topic"
  2. Snapshot: bun run jira:search snapshot FHIR-XXXXX
  3. Analyze the full issue context, then search for related issues

Examples:
  bun run src/search.ts fts "Patient identifier"
  bun run src/search.ts resource Patient --limit 50
  bun run src/search.ts version R6 --json
  bun run src/search.ts breaking R5
  bun run src/search.ts status Triaged
  bun run src/search.ts get FHIR-43499
  bun run src/search.ts snapshot FHIR-43499   # Full issue with all comments
  bun run src/search.ts snapshot FHIR-43499 --json
  bun run src/search.ts sql "SELECT key, summary FROM issues WHERE change_impact = 'Non-compatible' LIMIT 10"

Environment:
  FHIR_DB    Path to database file (default: fhir_issues.db)
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
      version: { type: "string" },
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
      fts(arg, limit, json);
      break;
      
    case "resource":
      if (!arg) { console.error("Usage: resource <name>"); return; }
      searchResource(arg, limit, json);
      break;
      
    case "version":
      if (!arg) { console.error("Usage: version <ver>"); return; }
      searchVersion(arg, limit, json);
      break;
      
    case "breaking":
      searchBreaking(arg || values.version as string, limit, json);
      break;
      
    case "status":
      if (!arg) { console.error("Usage: status <status>"); return; }
      searchStatus(arg, limit, json);
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
      fts(positionals.join(" "), limit, json);
  }
}

main().catch(console.error);
