# Meeting Quarters Overview

This document organizes 59 complex ballot issues into thematic groups suitable for 90-minute meeting quarters.

| Quarter | Theme | # Issues | Key Interdependencies |
|---------|-------|----------|----------------------|
| 01 | FHIRPath Normative Readiness | 8 | All Brian Postlethwaite issues; %factory/%server maturity decision drives all |
| 02 | FHIR Mapping Language (FML) | 11 | FML location decision (core/incubator/separate) drives all others |
| 03 | Search & Query Semantics | 5 | Term-filter/VCL is anchor; FHIRPath subset affects implementations |
| 04 | Bundle, Documents & Signatures | 6 | DiagnosticReport as document base (55368+54511); signature tickets (53810) |
| 05 | Subscriptions & Async Patterns | 4 | SubscriptionTopic enhancements; async _outputFormat |
| 06 | R6 Normative Readiness | 7 | Deprecated elements; trial-use in normative; ballot roadmap clarity |
| 07 | Conformance & Profiling | 5 | ElementDefinition logical models; CanonicalResource search params; bindings |
| 08 | Data Types & Resource Enhancements | 6 | CodeableCanonical; bodyStructure harmonization; various element additions |
| 09 | Definitional Resources | 3 | ExampleScenario.actor overlap with ActorDefinition |
| 10 | Laboratory Reporting | 2 | Panel representation; List for grouping (primarily O&O issue) |

## Unclustered Issues

| Issue | Summary | Reason Not Clustered |
|-------|---------|---------------------|
| FHIR-54876 | ServiceRequest.replaces for prolongation/renewal | Patient Care/Workflow issue; standalone |
| FHIR-54920 | Index page levels organization | Editorial/documentation; standalone |

## Cross-Theme Notes

### Major Dependencies Between Quarters

1. **FHIRPath (01) ↔ FML (02)**: FML uses FHIRPath extensively. Decisions about FHIRPath maturity affect FML.

2. **FHIRPath (01) ↔ Search (03)**: SearchParameter.expression uses FHIRPath. The FHIRPath subset question (FHIR-53907) bridges both.

3. **FHIRPath (01) / FML (02) ↔ R6 Normative Readiness (06)**: The "what's normative" discussion spans all three.

4. **Bundle/Documents (04) ↔ Laboratory Reporting (10)**: DiagnosticReport as document base affects lab report IGs.

5. **Data Types (08) ↔ Laboratory Reporting (10)**: bodyStructure harmonization affects diagnostic resources.

### Suggested Scheduling Order

1. **R6 Normative Readiness (06)** - Sets context for maturity discussions
2. **FHIRPath Normative Readiness (01)** - Key maturity decision
3. **FHIR Mapping Language (02)** - Depends on FHIRPath direction
4. **Search & Query (03)** - Related to FHIRPath
5. **Conformance & Profiling (07)** - Can run in parallel
6. **Bundle/Documents/Signatures (04)** - Can run in parallel
7. **Subscriptions & Async (05)** - Independent
8. **Data Types (08)** - Independent, many quick items
9. **Definitional Resources (09)** - Small group, quick
10. **Laboratory Reporting (10)** - Primarily O&O; may need joint session

### Key People Across Multiple Quarters

- **Brian Postlethwaite**: Quarters 01, 02 (primary), 03, 06
- **James Jahns**: Quarters 03, 05, 06
- **Gino Canessa**: Quarters 03, 05, 06
- **Bas van den Heuvel**: Quarters 04, 06, 09
- **Lloyd McKenzie**: Quarters 06, 07

## Issue Count Summary

- **Clustered**: 57 issues across 10 quarters
- **Unclustered**: 2 issues (standalone or different WG ownership)
- **Total**: 59 issues
