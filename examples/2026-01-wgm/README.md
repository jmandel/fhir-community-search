# FHIR-I Workgroup Meeting Preparation - January 2026 WGM

Automated triage and analysis of 208 open FHIR-I ballot issues for workgroup meeting preparation.

## What This Is

This example shows how LLM agents with subagent capabilities can prepare for HL7 workgroup meetings:

1. **Identify issues** - Query Jira for open ballot issues assigned to FHIR-I
2. **Parallel triage** - Multiple agents simultaneously categorize issues by disposition approach
3. **Deep analysis** - Complex issues get detailed research with options frameworks
4. **Thematic clustering** - Group related issues into meeting quarters

The `prompts/` folder contains the guidance documents used. These aren't rigid templates - they're starting points that a capable agent can adapt. The actual execution was done conversationally with an orchestrating agent that spawned subagents as needed.

## Directory Structure

```
examples/2026-01-wgm/
├── README.md                 # This file
├── prompts/                  # Guidance for each pipeline stage
│   ├── 01-TRIAGE-PROMPT.md   # Categorize issues into disposition buckets
│   ├── 02-ANALYSIS-PROMPT.md # Deep research on complex issues
│   └── 03-CLUSTERING-PROMPT.md # Organize into meeting quarters
├── 01-issue-list/
│   └── issues.txt            # 208 open FHIR-I ballot issues
├── 02-triage-buckets/
│   ├── blockvote.txt         # Simple issues for batch approval (81)
│   ├── phonecall.txt         # Moderate issues for quick calls (68)  
│   └── meeting.txt           # Complex issues needing discussion (59)
├── 03-meeting-analyses/
│   └── FHIR-XXXXX.md         # Detailed analysis for each meeting-level issue (59 files)
└── 04-meeting-quarters/
    └── NN-theme-slug.md      # Thematic groupings for meeting scheduling
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

Result: 208 issues

### Step 2: Parallel Triage

Five subagents ran in parallel, each processing ~42 issues. Each agent:
- Read the Jira and Zulip READMEs to learn the tools
- Snapshotted each issue to see full content and comments
- Categorized into BLOCKVOTE / PHONECALL / MEETING buckets
- Appended results to shared output files

See `prompts/01-TRIAGE-PROMPT.md` for the guidance given.

### Step 3: Deep Analysis

Five subagents ran in parallel on the 59 MEETING-level issues. Each agent:
- Snapshotted the issue and any related issues mentioned
- Searched Zulip for community discussions
- Wrote a structured analysis with options and tradeoffs

See `prompts/02-ANALYSIS-PROMPT.md` for the guidance given.

### Step 4: Thematic Clustering

One agent read all 59 analyses and organized them into thematic groups suitable for 90-minute meeting quarters, noting interdependencies.

See `prompts/03-CLUSTERING-PROMPT.md` for the guidance given.

## Triage Results Summary

| Bucket | Count | Description |
|--------|-------|-------------|
| BLOCKVOTE | 81 | Typos, broken links, editorial, clear corrections |
| PHONECALL | 68 | Clarifications, minor decisions, waiting-for-input |
| MEETING | 59 | Breaking changes, new features, design decisions |

## Using These Results

### For Meeting Chairs
1. Review `02-triage-buckets/blockvote.txt` - batch these for quick approval
2. Schedule calls for `phonecall.txt` items between meetings
3. Use `04-meeting-quarters/` to plan which sessions to schedule
4. Within each quarter, use the interdependencies to sequence discussion

### For Workgroup Members  
1. Find your area of interest in `04-meeting-quarters/`
2. Read the detailed analyses in `03-meeting-analyses/` for those issues
3. Come prepared with positions on the "Questions for the Workgroup"
4. Review the "Potential Courses of Action" frameworks

## Regenerating

To regenerate with fresh data:

```bash
# Update databases
curl -L ".../jira-latest/jira-data.db.gz" | gzip -dc > jira/data.db
curl -L ".../zulip-latest/zulip-data.db.gz" | gzip -dc > zulip/data.db
```

Then work with an agent that supports subagents (Claude with computer use, Shelley, etc.) and ask it to:
1. Query for issues matching your criteria
2. Spawn parallel triage agents using the prompts as guidance
3. Spawn parallel analysis agents for complex issues
4. Run clustering on the results

The prompts in this folder are a starting point - adapt them to your workgroup's needs.

## Notes

- Generated: January 2026
- Data sources: jira.hl7.org (48k+ issues), chat.fhir.org (1M+ messages)
- Analysis is informational - final decisions rest with the workgroup
