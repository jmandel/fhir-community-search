# Bundle, Documents & Signatures

## Summary
This group contains 6 issues addressing Bundle structure, FHIR document architecture, and digital signatures. Key topics include allowing extensions on Bundle, enabling DiagnosticReport as a document base, and implementing the signature page improvements. These issues are particularly relevant for European implementations and clinical document exchange.

## Expertise Needed
- **Bas van den Heuvel** (Reporter of signature and document issues, Philips)
- **Cooper Thompson** (Reporter of Bundle extension issue, Epic)
- **Rob Hausam** (Laboratory document architecture)
- Security workgroup representatives (signature issues)
- EU Laboratory Report IG authors (Jose Costa-Teixeira, Giorgio Cangioli)
- IHE representatives (for IDR profile alignment)

## Issues in This Group

### Bundle Structure
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-51623](../03-meeting-analyses/FHIR-51623.md) | Allow extensions on Bundle root | Anchor | Currently prohibited by design; workarounds exist |
| [FHIR-54003](../03-meeting-analyses/FHIR-54003.md) | Add elements to Bundle.request/response | Satellite | Missing Content-Location for async, custom headers |

### Document Architecture
**Interdependency:** [FHIR-54511](../03-meeting-analyses/FHIR-54511.md) and [FHIR-55368](../03-meeting-analyses/FHIR-55368.md) both address DiagnosticReport as document base; should be discussed together.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-55368](../03-meeting-analyses/FHIR-55368.md) | Align DiagnosticReport and Composition for documents | Anchor | Proposes DiagnosticReport as document base |
| [FHIR-54511](../03-meeting-analyses/FHIR-54511.md) | Documents Bundle should allow DiagnosticReport | Satellite | IHE IDR profile use case |

### Signatures
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53810](../03-meeting-analyses/FHIR-53810.md) | R6 should address signature comments | Anchor | Meta-issue tracking 11 signature tickets ([FHIR-52810](../03-meeting-analyses/FHIR-52810.md)-52820) |

### Narrative Linking
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-53999](../03-meeting-analyses/FHIR-53999.md) | href should not reference FHIR resources in narratives | Satellite | Inconsistent guidance; textLink extension exists |

## Suggested Discussion Order
1. **[FHIR-51623](../03-meeting-analyses/FHIR-51623.md)** - Bundle extensions: fundamental architectural decision
2. **[FHIR-55368](../03-meeting-analyses/FHIR-55368.md) + [FHIR-54511](../03-meeting-analyses/FHIR-54511.md)** - DiagnosticReport as document base (discuss together)
3. **[FHIR-53810](../03-meeting-analyses/FHIR-53810.md)** - Signature implementation status (review all 11 sub-tickets)
4. **[FHIR-54003](../03-meeting-analyses/FHIR-54003.md)** - Bundle.request/response elements
5. **[FHIR-53999](../03-meeting-analyses/FHIR-53999.md)** - Narrative href guidance

## Cross-Theme Dependencies
- **Laboratory Reporting Quarter**: Document architecture affects lab report IGs
- **R6 Normative Readiness**: Bundle is normative; changes need careful handling
- **Signatures**: May need Security WG coordination

## Key Decision Points
1. Should Bundle allow root-level extensions? (Reverses intentional design)
2. Should DiagnosticReport be allowed as document Bundle base?
3. Are the 11 signature tickets implemented? Why are resolved tickets not in ballot?
4. Should href in narratives be discouraged for FHIR resource references?
