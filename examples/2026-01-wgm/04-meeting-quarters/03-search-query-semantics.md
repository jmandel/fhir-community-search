# Search & Query Semantics

## Summary
This group contains 5 issues addressing FHIR search functionality: terminology-aware filtering, FHIRPath subset for search parameters, reference extension handling, timezone semantics, and the :not modifier behavior. These issues affect how implementers build search capabilities and how clients can reliably query FHIR servers.

## Expertise Needed
- **Josh Mandel** (Original reporter of [FHIR-36651](../03-meeting-analyses/FHIR-36651.md), search/terminology expertise)
- **Michael Lawley** (VCL proposal author, CSIRO terminology expert)
- **James Jahns** (Reporter of multiple search issues, server implementer)
- **Gino Canessa** (Search/subscription expert)
- Terminology Infrastructure workgroup representatives
- Server implementers (HAPI, Firely, etc.)

## Issues in This Group

### Terminology-Aware Search
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-36651](../03-meeting-analyses/FHIR-36651.md) | Define term-filter modifier for token type | Anchor | Long-standing (2022), VCL proposal, designation filtering |

### Search Parameter Definition
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53907](../03-meeting-analyses/FHIR-53907.md) | Define FHIRPath subset for SearchParameter.expression | Anchor | What FHIRPath features should search params use? |
| [FHIR-53909](../03-meeting-analyses/FHIR-53909.md) | Reference search params with alternate-reference extension | Satellite | How do searches handle Additional Resource references? |

### Search Behavior Semantics
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-54851](../03-meeting-analyses/FHIR-54851.md) | Review search timezone content | Satellite | "Dragon warning" about timezone handling |
| [FHIR-54853](../03-meeting-analyses/FHIR-54853.md) | Finalize :not modifier behavior | Satellite | :not with OR-joined values produces counterintuitive results |

## Suggested Discussion Order
1. **[FHIR-36651](../03-meeting-analyses/FHIR-36651.md)** - Complex, long-standing; may need TI coordination
2. **[FHIR-53907](../03-meeting-analyses/FHIR-53907.md)** - FHIRPath subset affects many implementations
3. **[FHIR-53909](../03-meeting-analyses/FHIR-53909.md)** - Affects Additional Resources pattern
4. **[FHIR-54853](../03-meeting-analyses/FHIR-54853.md)** - :not modifier needs clear resolution
5. **[FHIR-54851](../03-meeting-analyses/FHIR-54851.md)** - Timezone handling - may defer if no consensus

## Cross-Theme Dependencies
- **FHIRPath Quarter**: SearchParameter.expression uses FHIRPath ([FHIR-53907](../03-meeting-analyses/FHIR-53907.md))
- **Terminology**: [FHIR-36651](../03-meeting-analyses/FHIR-36651.md) relates to %terminology functions design
- **R6 Normative Readiness**: Search is normative; changes need careful consideration

## Key Decision Points
1. Is VCL ready for inclusion? What's the relationship with ValueSet.compose?
2. What FHIRPath features should be in the "search parameter subset"?
3. Should alternate-reference extensions be searchable? Who bears the burden?
4. Should :not with OR-joined values be prohibited or behavior clarified?
5. Is the timezone "dragon warning" still needed, or can we finalize rules?
