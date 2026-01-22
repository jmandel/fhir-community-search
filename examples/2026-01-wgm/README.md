# FHIR-I Workgroup Meeting Preparation - January 2026 WGM

Automated triage and analysis of 208 open FHIR-I ballot issues for workgroup meeting preparation.

## Prerequisites

See `/skill.md` in the repository root for setup instructions (downloading databases, installing dependencies).

## What This Is

This example shows how LLM agents with subagent capabilities can prepare for HL7 workgroup meetings:

1. **Identify issues** - Query Jira for open ballot issues assigned to FHIR-I
2. **Parallel triage** - Multiple agents simultaneously categorize issues by disposition approach
3. **Deep analysis** - Complex issues get detailed research with options frameworks
4. **Thematic clustering** - Group related issues into meeting quarters

The `prompts/` folder contains the guidance documents used. These aren't rigid templates - they're starting points that a capable agent can adapt.

## Directory Structure

```
examples/2026-01-wgm/
├── README.md
├── prompts/
│   ├── 01-TRIAGE-PROMPT.md       # Categorize into blockvote/phonecall/meeting
│   ├── 02-ANALYSIS-PROMPT.md     # Deep research on complex issues
│   └── 03-CLUSTERING-PROMPT.md   # Organize into meeting quarters
├── 01-issue-list/
│   └── issues.txt                # 208 open FHIR-I ballot issues
├── 02-triage-buckets/
│   ├── blockvote.txt             # Simple: typos, links, editorial (81)
│   ├── phonecall.txt             # Moderate: clarifications, minor decisions (68)
│   └── meeting.txt               # Complex: breaking changes, design decisions (59)
├── 03-meeting-analyses/
│   └── FHIR-XXXXX.md             # Per-issue analysis with options/tradeoffs (59 files)
└── 04-meeting-quarters/
    └── NN-theme-slug.md          # Thematic groupings with interdependencies
```

## How It Was Generated

### Step 1: Identify Open Ballot Issues

```sql
SELECT key FROM issues 
WHERE json_extract(data, '$.status') IN ('Triaged', 'Submitted', 'Waiting for Input') 
  AND json_extract(data, '$.specification') LIKE '%FHIR-core%'
  AND json_extract(data, '$.work_group') LIKE '%fhir-i%'
  AND json_extract(data, '$.selected_ballot') IS NOT NULL
ORDER BY key
```

### Step 2: Parallel Triage (5 agents)

Each agent processed ~42 issues, snapshotting each to see full content/comments, categorizing into buckets. See `prompts/01-TRIAGE-PROMPT.md`.

### Step 3: Deep Analysis (5 agents)

Each agent processed ~12 complex issues, researching via Jira snapshots and Zulip searches, writing structured analyses. See `prompts/02-ANALYSIS-PROMPT.md`.

### Step 4: Thematic Clustering (1 agent)

One agent read all analyses and organized into meeting quarters with interdependencies noted. See `prompts/03-CLUSTERING-PROMPT.md`.

## Regenerating

Work with an agent that supports subagents and point it at:
1. `/skill.md` for database setup and search commands
2. `prompts/` for the pipeline guidance

Adapt the SQL query and prompts for your workgroup's needs.
