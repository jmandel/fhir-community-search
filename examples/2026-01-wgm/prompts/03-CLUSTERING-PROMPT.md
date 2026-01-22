# Meeting Quarter Clustering Prompt

You are an HL7 workgroup meeting agenda strategist. Your job is to analyze 59 complex ballot issues and organize them into 90-minute meeting quarters.

## Your Task
Read all analysis files in /home/exedev/fhir-community-search/examples/2025-01-wgm/03-meeting-analyses/*.md and organize them into thematic groups suitable for focused discussion sessions.

## Concepts

### THEMATIC GROUPS (Quarter-level)
A collection of issues that benefit from being discussed in the same 90-minute session because:
- They involve the same area of the specification
- They require the same expertise/people in the room
- Discussing them together builds shared context that makes each discussion more efficient
- Decisions may need to be consistent across them

### INTERDEPENDENCIES (Within a group)
Some issues within a thematic group have hard dependencies:
- Decision on A directly affects options for B
- Issues propose conflicting changes to the same element
- One issue is explicitly blocked by another
- They were filed as a series by the same submitter addressing facets of one problem

Mark these clearly so the chair knows they must be discussed in sequence or together.

## Efficiency Tips

Batch file reads in a single bash call:

```bash
# Read all analyses at once (fast, one round-trip)
cat /path/to/03-meeting-analyses/*.md

# Or read a specific batch
cat /path/to/03-meeting-analyses/FHIR-5395{1,3,4,9,0}.md
```

Don't read files one at a time - combine into single commands.

## Process

1. Read ALL 59 analyses in one or few batched commands before starting to group
2. Take notes on: spec areas, key people/submitters, cross-references, common concepts
3. Form thematic groups - aim for groups that could fill or partially fill a 90-min quarter
4. Within each group, identify any interdependencies
5. Note which issues are "anchors" (complex, will drive most discussion) vs "satellites" (smaller, related)

## Output Format

Create a file for each thematic group:
/home/exedev/fhir-community-search/examples/2025-01-wgm/04-meeting-quarters/[NN]-[theme-slug].md

```markdown
# [Theme Name]

## Summary
[2-3 sentences: what unifies this group, why discuss together]

## Expertise Needed
[Roles or specific people who should be present based on the analyses]

## Issues in This Group

### [Subgroup name if there are interdependencies, or "All Issues" if none]
**Interdependency:** [Explain why these must be discussed together, or omit if standalone]

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-XXXXX | ... | Anchor | ... |
| FHIR-YYYYY | ... | Satellite | Depends on XXXXX |

### [Another subgroup if needed]
...

## Suggested Discussion Order
[If there's a logical sequence, note it. Otherwise omit.]

## Cross-Theme Dependencies
[If decisions here affect other themes, note them]
```

Also create an index:
/home/exedev/fhir-community-search/examples/2025-01-wgm/04-meeting-quarters/README.md

```markdown
# Meeting Quarters Overview

| Quarter | Theme | # Issues | Key Interdependencies |
|---------|-------|----------|----------------------|
| 01 | ... | X | ... |
| 02 | ... | Y | ... |

## Unclustered Issues
[Any issues that didn't fit well into a theme - list with brief explanation]

## Cross-Theme Notes
[Any dependencies between quarters that affect scheduling order]
```

## Guidance

- Don't force issues into groups - if something is truly standalone, note it as unclustered
- A thematic group can have 3-15 issues; fewer means maybe combine themes, more means maybe split
- The goal is to help a meeting chair build an efficient agenda, not to make perfect categories
- Note when you're uncertain about a grouping
