# FHIR Jira Issue Search

A high-performance local search system for HL7 FHIR specification issues from jira.hl7.org.

## Quick Start

```bash
# 1. Download all issues (requires authenticated session cookie)
bun run jira:download --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"

# 2. Search issues
bun run jira:search fts "Patient identifier"
bun run jira:search get FHIR-43499
bun run jira:search stats
```

## Getting Session Cookies

1. Log in to https://jira.hl7.org in your browser
2. Open DevTools (F12) → Network tab
3. Refresh the page
4. Find any request to jira.hl7.org, copy the `Cookie` header value
5. Save to `cookies.txt` or pass via `--cookie` flag

Required cookies: `JSESSIONID`, `seraph.rememberme.cookie`

## Database Schema

The SQLite database uses semantic column names for clarity:

### `issues` Table

| Column | Type | Description |
|--------|------|-------------|
| **Identifiers** |
| `key` | TEXT | Issue ID (e.g., "FHIR-43499") - PRIMARY KEY |
| **Content** |
| `summary` | TEXT | Issue title |
| `description` | TEXT | Full description (may contain markup) |
| **Workflow** |
| `status` | TEXT | Current status (Published, Triaged, Applied, etc.) |
| `resolution` | TEXT | Resolution type (Persuasive, Not Persuasive, etc.) |
| `priority` | TEXT | Priority level (Highest, High, Medium, Low, Lowest) |
| `issue_type` | TEXT | Type (Change Request, Question, etc.) |
| **People** |
| `reporter_name` | TEXT | Reporter's display name |
| `reporter_username` | TEXT | Reporter's Jira username |
| `assignee_name` | TEXT | Assignee's display name |
| `assignee_username` | TEXT | Assignee's Jira username |
| **Timestamps** |
| `created_at` | TEXT | ISO 8601 creation time |
| `updated_at` | TEXT | ISO 8601 last update time |
| `resolved_at` | TEXT | ISO 8601 resolution time |
| **FHIR Categorization** |
| `specification` | TEXT | Which spec (FHIR-core, FHIR-us-core, etc.) |
| `raised_in_version` | TEXT | Version when raised (R4, R5, R6, etc.) |
| `related_artifact` | TEXT | Affected resource (FHIR-core-Patient, etc.) |
| `work_group` | TEXT | Responsible HL7 work group |
| **Resolution Details** |
| `applied_for_version` | TEXT | Target version for the fix |
| `resolution_description` | TEXT | Details of how issue was resolved |
| `resolution_vote` | TEXT | Vote tally (e.g., "John Doe / Jane Roe: 10-0-0") |
| `change_category` | TEXT | Correction, Clarification, Enhancement |
| `change_impact` | TEXT | Non-substantive, Compatible, Non-compatible |
| `vote_date` | TEXT | When the vote was taken |
| **Location References** |
| `related_url` | TEXT | Link to affected spec section |
| `related_pages` | TEXT | Documentation pages affected |
| `related_sections` | TEXT | Section numbers (e.g., "3.2.1") |
| **Other** |
| `labels` | TEXT | Comma-separated labels |
| `components` | TEXT | Comma-separated components |
| `comment_count` | INTEGER | Number of comments |

### `comments` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment ID |
| `issue_key` | TEXT | Parent issue key (FK) |
| `author_name` | TEXT | Comment author's display name |
| `author_username` | TEXT | Comment author's username |
| `body` | TEXT | Comment text |
| `created_at` | TEXT | ISO 8601 timestamp |

### `issues_fts` - Full-Text Search Index

FTS5 virtual table indexing: `key`, `summary`, `description`, `specification`, 
`related_artifact`, `work_group`, `resolution_description`, `labels`

## CLI Commands

### Full-Text Search
```bash
bun run jira:search fts "Patient identifier"
bun run jira:search fts "security authorization OAuth"
bun run jira:search fts "breaking change Bundle"
```

### Search by Resource
```bash
bun run jira:search resource Patient
bun run jira:search resource Observation --limit 50
bun run jira:search resource "Consent" --json
```

### Search by Version
```bash
bun run jira:search version R6
bun run jira:search version R5 --limit 100
```

### Find Breaking Changes
```bash
bun run jira:search breaking           # All breaking changes
bun run jira:search breaking R5        # Breaking changes in R5
bun run jira:search breaking --json
```

### Search by Status
```bash
bun run jira:search status Triaged
bun run jira:search status "Waiting for Input"
```

### Get Specific Issue
```bash
bun run jira:search get FHIR-43499
bun run jira:search get FHIR-43499 --json
```

### Database Statistics
```bash
bun run jira:search stats
```

### Raw SQL Queries
```bash
bun run jira:search sql "SELECT key, summary FROM issues WHERE change_impact = 'Non-compatible' LIMIT 10"
```

## SQL Query Examples for LLM Agents

### Basic Queries

```sql
-- Find all issues for a specific resource
SELECT key, summary, status, raised_in_version
FROM issues
WHERE related_artifact LIKE '%Patient%'
ORDER BY created_at DESC
LIMIT 20;

-- Find open issues (not yet resolved)
SELECT key, summary, status, specification, work_group
FROM issues
WHERE status NOT IN ('Published', 'Resolved - No Change', 'Duplicate')
ORDER BY updated_at DESC
LIMIT 50;

-- Count issues by status
SELECT status, COUNT(*) as count
FROM issues
GROUP BY status
ORDER BY count DESC;
```

### Full-Text Search

```sql
-- FTS search with ranking
SELECT i.key, i.summary, i.status, i.related_artifact
FROM issues_fts fts
JOIN issues i ON i.rowid = fts.rowid
WHERE issues_fts MATCH 'consent AND privacy'
ORDER BY rank
LIMIT 20;

-- FTS with phrase search
SELECT i.key, i.summary
FROM issues_fts fts
JOIN issues i ON i.rowid = fts.rowid
WHERE issues_fts MATCH '"breaking change"'
LIMIT 20;

-- FTS with prefix search
SELECT i.key, i.summary
FROM issues_fts fts
JOIN issues i ON i.rowid = fts.rowid
WHERE issues_fts MATCH 'secur*'  -- matches security, secure, etc.
LIMIT 20;
```

### Advanced Queries

```sql
-- Breaking changes affecting specific resource in recent versions
SELECT key, summary, status, resolution_description, applied_for_version
FROM issues
WHERE change_impact = 'Non-compatible'
  AND related_artifact LIKE '%Observation%'
  AND raised_in_version IN ('R5', 'R6')
ORDER BY resolved_at DESC;

-- Issues with most comments (controversial/complex)
SELECT key, summary, status, comment_count
FROM issues
WHERE comment_count > 10
ORDER BY comment_count DESC
LIMIT 20;

-- Issues resolved by specific work group
SELECT key, summary, status, resolution_vote
FROM issues
WHERE work_group LIKE '%Infrastructure%'
  AND status = 'Published'
ORDER BY resolved_at DESC
LIMIT 20;

-- Recent issues needing triage
SELECT key, summary, reporter_name, created_at, specification
FROM issues
WHERE status = 'Submitted'
ORDER BY created_at DESC
LIMIT 30;

-- Cross-reference: issues mentioning another issue
SELECT key, summary, description
FROM issues
WHERE description LIKE '%FHIR-43499%'
   OR description LIKE '%FHIR-12345%';

-- Issues with specific labels
SELECT key, summary, status, labels
FROM issues
WHERE labels LIKE '%terminology%'
ORDER BY updated_at DESC;
```

### Aggregation Queries

```sql
-- Issues per month (trend analysis)
SELECT 
  substr(created_at, 1, 7) as month,
  COUNT(*) as issues_created
FROM issues
GROUP BY month
ORDER BY month DESC
LIMIT 24;

-- Resolution rate by work group
SELECT 
  work_group,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as resolved,
  ROUND(100.0 * SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
FROM issues
WHERE work_group != ''
GROUP BY work_group
ORDER BY total DESC
LIMIT 15;

-- Change impact distribution by version
SELECT 
  raised_in_version,
  COUNT(*) as total,
  SUM(CASE WHEN change_impact = 'Non-compatible' THEN 1 ELSE 0 END) as breaking,
  SUM(CASE WHEN change_impact = 'Compatible' THEN 1 ELSE 0 END) as compatible,
  SUM(CASE WHEN change_impact = 'Non-substantive' THEN 1 ELSE 0 END) as non_substantive
FROM issues
WHERE raised_in_version IN ('R4', 'R4B', 'R5', 'R6')
GROUP BY raised_in_version
ORDER BY raised_in_version;
```

### Comment Analysis

```sql
-- Get all comments for an issue
SELECT author_name, created_at, body
FROM comments
WHERE issue_key = 'FHIR-43499'
ORDER BY created_at;

-- Find issues where a specific person commented
SELECT DISTINCT c.issue_key, i.summary, i.status
FROM comments c
JOIN issues i ON i.key = c.issue_key
WHERE c.author_name LIKE '%Grahame%'
ORDER BY c.created_at DESC
LIMIT 20;

-- Search comment text
SELECT c.issue_key, i.summary, substr(c.body, 1, 200) as comment_preview
FROM comments c
JOIN issues i ON i.key = c.issue_key
WHERE c.body LIKE '%backward compat%'
LIMIT 20;
```

## Best Practices for LLM Agents

### Search → Snapshot → Explore Loop

The most effective way to research a topic is an **iterative loop** of searching, snapshotting promising results, and exploring connections. Don't stop at surface-level search results—take snapshots to understand full context.

#### Step 1: Cast a Wide Net with FTS

The database uses **SQLite FTS5** for full-text indexing. This is keyword-based search, not semantic—so **try multiple phrasings and synonyms**.

**Don't assume how concepts are discussed.** People use different terminology:
- "organization identity" vs "org context" vs "tenant" vs "acting organization"
- "backend services" vs "system-to-system" vs "B2B" vs "client credentials"
- "authorization" vs "auth" vs "OAuth" vs "access control"

```bash
# Try multiple variations of the same concept
bun run jira:search fts "organizational identity SMART"
bun run jira:search fts "organization context backend"
bun run jira:search fts "B2B authorization client"
bun run jira:search fts "tenant client_id"
bun run jira:search fts "acting organization OAuth"
```

FTS5 supports boolean operators and prefix matching:
```bash
# AND/OR/NOT
bun run jira:search fts "organization AND backend NOT patient"

# Prefix matching (finds organize, organization, organizational...)
bun run jira:search fts "organiz*"

# Phrase search
bun run jira:search fts '"client credentials"'
```

Or via SQL for more control:
```sql
SELECT key, summary, status, specification 
FROM issues_fts fts JOIN issues i ON i.rowid = fts.rowid
WHERE issues_fts MATCH 'organization AND (SMART OR backend OR B2B)'
ORDER BY rank LIMIT 20;
```

#### Step 2: Snapshot Promising Candidates

When you find issues that look relevant, **take a full snapshot** to see all fields, the complete description, resolution details, and every comment. This is where the real insights are.

```bash
bun run jira:search snapshot FHIR-45249
bun run jira:search snapshot FHIR-33672 --json
```

The snapshot includes:
- All metadata fields (version, work group, impact, etc.)
- Complete description (not truncated)
- Resolution details and vote information
- **Full comment thread** showing the discussion evolution

#### Step 3: Follow the Threads

After reading a snapshot, look for connections:

```bash
# Find issues that reference the one you just read
bun run jira:search sql "SELECT key, summary FROM issues WHERE description LIKE '%FHIR-45249%'"

# Find other issues by the same reporter (they may have filed related issues)
bun run jira:search sql "SELECT key, summary FROM issues WHERE reporter_name = 'Cooper Thompson' ORDER BY created_at DESC LIMIT 10"

# Find issues in the same specification with similar keywords
bun run jira:search fts "organization" --limit 30
```

#### Step 4: Iterate and Go Deeper

Repeat the loop:
1. Read snapshots carefully—comments often contain the most valuable insights
2. Note issue keys mentioned in descriptions/comments
3. Snapshot those referenced issues
4. Search for related terms you discover
5. Build a complete picture of the topic

#### Example Research Session

```bash
# Initial search
$ bun run jira:search fts "backend services organization identity"
# Found: FHIR-45249, FHIR-43002, FHIR-33672...

# Snapshot the most relevant hit
$ bun run jira:search snapshot FHIR-45249
# Learned: This is about organization_id being required in B2B auth
# Comment mentions FHIR-44704 as related

# Follow the reference
$ bun run jira:search snapshot FHIR-44704  
# Learned: Defines comprehensive organizational identity requirements

# Search for more context
$ bun run jira:search fts "UDAP B2B extension"
# Found more related issues...

# Continue until you have full picture
```

### Quick Reference Commands

| Goal | Command |
|------|---------|  
| Broad search | `bun run jira:search fts "your topic"` |
| Full issue context | `bun run jira:search snapshot FHIR-XXXXX` |
| Find references | `sql "... WHERE description LIKE '%FHIR-XXXXX%'"` |
| Filter by spec | `fts "topic" ` then filter in SQL |
| Breaking changes | `bun run jira:search breaking R5` |

### Legacy: Iterative Search Pattern

1. **Start broad**: Use FTS to find relevant issues
   ```sql
   SELECT key, summary FROM issues_fts WHERE issues_fts MATCH 'your topic';
   ```

2. **Narrow down**: Filter by status, version, resource
   ```sql
   SELECT key, summary FROM issues
   WHERE related_artifact LIKE '%Resource%'
     AND status NOT IN ('Published', 'Duplicate');
   ```

3. **Deep dive**: Get full details on promising issues
   ```bash
   bun run jira:search snapshot FHIR-XXXXX
   ```

4. **Find related**: Look for issues that reference each other
   ```sql
   SELECT key, summary FROM issues
   WHERE description LIKE '%FHIR-XXXXX%';
   ```

### Token-Efficient Queries

- Use `substr()` to limit description/comment length
- Select only needed columns
- Use LIMIT to cap results
- Request JSON output for structured parsing

```sql
SELECT key, summary, status, 
       substr(description, 1, 200) as description_preview
FROM issues
WHERE related_artifact LIKE '%Patient%'
LIMIT 10;
```

### Status Values Reference

| Status | Meaning |
|--------|---------|
| Submitted | New, awaiting triage |
| Triaged | Reviewed, awaiting resolution |
| Waiting for Input | Needs more information |
| Resolved - change required | Approved, needs implementation |
| Applied | Fix implemented in build |
| Published | Released in spec version |
| Resolved - No Change | Rejected or no action needed |
| Duplicate | Same as another issue |
| Deferred | Postponed to future version |

### Change Impact Values Reference

| Value | Meaning |
|-------|---------|
| Non-substantive | No impact on implementations |
| Compatible | Backward compatible change |
| Non-compatible | Breaking change |

## Files

```
fhir-search/
├── src/
│   ├── download.ts    # Issue downloader
│   └── search.ts      # Search CLI
├── data.db     # SQLite database (after download)
├── cookies.txt        # Session cookies (create this)
├── package.json
└── README.md
```
