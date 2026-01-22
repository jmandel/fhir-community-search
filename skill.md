# Skill: FHIR Community Research

Search HL7 FHIR specification issues (Jira) and community discussions (Zulip) using local SQLite databases with full-text search.

## Setup

```bash
# Download repository zip via GitHub API (no git required)
curl -L "https://api.github.com/repos/jmandel/fhir-community-search/zipball" -o fhir-community-search.zip
unzip fhir-community-search.zip
cd jmandel-fhir-community-search-*

# Install Bun if needed, then install dependencies
# https://bun.sh/docs/installation
bun install

# Download pre-indexed databases (~380 MB compressed, ~2 GB uncompressed)
# Use moving "latest" tags maintained per data stream.
curl -L "https://github.com/jmandel/fhir-community-search/releases/download/jira-latest/jira-data.db.gz" | gzip -dc > jira/data.db
curl -L "https://github.com/jmandel/fhir-community-search/releases/download/zulip-latest/zulip-data.db.gz" | gzip -dc > zulip/data.db
```

## Data Sources

| Source | Content |
|--------|--------|
| **Jira** | 48k+ HL7 FHIR specification issues from jira.hl7.org |
| **Zulip** | 1M+ messages from chat.fhir.org community discussions |

## Usage

Read `README.md` in the repository for the research workflow.

For any FHIR research question, delegate parallel searches:

### Jira Search Task
```
Research question: [YOUR QUESTION]

Before searching:
1. Read jira/README.md for schema, CLI commands, and search strategies
2. Note the "Search → Snapshot → Explore" methodology

Search iteratively with multiple phrasings. Snapshot promising issues to read full context including comments. Report findings relevant to the research question.
```

### Zulip Search Task  
```
Research question: [YOUR QUESTION]

Before searching:
1. Read zulip/README.md for schema, CLI commands, and search strategies
2. Note key streams and expert users to watch for

Search iteratively with multiple phrasings. Snapshot promising threads for full conversations. Report findings relevant to the research question.
```

## Key Commands

```bash
# Full-text search
bun run jira:search fts "your query"
bun run zulip:search fts "your query"

# Get full context
bun run jira:search snapshot FHIR-XXXXX
bun run zulip:search snapshot stream "topic name"

# Help
bun run jira:search --help
bun run zulip:search --help
```

## Tips

- **Try multiple phrasings** - FTS is keyword-based, not semantic
- **Snapshot liberally** - full context reveals insights that snippets miss
- **Follow references** - issues and threads often link to related discussions
- **Synthesize cleanly** - present findings as substance, not search mechanics
