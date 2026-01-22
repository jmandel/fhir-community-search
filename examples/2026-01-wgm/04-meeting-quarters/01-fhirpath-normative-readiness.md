# FHIRPath Normative Readiness

## Summary
This group contains 8 closely related issues all concerning whether FHIRPath's advanced features (%factory, %server, %terminology) are ready for normative status in R6. Brian Postlethwaite, a FHIRPath implementer, has systematically identified documentation gaps, design inconsistencies, and maturity concerns. The core question is whether these features should be moved to an incubator IG rather than becoming normative.

## Expertise Needed
- **Brian Postlethwaite** (Reporter of all issues, FHIRPath implementer - Firely .NET)
- FHIRPath implementers (fhirpath.js - Paul Lynch, Java - HAPI team)
- Terminology Infrastructure representatives (Michael Lawley - CSIRO/Ontoserver)
- Security expertise (for %server data manipulation concerns)

## Issues in This Group

### Core Maturity Decision
**Interdependency:** These three issues represent the fundamental question of whether %factory and %server should be normative. The decision here drives all other issues in this group.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53954](../03-meeting-analyses/FHIR-53954.md) | %factory and %server not mature enough for normative | Anchor | Proposes moving both to incubator; was maturity-0 in R5 |
| [FHIR-54074](../03-meeting-analyses/FHIR-54074.md) | %server is far from normative ready | Anchor | Detailed security/design critique; data manipulation attack vectors |
| [FHIR-54078](../03-meeting-analyses/FHIR-54078.md) | Type Factory not ready for normative | Anchor | Notes duplication with CQL constructor syntax ([FHIR-33044](../03-meeting-analyses/FHIR-33044.md)) |

### Terminology Functions Design
**Interdependency:** These issues address whether terminology functions should be factory-style or fluent-style, and their documentation quality.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-54073](../03-meeting-analyses/FHIR-54073.md) | Terminology functions should be fluent | Satellite | Proposes replacing %terminology.xxx with fluent functions |
| [FHIR-54069](../03-meeting-analyses/FHIR-54069.md) | Extensive refinements to terminology FHIRPath extensions | Satellite | Parameter encoding issues, missing examples |

### Documentation & Consistency
**Interdependency:** These documentation issues apply regardless of the maturity decision but inform it.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53951](../03-meeting-analyses/FHIR-53951.md) | All functions should have examples, types, cardinality | Satellite | Systematic documentation gaps |
| [FHIR-53953](../03-meeting-analyses/FHIR-53953.md) | No documentation on remote interactions | Satellite | Timeouts, error handling, caching for remote calls |
| [FHIR-53960](../03-meeting-analyses/FHIR-53960.md) | Inconsistent error handling patterns | Satellite | Some functions return empty, others throw errors |

## Suggested Discussion Order
1. **Start with [FHIR-53954](../03-meeting-analyses/FHIR-53954.md)** - Establish whether %factory/%server should move to incubator
2. **Then [FHIR-54074](../03-meeting-analyses/FHIR-54074.md) and [FHIR-54078](../03-meeting-analyses/FHIR-54078.md)** - Review detailed critiques to inform the decision
3. **Then [FHIR-54073](../03-meeting-analyses/FHIR-54073.md) and [FHIR-54069](../03-meeting-analyses/FHIR-54069.md)** - Terminology function design (depends on overall direction)
4. **Finally documentation issues** - [FHIR-53951](../03-meeting-analyses/FHIR-53951.md), 53953, 53960 (scope depends on what stays normative)

## Cross-Theme Dependencies
- **FML Quarter**: FML uses FHIRPath extensively; FHIRPath maturity affects FML
- **Search Quarter**: SearchParameter.expression uses FHIRPath ([FHIR-53907](../03-meeting-analyses/FHIR-53907.md))
- **Terminology**: [FHIR-36651](../03-meeting-analyses/FHIR-36651.md) (term-filter/VCL) relates to terminology function design

## Key Decision Points
1. Should %factory and %server move to incubator? (Likely yes, given lack of implementation experience)
2. If they stay, what security restrictions are needed for %server?
3. Should %terminology functions be redesigned as fluent functions?
4. What documentation standard is required for normative FHIRPath functions?
