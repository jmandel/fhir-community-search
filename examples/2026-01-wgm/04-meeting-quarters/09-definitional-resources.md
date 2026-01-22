# Definitional Resources (ActorDefinition & ExampleScenario)

## Summary
This group contains 3 issues addressing ActorDefinition and ExampleScenario resources. Topics include adding OperationDefinition references to ExampleScenario, adding profile references to ActorDefinition, and reducing overlap between ExampleScenario.actor and ActorDefinition. These resources are relatively new and their design is still being refined.

## Expertise Needed
- **Anja Schwab** (Reporter of ExampleScenario and ActorDefinition issues)
- **Bas van den Heuvel** (Reporter of actor overlap issue)
- IGs using ExampleScenario (IPA, AU, etc.)
- Workflow pattern experts

## Issues in This Group

### All Issues
**Interdependency:** FHIR-54748 proposes removing ExampleScenario.actor in favor of ActorDefinition references, which affects FHIR-54694's proposal to add OperationDefinition to ExampleScenario.

| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| FHIR-54748 | ExampleScenario.actor overlaps with ActorDefinition | Anchor | Proposes removing actor backbone, requiring ActorDefinition |
| FHIR-54694 | Add OperationDefinition reference to ExampleScenario | Satellite | Follows actor.definition pattern for operations |
| FHIR-54704 | ActorDefinition profile reference | Satellite | Allow ActorDefinition to reference identifying profiles |

## Suggested Discussion Order
1. **FHIR-54748** - Decide on ExampleScenario.actor structure first
2. **FHIR-54694** - OperationDefinition reference (depends on overall direction)
3. **FHIR-54704** - ActorDefinition profile reference (independent)

## Cross-Theme Dependencies
- **Conformance Quarter**: ActorDefinition relates to conformance resources

## Key Decision Points
1. Should ExampleScenario.actor backbone be removed in favor of required ActorDefinition?
2. Should ExampleScenario.process.step.operation reference OperationDefinition?
3. Should ActorDefinition reference profiles that identify actor instances?
