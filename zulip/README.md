# FHIR Chat Search

A high-performance local search system for [chat.fhir.org](https://chat.fhir.org) - the official FHIR community Zulip chat with over 1 million messages.

## Quick Start

```bash
# 1. Download all public messages (requires Zulip API credentials)
bun run zulip:download --email your@email.com --api-key YOUR_API_KEY

# 2. Search messages
bun run zulip:search fts "Patient identifier"
bun run zulip:search stats
```

## Getting API Credentials

1. Log in to https://chat.fhir.org
2. Go to **Settings** (gear icon) → **Personal Settings** → **Account & Privacy**
3. Click **"Show/change your API key"**
4. Copy your email and API key

You can save credentials to a file:
```
# ~/.zuliprc
email=your@email.com
key=YOUR_API_KEY
site=https://chat.fhir.org
```

Then use: `bun run zulip:download --cred-file ~/.zuliprc`

**Note:** Only public streams are downloaded. Private channels and DMs are excluded.

## Database Schema

The SQLite database uses clear column names for easy querying:

### `streams` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Stream ID (PRIMARY KEY) |
| `name` | TEXT | Stream/channel name (e.g., "implementers") |
| `description` | TEXT | Stream description |
| `is_web_public` | INTEGER | 1 if publicly viewable without login |
| `message_count` | INTEGER | Number of messages in stream |

### `messages` Table

| Column | Type | Description |
|--------|------|-------------|
| **Identifiers** |
| `id` | INTEGER | Message ID (PRIMARY KEY) |
| `stream_id` | INTEGER | Parent stream ID (FK) |
| **Content** |
| `stream_name` | TEXT | Stream name (denormalized for fast queries) |
| `topic` | TEXT | Topic/thread name within stream |
| `content` | TEXT | Message HTML content |
| **Sender** |
| `sender_id` | INTEGER | Sender's user ID |
| `sender_name` | TEXT | Sender's display name |
| `sender_email` | TEXT | Sender's email |
| **Timestamps** |
| `timestamp` | INTEGER | Unix timestamp |
| `created_at` | TEXT | ISO 8601 timestamp |
| **Metadata** |
| `reactions` | TEXT | JSON array of emoji reactions |

### `messages_fts` - Full-Text Search Index

FTS5 virtual table indexing: `stream_name`, `topic`, `sender_name`, `content`

## CLI Commands

### Full-Text Search
```bash
bun run zulip:search fts "Patient identifier"
bun run zulip:search fts "validation error" --stream implementers
bun run zulip:search fts "SMART on FHIR OAuth" --limit 50
bun run zulip:search fts "breaking change" --json
```

### Search by Stream
```bash
bun run zulip:search stream implementers
bun run zulip:search stream "us core" --limit 100
bun run zulip:search stream terminology --json
```

### Search by Topic
```bash
bun run zulip:search topic "FHIR R6"
bun run zulip:search topic "validation" --limit 50
```

### View Full Thread/Conversation
```bash
bun run zulip:search thread implementers "validation error"
bun run zulip:search thread "IG creation" "publisher error" --limit 100
```

### Search by User
```bash
bun run zulip:search user "Grahame Grieve"
bun run zulip:search user "Lloyd McKenzie" --limit 50
```

### Recent Messages
```bash
bun run zulip:search recent          # Last 7 days
bun run zulip:search recent 3        # Last 3 days
bun run zulip:search recent 30 --json
```

### List Streams
```bash
bun run zulip:search streams
bun run zulip:search streams --json
```

### List Topics in Stream
```bash
bun run zulip:search topics implementers
bun run zulip:search topics "IG creation" --limit 50
```

### Database Statistics
```bash
bun run zulip:search stats
```

### Raw SQL Queries
```bash
bun run zulip:search sql "SELECT COUNT(*) FROM messages"
bun run zulip:search sql "SELECT stream_name, COUNT(*) as cnt FROM messages GROUP BY stream_name ORDER BY cnt DESC LIMIT 10"
```

## SQL Query Examples for LLM Agents

### Basic Queries

```sql
-- Find recent messages in a stream
SELECT id, topic, sender_name, 
       substr(content, 1, 200) as preview, timestamp
FROM messages
WHERE stream_name = 'implementers'
ORDER BY timestamp DESC
LIMIT 20;

-- Get all messages in a topic/thread (chronological)
SELECT sender_name, content, timestamp
FROM messages
WHERE stream_name = 'implementers' 
  AND topic = 'FHIR Validators'
ORDER BY timestamp ASC;

-- Find messages from a specific user
SELECT stream_name, topic, 
       substr(content, 1, 150) as preview, timestamp
FROM messages
WHERE sender_name LIKE '%Grahame%'
ORDER BY timestamp DESC
LIMIT 20;

-- Messages containing specific text
SELECT id, stream_name, topic, sender_name,
       substr(content, 1, 200) as preview
FROM messages
WHERE content LIKE '%Patient%' AND content LIKE '%identifier%'
ORDER BY timestamp DESC
LIMIT 20;
```

### Full-Text Search

```sql
-- FTS search with ranking (most relevant first)
SELECT m.id, m.stream_name, m.topic, m.sender_name, 
       substr(m.content, 1, 200) as preview
FROM messages_fts fts
JOIN messages m ON m.id = fts.rowid
WHERE messages_fts MATCH 'SMART AND FHIR AND authorization'
ORDER BY rank
LIMIT 20;

-- FTS with phrase search (exact phrase)
SELECT m.id, m.stream_name, m.topic, m.sender_name
FROM messages_fts fts
JOIN messages m ON m.id = fts.rowid  
WHERE messages_fts MATCH '"access token"'
LIMIT 20;

-- FTS with prefix matching
SELECT m.id, m.stream_name, m.topic
FROM messages_fts fts
JOIN messages m ON m.id = fts.rowid
WHERE messages_fts MATCH 'valid*'  -- matches validation, validator, validate, etc.
LIMIT 20;

-- FTS excluding terms
SELECT m.id, m.stream_name, m.topic, m.sender_name
FROM messages_fts fts
JOIN messages m ON m.id = fts.rowid
WHERE messages_fts MATCH 'Patient NOT test'
LIMIT 20;

-- FTS in specific stream
SELECT m.id, m.topic, m.sender_name, substr(m.content, 1, 200)
FROM messages_fts fts
JOIN messages m ON m.id = fts.rowid
WHERE messages_fts MATCH 'stream_name:implementers AND validation'
ORDER BY rank
LIMIT 20;
```

### Thread/Conversation Queries

```sql
-- Find most discussed topics (by message count)
SELECT stream_name, topic, COUNT(*) as msg_count,
       MIN(timestamp) as first_msg,
       MAX(timestamp) as last_msg
FROM messages
GROUP BY stream_name, topic
ORDER BY msg_count DESC
LIMIT 20;

-- Recent active topics in a stream
SELECT topic, COUNT(*) as msg_count, MAX(timestamp) as last_activity
FROM messages
WHERE stream_name = 'implementers'
GROUP BY topic
ORDER BY last_activity DESC
LIMIT 20;

-- Topics where a specific user participated
SELECT DISTINCT stream_name, topic, COUNT(*) as user_msgs
FROM messages
WHERE sender_name LIKE '%Grahame%'
GROUP BY stream_name, topic
ORDER BY user_msgs DESC
LIMIT 20;
```

### Analytics Queries

```sql
-- Messages per stream
SELECT stream_name, COUNT(*) as msg_count
FROM messages
GROUP BY stream_name
ORDER BY msg_count DESC;

-- Most active users
SELECT sender_name, COUNT(*) as msg_count
FROM messages
GROUP BY sender_name
ORDER BY msg_count DESC
LIMIT 20;

-- Activity by day (last 30 days)
SELECT date(timestamp, 'unixepoch') as day, COUNT(*) as msgs
FROM messages
WHERE timestamp > unixepoch('now', '-30 days')
GROUP BY day
ORDER BY day DESC;

-- Messages per hour of day (UTC) - find peak activity times
SELECT strftime('%H', timestamp, 'unixepoch') as hour, COUNT(*) as msgs
FROM messages
GROUP BY hour
ORDER BY hour;

-- User activity over time
SELECT date(timestamp, 'unixepoch') as day, COUNT(*) as msgs
FROM messages
WHERE sender_name LIKE '%Grahame%'
  AND timestamp > unixepoch('now', '-90 days')
GROUP BY day
ORDER BY day;
```

### Cross-Reference Queries

```sql
-- Find discussions mentioning JIRA issues
SELECT stream_name, topic, sender_name, 
       substr(content, 1, 200) as preview
FROM messages
WHERE content LIKE '%FHIR-4%' 
   OR content LIKE '%jira.hl7.org%'
ORDER BY timestamp DESC
LIMIT 20;

-- Find messages with links to build.fhir.org
SELECT stream_name, topic, sender_name, 
       substr(content, 1, 300) as preview
FROM messages  
WHERE content LIKE '%build.fhir.org%'
ORDER BY timestamp DESC
LIMIT 20;

-- Find discussions about specific FHIR resources
SELECT stream_name, topic, COUNT(*) as mentions
FROM messages
WHERE content LIKE '%Observation%' 
  AND content LIKE '%vital%'
GROUP BY stream_name, topic
ORDER BY mentions DESC
LIMIT 10;

-- Find GitHub/repo references
SELECT stream_name, topic, sender_name, 
       substr(content, 1, 200) as preview
FROM messages
WHERE content LIKE '%github.com/HL7%'
ORDER BY timestamp DESC
LIMIT 20;
```

### Conversation Context Queries

```sql
-- Get messages before and after a specific message (context)
SELECT id, sender_name, substr(content, 1, 200) as preview, timestamp
FROM messages
WHERE stream_name = 'implementers' 
  AND topic = 'some topic'
  AND timestamp BETWEEN 1704067200 - 3600 AND 1704067200 + 3600
ORDER BY timestamp;

-- Find related topics (topics with similar keywords)
SELECT DISTINCT topic, COUNT(*) as matches
FROM messages
WHERE stream_name = 'implementers'
  AND (content LIKE '%validation%' OR content LIKE '%validator%')
GROUP BY topic
ORDER BY matches DESC
LIMIT 10;
```

## Important Streams Reference

| Stream | Description | ~Messages |
|--------|-------------|----------:|
| `implementers` | General FHIR implementation Q&A | 135k |
| `IG creation` | Implementation Guide development | 62k |
| `terminology` | Terminology, ValueSets, CodeSystems | 23k |
| `shorthand` | FHIR Shorthand (FSH) language | 14k |
| `hapi` | HAPI FHIR Java library | 13k |
| `questionnaire` | Questionnaire & forms | 11k |
| `conformance` | Profiles, extensions, validation | 11k |
| `Security and Privacy` | Security, consent, access control | 6k |
| `us core` | US Core Implementation Guide | 5k |
| `cds hooks` | CDS Hooks specification | 4k |
| `smart` | SMART on FHIR / app launch | 4k |
| `bulk data` | Bulk Data Access | 3k |
| `subscriptions` | FHIR Subscriptions | 3k |

## Best Practices for LLM Agents

### Iterative Search Pattern

1. **Start with FTS** to find relevant discussions:
   ```sql
   SELECT stream_name, topic, COUNT(*) as msgs
   FROM messages_fts fts
   JOIN messages m ON m.id = fts.rowid
   WHERE messages_fts MATCH 'your search terms'
   GROUP BY stream_name, topic
   ORDER BY msgs DESC
   LIMIT 10;
   ```

2. **Get full thread** for promising topics:
   ```sql
   SELECT sender_name, content, timestamp
   FROM messages
   WHERE stream_name = 'implementers' AND topic = 'found topic'
   ORDER BY timestamp ASC;
   ```

3. **Find expert opinions** - look for responses from known experts:
   ```sql
   SELECT sender_name, content, timestamp
   FROM messages
   WHERE stream_name = 'implementers' 
     AND topic = 'found topic'
     AND sender_name IN ('Grahame Grieve', 'Lloyd McKenzie', 'Josh Mandel')
   ORDER BY timestamp ASC;
   ```

4. **Find related discussions**:
   ```sql
   SELECT DISTINCT stream_name, topic
   FROM messages
   WHERE content LIKE '%keyword from previous%'
   LIMIT 10;
   ```

### Token-Efficient Queries

- Use `substr(content, 1, N)` to limit content length
- Select only needed columns  
- Use LIMIT to cap results
- Request `--json` output for structured parsing
- Filter by stream to reduce noise

```sql
-- Efficient query pattern
SELECT id, stream_name, topic, sender_name,
       substr(content, 1, 200) as preview
FROM messages
WHERE stream_name = 'implementers'
  AND timestamp > unixepoch('now', '-30 days')
ORDER BY timestamp DESC
LIMIT 10;
```

### Handling HTML Content

Message content is stored as HTML. Common patterns:
- `<p>...</p>` - Paragraphs
- `<code>...</code>` - Inline code
- `<a href="...">...</a>` - Links
- `<blockquote>...</blockquote>` - Quoted text
- `@**Name**` - User mentions (in source)

The CLI search tool automatically strips HTML for display.

### Key Users to Note

| User | Role |
|------|------|
| Grahame Grieve | FHIR founder, core spec editor |
| Lloyd McKenzie | HL7 CTO, FHIR co-chair |
| Josh Mandel | SMART on FHIR lead |
| Brian Postlethwaite | .NET FHIR, FHIRPath |
| Eric Haas | US Core, Argonaut |
| Jose Costa Teixeira | IG Publisher |

(Note: Bot accounts like "IG Build Bot", "FHIR Bot", "Simplifier" generate automated notifications)

## Files

```
fhir-chat-search/
├── src/
│   ├── download.ts    # Message downloader (Zulip API)
│   └── search.ts      # Search CLI
├── data.db       # SQLite database (~1.8GB with 1M+ messages)
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `FHIR_ZULIP_DB` | Path to database file | `data.db` |

## Resuming Interrupted Downloads

```bash
# If download is interrupted, resume with:
bun run zulip:download --email your@email.com --api-key KEY --resume
```

## Database Size

- ~1.8 GB for 1M+ messages
- FTS index adds ~30% overhead but enables fast full-text search
- Consider periodic re-downloads to get new messages
