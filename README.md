# FHIR Community Search

Local full-text search tools for FHIR community knowledge sources.

## Data Sources

| Source | Location | Content |
|--------|----------|--------|
| **Jira** | `jira/` | HL7 FHIR specification issues (jira.hl7.org) - 48k+ issues |
| **Zulip** | `zulip/` | FHIR community chat (chat.fhir.org) - 1M+ messages |

Each subfolder contains:
- `download.ts` - Data downloader
- `search.ts` - Search CLI
- `data.db` - SQLite database with FTS5 index
- `README.md` - Schema, commands, and query examples

## Recommended Workflow: Search → Snapshot → Explore

The most effective way to research a topic is an **iterative loop**:

### 1. Search broadly with FTS
```bash
bun run jira:search fts "organizational identity SMART"
bun run zulip:search fts "backend services organization"
```

### 2. Snapshot promising results
Don't stop at search snippets—get full context:
```bash
# Jira: full issue with all comments
bun run jira:search snapshot FHIR-45249

# Zulip: full conversation thread  
bun run zulip:search snapshot smart "organization identity"
```

### 3. Follow connections and iterate
- Note issue keys or topics mentioned in snapshots
- Search for referenced issues/discussions
- Snapshot those, repeat until you have the full picture

```bash
# Find issues referencing the one you read
bun run jira:search sql "SELECT key, summary FROM issues WHERE description LIKE '%FHIR-45249%'"

# Find Zulip discussions mentioning a Jira issue
bun run zulip:search fts "FHIR-45249"
```

## Quick Start

```bash
# Jira
bun run jira:search fts "Patient identifier"
bun run jira:search snapshot FHIR-43499
bun run jira:search --help

# Zulip  
bun run zulip:search fts "SMART organization"
bun run zulip:search snapshot smart "app launch"
bun run zulip:search --help
```

## Common Options

All search CLIs support:
- `--limit <n>` - Max results (default: 20)
- `--json` - JSON output
- `--help` - Show commands

## See Also

- [jira/README.md](jira/README.md) - Jira schema, queries, workflow
- [zulip/README.md](zulip/README.md) - Zulip schema, queries, key streams
