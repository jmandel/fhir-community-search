# Data Types & Resource Enhancements

## Summary
This group contains 6 issues proposing enhancements to data types and specific resource elements. Topics include CodeableCanonical for canonical resources, DataRequirement.valueFilter types, ExtendedContactDetail status, Requirements.statement.category, Timing offset constraints, and bodyStructure harmonization. These are generally independent issues that can be discussed separately.

## Expertise Needed
- **Elliot Silver** (CodeableCanonical issue)
- **Daniel Schuster** (DataRequirement issue, Epic)
- **Mahesh Ravella** (ExtendedContactDetail issue, Epic)
- **Richard Ettema** (Requirements issue)
- **Hayden Bader** (Timing issue, Epic)
- **Anja Schwab** (bodyStructure harmonization)
- Orders & Observations WG (bodyStructure)
- Clinical Reasoning WG (DataRequirement)

## Issues in This Group

### All Issues (No Strong Interdependencies)

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-44665 | CodeableCanonical for canonical resources | Anchor | Device.definition needs code OR canonical; no datatype exists |
| FHIR-53984 | DataRequirement.valueFilter types | Satellite | Only has date types; description says "non-date" |
| FHIR-54010 | Add status to ExtendedContactDetail | Satellite | Currently only period indicates active/inactive |
| FHIR-54023 | Requirements.statement.category ValueSet | Satellite | Example binding but no example ValueSet defined |
| FHIR-54062 | Rework Timing offset constraints | Satellite | startOffset/endOffset math relationship unclear |
| FHIR-54703 | Harmonize Procedure/Observation bodyStructure | Anchor | Different datatypes, deprecation approaches between resources |

## Suggested Discussion Order
1. **FHIR-44665** - CodeableCanonical (design decision needed)
2. **FHIR-54703** - bodyStructure harmonization (cross-resource consistency)
3. **FHIR-53984** - DataRequirement.valueFilter (likely straightforward)
4. **FHIR-54062** - Timing offsets (may need clinical input)
5. **FHIR-54010** - ExtendedContactDetail status
6. **FHIR-54023** - Requirements.statement.category

## Cross-Theme Dependencies
- **Conformance Quarter**: FHIR-44665 relates to canonical resource patterns
- **Laboratory Quarter**: bodyStructure affects diagnostic reporting

## Key Decision Points
1. Should CodeableCanonical be created, or use choice types case-by-case?
2. Should DataRequirement.valueFilter add non-date types (Quantity, etc.)?
3. Should ExtendedContactDetail have explicit status vs relying on period?
4. What mathematical constraints should Timing offsets have?
5. Should Procedure follow Observation's bodyStructure pattern (deprecate bodySite)?
