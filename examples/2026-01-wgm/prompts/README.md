# Prompts Used in This Example

These prompts were used to generate the meeting preparation materials. They can be adapted for other workgroups or ballot cycles.

## Pipeline Overview

```
[Issue List] 
    |
    v
[01-TRIAGE-PROMPT.md] -- 5 parallel agents, ~42 issues each
    |
    v
[blockvote.txt, phonecall.txt, meeting.txt]
    |
    v (meeting.txt only)
[02-ANALYSIS-PROMPT.md] -- 5 parallel agents, ~12 issues each  
    |
    v
[FHIR-XXXXX.md analyses]
    |
    v
[03-CLUSTERING-PROMPT.md] -- 1 agent reads all analyses
    |
    v
[Thematic quarter files]
```

## Prompts

| File | Purpose | Parallelism | Input | Output |
|------|---------|-------------|-------|--------|
| `01-TRIAGE-PROMPT.md` | Categorize by disposition approach | 5 agents | Issue list | 3 bucket files |
| `02-ANALYSIS-PROMPT.md` | Deep research on complex issues | 5 agents | meeting.txt | Per-issue .md files |
| `03-CLUSTERING-PROMPT.md` | Organize into meeting quarters | 1 agent | All analyses | Quarter .md files |

## Customization Points

### For Different Workgroups
- Change the SQL query to filter by different `work_group` values
- Adjust triage criteria based on workgroup norms

### For Different Issue Types
- Modify triage buckets (e.g., add "DELEGATE" for cross-WG issues)
- Adjust analysis template for non-ballot issues

### For Different Meeting Formats
- Change "90-minute quarters" to match your meeting structure
- Adjust clustering granularity accordingly

## Running the Pipeline

```bash
# 1. Get issue list
bun run jira:search sql "[YOUR QUERY]" --json | jq -r '.[].key' > issues.txt

# 2. Launch triage agents (example for 5 agents with 200 issues)
for i in 1 2 3 4 5; do
  START=$((($i-1)*40+1))
  END=$(($i*40))
  # Launch subagent with 01-TRIAGE-PROMPT.md, lines $START-$END
done

# 3. Launch analysis agents on meeting.txt results
# 4. Launch clustering agent on all analyses
```

See the main README.md for the specific commands used in this example.
