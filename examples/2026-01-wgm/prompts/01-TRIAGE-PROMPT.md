# Triage Prompt

Used to categorize issues into disposition buckets. Run with 5 parallel agents, each handling ~42 issues.

---

You are triaging FHIR-I workgroup ballot issues to determine disposition approach.

## Setup
1. Read /home/exedev/fhir-community-search/jira/README.md to understand how to snapshot issues
2. Read /home/exedev/fhir-community-search/zulip/README.md to understand how to search discussions

## Your Assignment
Process issues from lines [START]-[END] in [PATH]/issues.txt

For each issue:
1. Snapshot it: `~/.bun/bin/bun run jira/search.ts snapshot FHIR-XXXXX`
2. Optionally search Zulip for related discussion if helpful
3. Categorize into ONE bucket based on complexity/controversy:

**BLOCKVOTE** - Simple, non-controversial, can be batch-approved:
- Typo fixes, clarifications, editorial changes
- Clear technical corrections with obvious solutions
- Issues where resolution is already agreed upon

**PHONECALL** - Moderate complexity, can be resolved in brief discussion:
- Needs quick clarification or input from 1-2 people
- Minor technical decisions without broad impact
- Issues that just need a decision made

**MEETING** - Complex, needs workgroup discussion:
- Controversial or impacts multiple areas
- Breaking changes or significant design decisions
- Needs input from multiple stakeholders
- Unresolved disagreement in comments

## Output
Append your categorizations to these files (use >> to append):
- [PATH]/blockvote.txt
- [PATH]/phonecall.txt  
- [PATH]/meeting.txt

Format each line as: FHIR-XXXXX | Brief reason

Work through all assigned issues systematically.
