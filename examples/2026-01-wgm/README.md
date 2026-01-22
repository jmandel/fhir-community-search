# FHIR-I Workgroup Meeting Preparation - January 2025 WGM

Automated triage and analysis of 208 open FHIR-I ballot issues for workgroup meeting preparation.

## Approach

This example demonstrates using LLM agents to prepare for HL7 workgroup meetings by:

1. **Identifying issues** - Query Jira for open ballot issues assigned to FHIR-I
2. **Parallel triage** - 5 agents simultaneously categorize issues by disposition approach
3. **Deep analysis** - Complex issues get detailed research with options frameworks

## Directory Structure

```
examples/2025-01-wgm/
├── README.md                 # This file
├── prompts/                  # Reusable prompts for the pipeline
│   ├── README.md             # Pipeline overview and customization guide
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
    ├── README.md             # Index of all quarters with cross-theme notes
    └── NN-theme-slug.md      # One file per thematic quarter
```

## Generation Process

### Step 1: Identify Open Ballot Issues

```sql
-- Query to find open FHIR-I ballot issues
SELECT key FROM issues 
WHERE json_extract(data, '$.status') IN ('Triaged', 'Submitted', 'Waiting for Input') 
  AND json_extract(data, '$.specification') LIKE '%FHIR-core%'
  AND json_extract(data, '$.work_group') LIKE '%fhir-i%'
  AND json_extract(data, '$.selected_ballot') IS NOT NULL
ORDER BY key
```

Result: 208 issues

### Step 2: Parallel Triage (5 agents)

Each agent processes ~42 issues, reading the full issue snapshot and categorizing:

**Prompt template:**
```
You are triaging FHIR-I workgroup ballot issues to determine disposition approach.

## Your Assignment
Process issues from lines [START]-[END] in issues.txt

For each issue:
1. Snapshot it: `bun run jira/search.ts snapshot FHIR-XXXXX`
2. Optionally search Zulip for related discussion
3. Categorize into ONE bucket:

**BLOCKVOTE** - Simple, non-controversial, can be batch-approved:
- Typo fixes, clarifications, editorial changes
- Clear technical corrections with obvious solutions

**PHONECALL** - Moderate complexity, brief discussion needed:
- Quick clarification or input from 1-2 people
- Minor technical decisions without broad impact

**MEETING** - Complex, needs workgroup discussion:
- Controversial or impacts multiple areas
- Breaking changes or significant design decisions
- Unresolved disagreement in comments

## Output
Append to: blockvote.txt, phonecall.txt, or meeting.txt
Format: FHIR-XXXXX | Brief reason
```

### Step 3: Deep Analysis of Meeting Issues (5 agents)

Each agent processes ~12 complex issues, producing detailed markdown analyses:

**Prompt template:**
```
You are investigating complex FHIR-I ballot issues that need meeting discussion.
Your job is to research thoroughly and provide frameworks - NOT make decisions.

For EACH issue:
1. Snapshot the issue
2. Search Zulip for related discussions
3. Snapshot related issues mentioned
4. Search the web if needed for FHIR spec context

Output format for each issue (FHIR-XXXXX.md):
- Issue Overview
- Current State  
- Stakeholder Perspectives
- Related Issues & Discussions
- Technical Considerations
- Potential Courses of Action (Options A, B, C with pros/cons)
- Questions for the Workgroup
- References
```

## Triage Results Summary

| Bucket | Count | Description |
|--------|-------|-------------|
| BLOCKVOTE | 81 | Typos, broken links, editorial, clear corrections |
| PHONECALL | 68 | Clarifications, minor decisions, waiting-for-input |
| MEETING | 59 | Breaking changes, new features, design decisions |

### Step 4: Thematic Clustering (1 agent)

One agent reads all 59 analyses and organizes them into 90-minute meeting quarters:

See `04-meeting-quarters/CLUSTERING-PROMPT.md` for the full prompt.

Key concepts:
- **Thematic groups**: Issues that benefit from same-session discussion (shared context, same experts needed)
- **Interdependencies**: Issues within a group that MUST be discussed together or in sequence
- **Anchors vs Satellites**: Which issues drive discussion vs. are quick follow-ons

## Using These Results

### For Meeting Chairs
1. Review `02-triage-buckets/blockvote.txt` - batch these for quick approval
2. Schedule calls for `phonecall.txt` items between meetings
3. Use `04-meeting-quarters/README.md` to plan which quarters to schedule
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
curl -L "https://github.com/jmandel/fhir-community-search/releases/download/jira-latest/jira-data.db.gz" | gzip -dc > jira/data.db
curl -L "https://github.com/jmandel/fhir-community-search/releases/download/zulip-latest/zulip-data.db.gz" | gzip -dc > zulip/data.db

# Re-run the triage and analysis process
# (Use the prompts above with your LLM orchestration tool)
```

## Notes

- Generated: January 2025
- Data sources: jira.hl7.org (48k+ issues), chat.fhir.org (1M+ messages)
- Analysis is informational - final decisions rest with the workgroup
