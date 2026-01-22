# FHIR Mapping Language (FML)

## Summary
This group contains 11 issues addressing the maturity and specification quality of the FHIR Mapping Language. Like the FHIRPath quarter, these issues question whether FML is ready for normative status, identify specification gaps, and propose moving FML to a separate specification or incubator. Brian Postlethwaite is the primary submitter, drawing from his experience implementing FML in the .NET library.

## Expertise Needed
- **Brian Postlethwaite** (Reporter of most issues, implementing FML in .NET)
- **Oliver Egger** (Matchbox FML implementation - ahdis)
- **Grahame Grieve** (HAPI FML reference implementation)
- FML users from cross-version mapping efforts
- StructureMap resource experts

## Issues in This Group

### Core Maturity/Location Decision
**Interdependency:** These issues address whether FML should be in core spec, a separate spec, or an incubator. Must decide this before detailed fixes.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54473 | FML not ready for normative | Anchor | Proposes moving to incubator or separate spec like FHIRPath |
| FHIR-54779 | Move StructureMap/FML to Additional Resource IG | Anchor | Claims limited adoption, partial library support |
| FHIR-54486 | Remove FML tutorial from core spec | Satellite | Tutorial is anomalous in spec; better in IG |

### Specification Gaps
**Interdependency:** These issues identify missing or unclear specification content that affects implementers.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54481 | No official FML to StructureMap mapping | Anchor | Only HAPI implementation defines parsing |
| FHIR-54484 | Transform functions documentation issues | Satellite | Missing types, examples, duplicate entries |
| FHIR-54483 | Error reporting format (FML vs StructureMap location) | Satellite | No guidance on error message locations |
| FHIR-54955 | Rule evaluation order undefined | Satellite | first/last list options unclear |

### Language Feature Gaps
**Interdependency:** These propose enhancements to FML capabilities.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54474 | Source should allow FHIRPath expression | Satellite | Can't split comma-separated values |
| FHIR-54476 | StructureMap property chaining representation | Satellite | How does a.b.c translate to StructureMap? |
| FHIR-54478 | How can groups produce collections? | Satellite | Unclear if groups can output multiple resources |
| FHIR-54479 | Dependent group parameter variable restrictions | Satellite | Literal/FHIRPath expression handling unclear |

## Suggested Discussion Order
1. **Start with FHIR-54473 and FHIR-54779** - Decide location: core normative, separate spec, or incubator
2. **Then FHIR-54481** - If staying, must define FML-to-StructureMap mapping
3. **Then feature/documentation issues** - Prioritize based on location decision
4. **Finally FHIR-54486** - Tutorial location follows overall decision

## Cross-Theme Dependencies
- **FHIRPath Quarter**: FML uses FHIRPath; FHIRPath maturity affects FML
- **R6 Normative Readiness**: Part of broader "what's normative" discussion

## Key Decision Points
1. Should FML be in core spec, a separate specification (like FHIRPath), or an incubator IG?
2. If staying in core, is there time to create formal FML grammar and parsing rules?
3. What implementations exist and what is their experience? (HAPI, Matchbox, .NET)
4. Should StructureMap resource stay in core even if FML syntax moves out?
