# Deep Analysis Prompt

Used to create detailed research documents for complex (meeting-level) issues. Run with 5 parallel agents, each handling ~12 issues.

---

You are investigating complex FHIR-I workgroup ballot issues that need meeting discussion. Your job is to research each issue thoroughly and write a detailed synopsis with potential courses of action - but NOT make decisions.

## Setup
1. Read /home/exedev/fhir-community-search/jira/README.md for Jira search/snapshot commands
2. Read /home/exedev/fhir-community-search/zulip/README.md for Zulip search commands
3. Use `~/.bun/bin/bun run jira/search.ts` and `~/.bun/bin/bun run zulip/search.ts`

## Efficiency Tips

Batch multiple commands in a single bash call when you know the steps upfront:

```bash
# Bad: separate calls (slow, round-trip to LLM between each)
bun run jira/search.ts snapshot FHIR-53951
bun run jira/search.ts snapshot FHIR-53953
bun run zulip/search.ts fts "FHIRPath"

# Good: combine with && or ; (fast, one round-trip)
bun run jira/search.ts snapshot FHIR-53951 && \
bun run jira/search.ts snapshot FHIR-53953 && \
bun run zulip/search.ts fts "FHIRPath"
```

When starting a batch of issues, read your assigned issue keys first, then snapshot several at once if they're independent.

## Your Assignment
Process issues from lines [START]-[END] in [PATH]/meeting.txt

For EACH issue:
1. **Snapshot the issue**: `~/.bun/bin/bun run jira/search.ts snapshot FHIR-XXXXX`
2. **Search Zulip** for related discussions: try the issue key, key terms from summary
3. **Snapshot related issues** mentioned in the issue
4. **Search the web** if needed to understand FHIR spec context (use browser tools)

## Output Format
For each issue, create a file: [OUTPUT_PATH]/FHIR-XXXXX.md

```markdown
# FHIR-XXXXX: [Summary]

## Issue Overview
[2-3 paragraph synopsis of what's being requested/reported]

## Current State
[What does the spec currently say? What's the problem?]

## Stakeholder Perspectives
[Who commented? What positions exist? Any disagreements?]

## Related Issues & Discussions
- [List related Jira issues with brief descriptions]
- [Summarize relevant Zulip threads]

## Technical Considerations
[Technical implications, dependencies, compatibility concerns]

## Potential Courses of Action

### Option A: [Name]
- Description: ...
- Pros: ...
- Cons: ...
- Impact: ...

### Option B: [Name]
- Description: ...
- Pros: ...
- Cons: ...
- Impact: ...

### Option C: [Name] (if applicable)
...

## Questions for the Workgroup
[Key questions that need to be answered to make a decision]

## References
- [Links to spec pages, related issues, Zulip threads]
```

Work through all assigned issues systematically. Be thorough - these are the complex issues that need real discussion.
