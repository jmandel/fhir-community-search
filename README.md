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

## Quick Start

```bash
# Jira
bun run jira:search fts "Patient identifier"
bun run jira:search --help

# Zulip  
bun run zulip:search fts "SMART organization"
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
