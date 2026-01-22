# FHIR Jira Issue Search

A high-performance local search system for HL7 FHIR specification issues from jira.hl7.org.

## For LLM Agents: How to Use This Tool

**Step 1: Search** - Use FTS or filters to find issues. Try multiple keyword variations.
```bash
bun run jira:search fts "organization identity"
bun run jira:search fts "Patient" --ballot 89190      # combine FTS + ballot filter
bun run jira:search ballot 89190 --status Triaged     # ballot + status filter
```

**Step 2: Snapshot** - For any promising issue, get the FULL content:
```bash
bun run jira:search snapshot FHIR-45249
```
This outputs a complete markdown document with ALL fields, the full description, resolution details, issue links, and EVERY comment.

**Step 3: Follow connections** - Look for referenced issues and linked ballots in the snapshot, then snapshot those too.

## Quick Start

```bash
# 1. Download all issues (requires authenticated session cookie)
bun run jira:download --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"

# 2. Search issues
bun run jira:search fts "Patient identifier"
bun run jira:search snapshot FHIR-43499
bun run jira:search stats
```

## Identifying Ballot Comments

Issues submitted as part of a ballot cycle have a `selected_ballot` field linking them to a ballot (e.g., `BALLOT-89190`). Use the ballot filter to find all comments for a specific ballot:

```bash
# All issues for ballot 89190
bun run jira:search ballot 89190

# Ballot issues about Patient resource  
bun run jira:search fts "Patient" --ballot 89190

# Breaking changes in a ballot
bun run jira:search ballot 89190 --impact Non-compatible
```

## Key Commands

| Command | Purpose |
|---------|--------|
| `fts "query"` | Full-text search across all indexed fields |
| `ballot <key>` | Find issues linked to a specific ballot |
| `resource <name>` | Find issues for a FHIR resource |
| `version <ver>` | Find issues for a FHIR version |
| `breaking` | Find breaking (non-compatible) changes |
| `status <status>` | Find issues by status |
| `snapshot <key>` | **Complete issue snapshot** - all fields, comments, links |
| `get <key>` | Brief issue view |
| `stats` | Database statistics |
| `sql <query>` | Execute raw SQL |

## Filter Options

Filters can be combined with any search command:

| Option | Description |
|--------|-------------|
| `--ballot <key>` | Filter by ballot (e.g., `--ballot 89190`) |
| `--status <status>` | Filter by status (e.g., `--status Triaged`) |
| `--version <ver>` | Filter by version (e.g., `--version R6`) |
| `--resource <name>` | Filter by resource (e.g., `--resource Patient`) |
| `--workgroup <wg>` | Filter by work group (e.g., `--workgroup fhir-i`) |
| `--impact <impact>` | Filter by change impact |
| `--limit <n>` | Max results (default: 20) |
| `--json` | Output as JSON |

## Combined Filter Examples

```bash
# Ballot comments about Patient
bun run jira:search fts "Patient" --ballot 89190

# Breaking changes in R6
bun run jira:search breaking --version R6

# Triaged Patient issues in R6
bun run jira:search resource Patient --version R6 --status Triaged

# Security issues in fhir-i work group
bun run jira:search fts "security OAuth" --workgroup fhir-i

# All applied ballot issues
bun run jira:search ballot 89190 --status Applied
```

## Getting Session Cookies

1. Log in to https://jira.hl7.org in your browser
2. Open DevTools (F12) → Network tab
3. Refresh the page
4. Find any request to jira.hl7.org, copy the `Cookie` header value
5. Save to `cookies.txt` or pass via `--cookie` flag

Required cookies: `JSESSIONID`, `seraph.rememberme.cookie`

## Database Schema

The database stores issues as JSON documents with full-text search indexes.

### `issues` Table

```sql
CREATE TABLE issues (
  key TEXT PRIMARY KEY,   -- e.g., "FHIR-43499"
  data JSON NOT NULL      -- Full issue document
);
```

### JSON Document Structure

Each issue document contains:

```javascript
{
  // Identifiers
  "key": "FHIR-43499",
  "url": "https://jira.hl7.org/browse/FHIR-43499",
  
  // Content
  "summary": "Issue title",
  "description": "Full description text",
  
  // Workflow
  "status": "Published",           // Published, Triaged, Applied, etc.
  "resolution": "Persuasive",      // Persuasive, Not Persuasive, etc.
  "priority": "Medium",
  "issue_type": "Change Request",  // Change Request, Technical Correction, Comment, Question
  
  // People
  "reporter": { "name": "John Doe", "username": "jdoe" },
  "assignee": { "name": "Jane Smith", "username": "jsmith" },
  
  // Timestamps
  "created_at": "2024-01-15T10:30:00.000+0000",
  "updated_at": "2024-02-20T14:22:00.000+0000",
  "resolved_at": "2024-02-18T09:15:00.000+0000",
  
  // FHIR Categorization
  "specification": ["FHIR-core"],           // Which spec
  "raised_in_version": ["R6"],              // Version when raised
  "related_artifacts": ["FHIR-core-Patient"], // Affected resources
  "work_group": ["fhir-i"],                 // Responsible work group
  
  // Ballot Information
  "selected_ballot": ["BALLOT-89190"],      // Links to ballot (key field!)
  "grouping": ["Ready-For-Vote"],           // Block vote grouping
  
  // Resolution Details  
  "applied_for_version": ["6.0.0"],
  "resolution_description": "How it was resolved...",
  "resolution_vote": "John/Jane: 10-0-0",
  "vote_date": "2024-02-15",
  "change_category": "Enhancement",         // Correction, Clarification, Enhancement
  "change_impact": "Non-substantive",       // Non-substantive, Compatible, Non-compatible
  
  // References
  "related_url": "https://hl7.org/fhir/...",
  "related_pages": ["FHIR-core-patient"],
  "related_sections": "3.2.1",
  
  // Issue Links (HL7 Jira uses custom fields, not standard issuelinks)
  "related_issues": [
    { "key": "FHIR-11111", "summary": "...", "status": "Applied", "type": "Change Request" }
  ],
  "duplicate_of": {  // This issue is a duplicate of another
    "key": "FHIR-99999", 
    "summary": "The original issue",
    "status": "Triaged",
    "type": "Change Request"
  },
  
  // Comments
  "comments": [
    {
      "author": { "name": "Grahame Grieve", "username": "grahamegrieve" },
      "body": "Comment text...",
      "created_at": "2024-01-20T08:00:00.000+0000"
    }
  ],
  
  // Attachments
  "attachments": [
    { "filename": "example.pdf", "size": 12345, "url": "..." }
  ]
}
```

### `issues_fts` - Full-Text Search Index

FTS5 virtual table indexing: `key`, `summary`, `description`, `specification`, `work_group`, `related_artifacts`, `resolution_description`, `labels`, `comments_text`

## SQL Query Examples

### Basic Queries

```sql
-- Get issue by key
SELECT data FROM issues WHERE key = 'FHIR-43499';

-- Extract specific fields
SELECT 
  key,
  json_extract(data, '$.summary') as summary,
  json_extract(data, '$.status') as status,
  json_extract(data, '$.selected_ballot') as ballot
FROM issues
LIMIT 10;
```

### Finding Ballot Comments

```sql
-- All issues linked to a specific ballot
SELECT 
  key,
  json_extract(data, '$.summary') as summary,
  json_extract(data, '$.status') as status
FROM issues
WHERE json_extract(data, '$.selected_ballot') LIKE '%BALLOT-89190%'
ORDER BY json_extract(data, '$.created_at') DESC;

-- Count issues per ballot
SELECT 
  json_extract(data, '$.selected_ballot') as ballot,
  COUNT(*) as issue_count
FROM issues
WHERE json_extract(data, '$.selected_ballot') IS NOT NULL
GROUP BY ballot
ORDER BY issue_count DESC
LIMIT 20;

-- Ballot issues with specific resolution
SELECT key, json_extract(data, '$.summary') as summary
FROM issues
WHERE json_extract(data, '$.selected_ballot') LIKE '%BALLOT-89190%'
  AND json_extract(data, '$.resolution') = 'Persuasive';
```

### Combined Filters

```sql
-- Ballot + FTS (use the fts table)
SELECT i.key, json_extract(i.data, '$.summary') as summary
FROM issues_fts fts
JOIN issues i ON i.key = fts.key
WHERE issues_fts MATCH 'Patient identifier'
  AND json_extract(i.data, '$.selected_ballot') LIKE '%BALLOT-89190%'
ORDER BY rank
LIMIT 20;

-- Breaking changes in a specific version
SELECT key, json_extract(data, '$.summary') as summary
FROM issues
WHERE json_extract(data, '$.change_impact') = 'Non-compatible'
  AND json_extract(data, '$.raised_in_version') LIKE '%R6%';

-- Issues by work group and status
SELECT key, json_extract(data, '$.summary') as summary
FROM issues  
WHERE json_extract(data, '$.work_group') LIKE '%fhir-i%'
  AND json_extract(data, '$.status') = 'Triaged'
ORDER BY json_extract(data, '$.updated_at') DESC;
```

### Analyzing Issue Links & Duplicates

HL7 Jira uses custom fields for issue relationships (not standard Jira `issuelinks`):
- `related_issues` - array of linked issues
- `duplicate_of` - the issue this one duplicates

```sql
-- Find issues that are duplicates of another issue
SELECT 
  key,
  json_extract(data, '$.summary') as summary,
  json_extract(data, '$.duplicate_of.key') as duplicate_of
FROM issues
WHERE json_extract(data, '$.duplicate_of') IS NOT NULL;

-- Find issues with related issues linked
SELECT 
  key,
  json_extract(data, '$.summary') as summary,
  json_extract(data, '$.related_issues') as related
FROM issues
WHERE json_extract(data, '$.related_issues') IS NOT NULL
LIMIT 20;

-- Find all issues related to a specific issue
SELECT key, json_extract(data, '$.summary') as summary
FROM issues
WHERE json_extract(data, '$.related_issues') LIKE '%FHIR-12345%'
   OR json_extract(data, '$.duplicate_of.key') = 'FHIR-12345';
```

### Statistics

```sql
-- Status distribution
SELECT 
  json_extract(data, '$.status') as status,
  COUNT(*) as count
FROM issues
GROUP BY status
ORDER BY count DESC;

-- Resolution distribution for ballot issues
SELECT 
  json_extract(data, '$.resolution') as resolution,
  COUNT(*) as count
FROM issues
WHERE json_extract(data, '$.selected_ballot') IS NOT NULL
GROUP BY resolution
ORDER BY count DESC;

-- Issues per work group
SELECT 
  json_extract(data, '$.work_group') as work_group,
  COUNT(*) as count
FROM issues
GROUP BY work_group
ORDER BY count DESC
LIMIT 20;
```

### Full-Text Search

```sql
-- Basic FTS
SELECT i.key, json_extract(i.data, '$.summary') as summary
FROM issues_fts fts
JOIN issues i ON i.key = fts.key  
WHERE issues_fts MATCH 'Patient AND identifier'
ORDER BY rank
LIMIT 20;

-- FTS with phrase
SELECT i.key, json_extract(i.data, '$.summary') as summary
FROM issues_fts fts
JOIN issues i ON i.key = fts.key
WHERE issues_fts MATCH '"breaking change"'
ORDER BY rank;

-- FTS in specific column
SELECT i.key, json_extract(i.data, '$.summary') as summary  
FROM issues_fts fts
JOIN issues i ON i.key = fts.key
WHERE issues_fts MATCH 'description:security'
ORDER BY rank;
```

## Key Status Values

| Status | Description |
|--------|-------------|
| `Submitted` | New issue, not yet reviewed |
| `Triaged` | Categorized, ready for work group review |
| `Waiting for Input` | Needs more information |
| `Applied` | Change applied to spec source |
| `Published` | Released in official publication |
| `Resolved - No Change` | Decided not to change |
| `Duplicate` | Duplicate of another issue |
| `Deferred` | Postponed to future version |

## Key Resolution Values

| Resolution | Description |
|------------|-------------|
| `Persuasive` | Comment accepted, change made |
| `Persuasive with Modification` | Accepted with changes |
| `Not Persuasive` | Comment rejected |
| `Not Persuasive with Modification` | Partially rejected |
| `Considered - No action required` | Reviewed, no change needed |
| `Considered - Question answered` | Question addressed |
| `Retracted` | Submitter withdrew |
| `Duplicate` | Same as another issue |

## Change Impact Values

| Impact | Description |
|--------|-------------|
| `Non-substantive` | Editorial/typo fix, no functional change |
| `Compatible, substantive` | Functional change, backward compatible |
| `Non-compatible` | Breaking change |

## Custom Field Mapping

HL7 Jira uses custom fields extensively. The download script maps these to semantic names:

| Jira Field | Mapped Name | Description |
|------------|-------------|-------------|
| `customfield_10902` | `selected_ballot` | Links issue to a ballot (e.g., `["BALLOT-89190"]`) |
| `customfield_11402` | `grouping` | Block vote grouping (e.g., `["Ready-For-Vote"]`) |
| `customfield_10510` | `resolution_vote` | Vote tally (e.g., `"John/Jane: 10-0-0"`) |
| `customfield_10525` | `vote_date` | Date of resolution vote |
| `customfield_11302` | `specification` | Which spec (e.g., `["FHIR-core"]`) |
| `customfield_11808` | `raised_in_version` | Version raised in (e.g., `["R6"]`) |
| `customfield_11807` | `applied_for_version` | Target fix version |
| `customfield_11400` | `work_group` | Responsible work group |
| `customfield_11300` | `related_artifacts` | Affected resources/profiles |
| `customfield_10618` | `resolution_description` | How it was resolved |
| `customfield_10512` | `change_category` | Correction/Clarification/Enhancement |
| `customfield_10511` | `change_impact` | Non-substantive/Compatible/Non-compatible |
| `customfield_10702` | `outstanding_negatives` | STU tracking |
| `customfield_10704` | `pre_applied` | Already applied flag |
| `customfield_10612` | `related_url` | Link to spec section |
| `customfield_11301` | `related_pages` | Documentation pages affected |
| `customfield_10518` | `related_sections` | Section numbers |
| `customfield_14905` | `related_issues` | Links to other FHIR issues |
| `customfield_14909` | `duplicate_of` | Issue this duplicates |
| `customfield_11000` | `in_person_requested_by` | Users requesting in-person discussion |

## Notable People

Key contributors whose comments often contain important context:
- Grahame Grieve (grahamegrieve) - FHIR founder
- Lloyd McKenzie (lmckenzie) - FHIR co-chair
- Bryn Rhodes (bryn) - CQL/Clinical Reasoning
- Eric Haas (ehaas) - US Core
- Josh Mandel - SMART on FHIR
