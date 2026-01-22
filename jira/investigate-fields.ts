/**
 * Investigate Jira Fields
 * 
 * Fetches a sample of issues with all fields and analyzes what's available.
 * Outputs a report of all fields, their types, and sample values.
 * 
 * Usage:
 *   bun run jira/investigate-fields.ts --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"
 */

import { parseArgs } from "util";

const BASE_URL = "https://jira.hl7.org/rest/api/2/search";

interface FieldInfo {
  name: string;
  type: string;
  samples: any[];
  nonNullCount: number;
}

async function fetchSample(cookies: string, startAt: number = 0, maxResults: number = 50): Promise<any> {
  const params = new URLSearchParams({
    jql: "project=FHIR ORDER BY updated DESC",  // Recent issues likely have more fields populated
    startAt: startAt.toString(),
    maxResults: maxResults.toString(),
    fields: "*all",
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
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  return response.json();
}

function getValueType(val: any): string {
  if (val === null || val === undefined) return "null";
  if (Array.isArray(val)) {
    if (val.length === 0) return "empty_array";
    return `array<${getValueType(val[0])}>`;
  }
  if (typeof val === "object") {
    const keys = Object.keys(val).slice(0, 5).join(",");
    return `object{${keys}}`;
  }
  return typeof val;
}

function summarizeValue(val: any): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "string") {
    if (val.length > 100) return val.slice(0, 100) + "...";
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    return `[${val.slice(0, 2).map(v => summarizeValue(v)).join(", ")}${val.length > 2 ? `, ...(${val.length} items)` : ""}]`;
  }
  if (typeof val === "object") {
    // Common Jira patterns
    if (val.name) return `{name: "${val.name}"}`;
    if (val.displayName) return `{displayName: "${val.displayName}"}`;
    if (val.value) return `{value: "${val.value}"}`;
    if (val.key) return `{key: "${val.key}"}`;
    const keys = Object.keys(val).slice(0, 3);
    return `{${keys.join(", ")}}`;
  }
  return String(val);
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      cookie: { type: "string" },
      "cookie-file": { type: "string" },
      "sample-size": { type: "string", default: "100" },
      "dump-json": { type: "boolean", default: false },
    },
  });

  let cookies: string;
  
  if (values["cookie-file"]) {
    cookies = await Bun.file(values["cookie-file"]).text();
  } else if (values.cookie) {
    cookies = values.cookie;
  } else {
    console.error("Usage: bun run jira/investigate-fields.ts --cookie 'JSESSIONID=...'");
    console.error("   or: bun run jira/investigate-fields.ts --cookie-file cookies.txt");
    console.error("\nOptions:");
    console.error("   --sample-size N    Number of issues to sample (default: 100)");
    console.error("   --dump-json        Save raw JSON to sample-issues.json");
    process.exit(1);
  }

  cookies = cookies.trim();
  const sampleSize = parseInt(values["sample-size"] as string);
  const dumpJson = values["dump-json"] as boolean;

  console.log(`Fetching ${sampleSize} issues with all fields...\n`);

  // Fetch issues in batches
  const allIssues: any[] = [];
  let fieldNames: Record<string, string> = {};
  
  for (let startAt = 0; startAt < sampleSize; startAt += 50) {
    const batchSize = Math.min(50, sampleSize - startAt);
    const response = await fetchSample(cookies, startAt, batchSize);
    
    if (response.names) {
      fieldNames = { ...fieldNames, ...response.names };
    }
    
    allIssues.push(...response.issues);
    console.log(`  Fetched ${allIssues.length}/${sampleSize}...`);
    
    if (response.issues.length < batchSize) break;
    await Bun.sleep(200);
  }

  if (dumpJson) {
    await Bun.write("sample-issues.json", JSON.stringify({ names: fieldNames, issues: allIssues }, null, 2));
    console.log(`\nSaved raw JSON to sample-issues.json`);
  }

  // Analyze fields
  const fieldStats: Map<string, FieldInfo> = new Map();

  for (const issue of allIssues) {
    for (const [fieldId, value] of Object.entries(issue.fields)) {
      if (!fieldStats.has(fieldId)) {
        fieldStats.set(fieldId, {
          name: fieldNames[fieldId] || fieldId,
          type: "",
          samples: [],
          nonNullCount: 0,
        });
      }
      
      const info = fieldStats.get(fieldId)!;
      
      if (value !== null && value !== undefined && value !== "" && 
          !(Array.isArray(value) && value.length === 0)) {
        info.nonNullCount++;
        if (info.samples.length < 3) {
          info.samples.push(value);
        }
        const vtype = getValueType(value);
        if (!info.type || info.type === "null") {
          info.type = vtype;
        }
      }
    }
  }

  // Sort by usage and print report
  const sorted = [...fieldStats.entries()].sort((a, b) => b[1].nonNullCount - a[1].nonNullCount);

  console.log(`\n${"-".repeat(120)}`);
  console.log(`FIELD ANALYSIS (${allIssues.length} issues sampled)`);
  console.log(`${"-".repeat(120)}\n`);

  // Group by category
  const standardFields: typeof sorted = [];
  const customFields: typeof sorted = [];

  for (const entry of sorted) {
    if (entry[0].startsWith("customfield_")) {
      customFields.push(entry);
    } else {
      standardFields.push(entry);
    }
  }

  console.log("## STANDARD JIRA FIELDS\n");
  console.log("| Field ID | Name | Usage | Type | Sample Values |");
  console.log("|----------|------|-------|------|---------------|");
  
  for (const [fieldId, info] of standardFields) {
    const pct = ((info.nonNullCount / allIssues.length) * 100).toFixed(0);
    const samples = info.samples.slice(0, 2).map(s => summarizeValue(s)).join("; ");
    console.log(`| ${fieldId} | ${info.name} | ${pct}% | ${info.type} | ${samples} |`);
  }

  console.log("\n## CUSTOM FIELDS (FHIR-specific)\n");
  console.log("| Field ID | Name | Usage | Type | Sample Values |");
  console.log("|----------|------|-------|------|---------------|");
  
  for (const [fieldId, info] of customFields) {
    if (info.nonNullCount === 0) continue;  // Skip empty fields
    const pct = ((info.nonNullCount / allIssues.length) * 100).toFixed(0);
    const samples = info.samples.slice(0, 2).map(s => summarizeValue(s)).join("; ");
    console.log(`| ${fieldId} | ${info.name} | ${pct}% | ${info.type} | ${samples} |`);
  }

  // Special section for issue links
  console.log("\n## ISSUE LINKS ANALYSIS\n");
  
  const linkTypes: Map<string, number> = new Map();
  let issuesWithLinks = 0;
  let totalLinks = 0;
  
  for (const issue of allIssues) {
    const links = issue.fields.issuelinks || [];
    if (links.length > 0) {
      issuesWithLinks++;
      totalLinks += links.length;
      
      for (const link of links) {
        const typeName = link.type?.name || "unknown";
        linkTypes.set(typeName, (linkTypes.get(typeName) || 0) + 1);
      }
    }
  }

  console.log(`Issues with links: ${issuesWithLinks}/${allIssues.length} (${((issuesWithLinks/allIssues.length)*100).toFixed(0)}%)`);
  console.log(`Total links: ${totalLinks}`);
  console.log("\nLink types:");
  for (const [type, count] of [...linkTypes.entries()].sort((a,b) => b[1] - a[1])) {
    console.log(`  - ${type}: ${count}`);
  }

  // Show sample links
  console.log("\nSample issue links:");
  let linkSamples = 0;
  for (const issue of allIssues) {
    const links = issue.fields.issuelinks || [];
    for (const link of links) {
      if (linkSamples >= 10) break;
      const target = link.outwardIssue || link.inwardIssue;
      if (target) {
        const direction = link.outwardIssue ? "outward" : "inward";
        const relationDesc = link.outwardIssue ? link.type?.outward : link.type?.inward;
        console.log(`  ${issue.key} --[${relationDesc}]--> ${target.key} (${target.fields?.summary?.slice(0,50)}...)`);
        linkSamples++;
      }
    }
    if (linkSamples >= 10) break;
  }

  console.log("\n" + "-".repeat(120));
}

main().catch(console.error);
