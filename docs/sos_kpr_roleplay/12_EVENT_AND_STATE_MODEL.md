# Semantic Event and State Model

## Recommended Event Types

### SOS Events

- APPROACHING_STARTED
- RAPPORT_ESTABLISHED
- PROBING_STARTED
- SITUATION_DISCOVERED
- PROBLEM_DISCOVERED
- IMPLICATION_EXPLORED
- NEED_PAYOFF_EXPLORED
- SOLUTION_PRESENTED
- OBJECTION_RAISED
- OBJECTION_CLARIFIED
- OBJECTION_RESOLVED
- NEGOTIATION_STARTED
- CONCESSION_OFFERED
- CLOSING_ATTEMPTED
- NEXT_STEP_AGREED
- FOLLOW_UP_REQUIRED

### HOME Events

- HOUSING_INFO_DISCOVERED
- OCCUPATION_INFO_DISCOVERED
- MONEY_INFO_DISCOVERED
- ELIGIBILITY_INFO_DISCOVERED
- CRITICAL_INFO_MISSED

### Customer Events

- TRUST_INCREASED
- TRUST_DECREASED
- PATIENCE_DECREASED
- BUYING_SIGNAL_DETECTED
- CUSTOMER_CONFUSED
- CUSTOMER_WITHDREW
- HIDDEN_INFORMATION_REVEALED

### Compliance Events

- GUARANTEE_LANGUAGE
- UNVERIFIED_CLAIM
- DOCUMENT_MANIPULATION_SUGGESTED
- MATERIAL_COST_OMITTED
- PRESSURE_TACTIC
- PRIVACY_RISK
- DISCRIMINATORY_LANGUAGE

## Event Schema

```json
{
  "event_type": "OBJECTION_CLARIFIED",
  "severity": "LOW",
  "topic": "bank_rejection",
  "related_objection_key": "fear_bank_rejection",
  "hidden_information_key": null,
  "short_internal_reason": "Sales identified previous late payment as root cause",
  "source_turn_sequence": 18,
  "confidence": 0.88
}
```

## State Transition Example

```text
Inquiry
  ├─ qualification incomplete → remain Inquiry
  ├─ needs + eligibility partially known → Qualified
  ├─ survey agreed → Survey Scheduled
  └─ serious compliance violation → Customer Withdrawn
```

## Storage Recommendation

Store separately:

- raw transcript;
- normalized turns;
- events;
- roleplay state snapshots;
- evaluation evidence;
- final evaluation;
- prompt/version metadata.

This separation allows re-evaluation without replaying the live session.
