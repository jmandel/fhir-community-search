# FHIR Community Search

Local full-text search tools for FHIR community knowledge sources.

## Data Sources

| Source | Location | Content |
|--------|----------|--------|
| **Jira** | `jira/` | HL7 FHIR specification issues (jira.hl7.org) - 48k+ issues |
| **Zulip** | `zulip/` | FHIR community chat (chat.fhir.org) - 1M+ messages |

Each source has its own README with:
- Full database schema
- CLI commands and options
- SQL query examples
- Search strategies and best practices

## For LLM Orchestrators: Delegating Research

When researching FHIR topics, **delegate searches** to explore each data source (ideally in parallel). Each search task needs:

1. **The high-level research question** (what you're trying to learn)
2. **Instructions to read the relevant README first** before writing queries

### Example Task Instructions

**For Jira research:**
```
Research question: [YOUR QUESTION HERE]

Before searching:
1. Read jira/README.md thoroughly to understand the schema, CLI commands, and search strategies
2. Note the "Search → Snapshot → Explore" methodology

Then search iteratively, trying multiple phrasings. Take snapshots of promising issues to read full context including comments. Report back findings relevant to the research question.
```

**For Zulip research:**
```
Research question: [YOUR QUESTION HERE]

Before searching:
1. Read zulip/README.md thoroughly to understand the schema, CLI commands, and search strategies  
2. Note the key streams and expert users to watch for

Then search iteratively, trying multiple phrasings. Snapshot promising threads to read full conversations. Report back findings relevant to the research question.
```

### Why This Approach?

- **The READMEs are comprehensive** - they contain schema details, FTS5 query syntax, useful SQL patterns, and domain-specific guidance (key experts, status values, etc.)
- **Read once, query many** - the searcher reads the README then executes many queries informed by that knowledge
- **Parallel research** - Jira and Zulip searches can happen simultaneously
- **Clean synthesis** - when presenting findings to the user, focus on the substance (what was learned) not the mechanics (which databases were queried)

### Research Workflow

1. **Spawn parallel searches** - one for Jira, one for Zulip
2. **Each searcher reads its README** to learn the tools
3. **Iterative search** - try multiple query phrasings
4. **Snapshot promising results** - get full issue/thread context
5. **Follow connections** - referenced issues, related discussions
6. **Synthesize findings** - combine results into a coherent answer for the user (no need to mention the underlying search mechanics)

## Quick Reference (for humans)

```bash
# Jira
bun run jira:search fts "your query"
bun run jira:search snapshot FHIR-XXXXX
bun run jira:search --help

# Zulip
bun run zulip:search fts "your query"
bun run zulip:search snapshot stream "topic"
bun run zulip:search --help
```

## See Also

- [jira/README.md](jira/README.md) - Complete Jira search documentation
- [zulip/README.md](zulip/README.md) - Complete Zulip search documentation

---

## Developer Notes

### Creating a New Release

Releases bundle the pre-indexed SQLite databases for easy distribution. We publish
separate Jira and Zulip data releases (tags are data-only, not tied to git).

```bash
# Compress databases (zstd gives excellent compression on SQLite)
zstd -T0 -9 jira/data.db -o jira-data.db.zst
zstd -T0 -9 zulip/data.db -o zulip-data.db.zst

# Create Jira data release
JIRA_TAG="jira-2026.01.22"
gh release create "$JIRA_TAG" \
  jira-data.db.zst \
  --title "FHIR Community Search - Jira Data - 2026-01-22" \
  --notes "Pre-indexed Jira database."

# Update moving Jira tag (create once, then upload with --clobber)
gh release upload jira-latest jira-data.db.zst --clobber

# Create Zulip data release
ZULIP_TAG="zulip-2026.01.22"
gh release create "$ZULIP_TAG" \
  zulip-data.db.zst \
  --title "FHIR Community Search - Zulip Data - 2026-01-22" \
  --notes "Pre-indexed Zulip database."

# Update moving Zulip tag (create once, then upload with --clobber)
gh release upload zulip-latest zulip-data.db.zst --clobber
```

### Updating Data

```bash
# Refresh Jira issues (requires session cookies)
bun run jira:download --cookie "JSESSIONID=xxx; seraph.rememberme.cookie=xxx"

# Refresh Zulip messages (requires API key)
bun run zulip:download --email you@example.com --api-key YOUR_KEY
```

After updating, create a new release with fresh database snapshots.
