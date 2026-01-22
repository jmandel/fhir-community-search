# R6 Normative Readiness & Specification Quality

## Summary
This group contains 7 issues addressing the overall quality and readiness of R6 for normative status. Topics include deprecated elements that should be removed, unresolved "open issues" in the spec, mechanisms for evolving normative content, and clarifying what "fully normative" means. These meta-level concerns affect the entire specification.

## Expertise Needed
- **Lloyd McKenzie** (HL7 CTO, FHIR co-chair)
- **Grahame Grieve** (FHIR specification lead)
- FMG representatives
- Implementers with R4→R6 migration concerns
- HL7 standards process experts

## Issues in This Group

### Deprecated Elements
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-53722 | Deprecated elements should be withdrawn in R6 | Anchor | Lists 17+ deprecated elements still present |

### Open Issues in Spec
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-53900 | Contained resources open question | Satellite | "Is this a problem?" note should be resolved |
| FHIR-53901 | Workflow page open issues | Satellite | Section 15.8.2 has unresolved questions |

### Normative Evolution
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54783 | Trial use elements in normative resources | Anchor | How can normative resources evolve? |
| FHIR-53979 | Capture adoption level per resource | Satellite | FMM goes away; need adoption tracking |

### Ballot Roadmap Clarity
**Interdependency:** Both issues concern the ballot-intro.html page and should be discussed together.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54807 | Conflicting statements on breaking changes | Anchor | R4 normative vs R5 changes contradiction |
| FHIR-54809 | "Fully normative" claim vs informative content | Satellite | Informative pages exist; claim is imprecise |

## Suggested Discussion Order
1. **FHIR-54807 + FHIR-54809** - Clarify ballot roadmap language first
2. **FHIR-53722** - Deprecated elements decision (may have timeline impact)
3. **FHIR-54783** - Trial use in normative mechanism (strategic)
4. **FHIR-53900 + FHIR-53901** - Resolve open issue notes
5. **FHIR-53979** - Adoption tracking (may defer to post-R6)

## Cross-Theme Dependencies
- **FHIRPath Quarter**: %factory/%server maturity is part of this discussion
- **FML Quarter**: FML normative readiness is related
- **All Quarters**: Normative status affects all content

## Key Decision Points
1. Should deprecated elements be removed in R6 or retained with deprecation?
2. How can trial-use elements be tested within normative resources?
3. What does "fully normative" actually mean for R6?
4. Are R4→R6 breaking changes acceptable? What's the policy?
5. Should open issue notes be resolved or removed before normative ballot?
