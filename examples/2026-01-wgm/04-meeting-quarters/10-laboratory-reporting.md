# Laboratory Reporting & Observation Grouping

## Summary
This group contains 2 issues addressing how laboratory panels should be represented in FHIR. The core debate is whether to use Observation as a grouper (with hasMember), DiagnosticReport for panels, or List as a new grouping mechanism. This is a long-standing discussion with significant implications for laboratory IGs.

## Expertise Needed
- **Kathy Walsh** (Reporter of grouping issue)
- **Robert Hausam** (Reporter of List status issue, laboratory expert)
- **Hans Buitendijk** (O&O workgroup)
- **Andrea Pitkus** (Laboratory informatics, CLIA expertise)
- **Riki Merrick** (O&O workgroup)
- Orders & Observations WG representatives
- Laboratory IG authors (IHE LAB, EU Lab Report)

## Issues in This Group

### Observation Grouping
**Interdependency:** Both issues relate to using List as a grouper mechanism.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54897 | Grouping laboratory results | Anchor | Prefers DiagnosticReport for panels; suggests Panel resource or grouper |
| FHIR-55020 | Add status values to List for observation grouping | Satellite | Companion to FHIR-55019; List needs clinical status values |

## Suggested Discussion Order
1. **FHIR-54897** - Overall panel representation approach
2. **FHIR-55020** - List enhancements (if List approach is chosen)

## Cross-Theme Dependencies
- **Bundle/Documents Quarter**: FHIR-55368 (DiagnosticReport as document) relates to lab reporting
- **Data Types Quarter**: FHIR-54703 (bodyStructure) affects Observation/DiagnosticReport
- **O&O Workgroup**: FHIR-54562 (Observation.organizer) and FHIR-55019 (List as result choice) are related

## Key Decision Points
1. Should panels be represented as DiagnosticReport, Observation grouper, or List?
2. If List is used for clinical grouping, what status values are needed?
3. Should a new Panel resource be created? (Likely not preferred)
4. Should Observation have an explicit organizer/grouper indicator?

## Note
This is primarily an Orders & Observations WG issue. FHIR-I involvement may be limited to List resource changes (FHIR-55020) if that approach is chosen.
