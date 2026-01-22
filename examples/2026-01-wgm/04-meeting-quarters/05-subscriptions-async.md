# Subscriptions & Async Patterns

## Summary
This group contains 4 issues addressing SubscriptionTopic design and async operation patterns. The subscription issues focus on improving SubscriptionTopic expressiveness (multiple events, required filters) and cleaning up redundancy. The async issue addresses confusing behavior when servers support multiple async patterns.

## Expertise Needed
- **James Jahns** (Reporter of subscription and async issues)
- **Gino Canessa** (Subscriptions expert, author of backport IG)
- **Josh Mandel** (Async pattern simplification proposal author)
- Da Vinci IG representatives (heavy subscription users)
- Bulk Data IG team

## Issues in This Group

### SubscriptionTopic Enhancements
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-54046](../03-meeting-analyses/FHIR-54046.md) | SubscriptionTopic.trigger.event should be 0..* | Anchor | ADT use case - multiple events share same config |
| [FHIR-54049](../03-meeting-analyses/FHIR-54049.md) | SubscriptionTopic cannot indicate required filters/payload | Anchor | Servers need to communicate mandatory constraints |
| [FHIR-54070](../03-meeting-analyses/FHIR-54070.md) | Subscription.filterBy.comparator seems redundant | Satellite | Comparator can be in value; OR logic limitation |

### Async Patterns
| Issue | Summary | Anchor/Satellite | Notes |
|-------|---------|------------------|-------|
| [FHIR-50598](../03-meeting-analyses/FHIR-50598.md) | _outputFormat handling depends on server support | Anchor | Silent breaking change when servers add capabilities |

## Suggested Discussion Order
1. **[FHIR-54046](../03-meeting-analyses/FHIR-54046.md)** - Event cardinality (straightforward enhancement)
2. **[FHIR-54049](../03-meeting-analyses/FHIR-54049.md)** - Required filters/payload (important for IGs)
3. **[FHIR-54070](../03-meeting-analyses/FHIR-54070.md)** - Comparator redundancy (may be quick)
4. **[FHIR-50598](../03-meeting-analyses/FHIR-50598.md)** - Async _outputFormat (may need broader async discussion)

## Cross-Theme Dependencies
- **Bundle Quarter**: Async patterns relate to Bundle.response ([FHIR-54003](../03-meeting-analyses/FHIR-54003.md))
- **Search Quarter**: Subscription filtering uses search semantics

## Key Decision Points
1. Should SubscriptionTopic.trigger.event be 0..* for multi-event triggers?
2. Should canFilterBy have a `required` flag? Where should payload restrictions live?
3. Should filterBy.comparator be removed/deprecated in favor of value prefixes?
4. Should _outputFormat be removed from async pattern disambiguation?
