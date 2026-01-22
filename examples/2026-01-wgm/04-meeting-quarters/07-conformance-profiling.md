# Conformance & Profiling

## Summary
This group contains 5 issues addressing conformance resources, profiling mechanisms, and vocabulary bindings. Topics include ElementDefinition interpretation for logical models, ImplementationGuide abstract flag, CanonicalResource search parameter consistency, CapabilityStatement cleanup, and a systematic review of binding strengths across resources.

## Expertise Needed
- **Lloyd McKenzie** (Reporter of ElementDefinition issue, HL7 CTO)
- **Cooper Thompson** (Reporter of IG abstract flag, Epic)
- **Gay Dolin** (Reporter of binding review, US Core)
- **Hayden Bader** (Reporter of CapabilityStatement issue, Epic)
- Terminology Infrastructure representatives
- US Core and international IG authors

## Issues in This Group

### ElementDefinition & Logical Models
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-51091](../03-meeting-analyses/FHIR-51091.md) | ElementDefinition contexts table incomplete | Anchor | Logical models need own column; minValue/maxValue prohibited incorrectly |

### ImplementationGuide
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53684](../03-meeting-analyses/FHIR-53684.md) | Add "abstract" flag to ImplementationGuide | Satellite | IGs as building blocks vs direct implementation |

### CanonicalResource Consistency
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53850](../03-meeting-analyses/FHIR-53850.md) | CanonicalResource search parameters inconsistent | Anchor | Interface says "all" but many resources missing params |

### CapabilityStatement
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-54057](../03-meeting-analyses/FHIR-54057.md) | Clean up conditional* elements | Satellite | Redundant with new interaction codes |

### Vocabulary Bindings
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-54613](../03-meeting-analyses/FHIR-54613.md) | Review Required/Extensible bindings | Anchor | Systematic review requested; US Core/international impact |

## Suggested Discussion Order
1. **[FHIR-51091](../03-meeting-analyses/FHIR-51091.md)** - ElementDefinition table (Lloyd to draft additions)
2. **[FHIR-53850](../03-meeting-analyses/FHIR-53850.md)** - CanonicalResource search params (may need cross-WG)
3. **[FHIR-54613](../03-meeting-analyses/FHIR-54613.md)** - Binding review (may need dedicated sub-group)
4. **[FHIR-54057](../03-meeting-analyses/FHIR-54057.md)** - CapabilityStatement cleanup (straightforward)
5. **[FHIR-53684](../03-meeting-analyses/FHIR-53684.md)** - IG abstract flag (design discussion)

## Cross-Theme Dependencies
- **Search Quarter**: CanonicalResource search params relate to search semantics
- **R6 Normative Readiness**: ElementDefinition page is normative

## Key Decision Points
1. Should logical models have their own column in ElementDefinition interpretation table?
2. Should all CanonicalResource interface search parameters be added to all implementing resources?
3. Should CapabilityStatement conditional* booleans be deprecated?
4. Is there bandwidth for systematic binding strength review before R6?
5. Is ImplementationGuide.abstract needed, or is naming convention sufficient?
