# Scenario Schema

## Required Fields

```json
{
  "scenario_name": "Inquiry from Informal Worker",
  "stage": "inquiry",
  "channel": "voice",
  "persona_id": "rina-online-seller",
  "sales_goals": [
    "build rapport",
    "discover HOME data",
    "identify primary objection",
    "agree on next step"
  ],
  "expected_closing": "document_precheck_or_survey",
  "forbidden_closing": "force_booking",
  "target_skills": [
    "approaching",
    "SPIN",
    "HOME",
    "objection_handling"
  ],
  "initial_customer_message": "Saya lihat iklannya, tapi saya jualan online. Bisa ambil rumah subsidi?",
  "customer_starts_first": true,
  "difficulty": "medium",
  "max_duration_minutes": 10,
  "success_conditions": [],
  "failure_conditions": [],
  "evaluation_profile": "default_sos_kpr"
}
```

## Success Conditions Example

- sales obtains at least 70% of relevant HOME fields;
- sales identifies the real fear;
- sales avoids guarantee language;
- sales agrees on a realistic next step;
- customer trust increases.

## Failure Conditions Example

- sales suggests falsifying documents;
- sales guarantees approval;
- sales repeatedly interrupts;
- sales forces booking before qualification;
- sales gives incorrect product facts;
- customer ends conversation.

## Scenario Stages

- prospecting;
- first call;
- inquiry;
- survey invitation;
- post-survey;
- objection handling;
- document collection;
- follow-up;
- booking decision;
- bank process update;
- closing;
- after-sales.

## Dynamic Scenario Events

The engine may trigger:

- new objection;
- loss of patience;
- spouse intervention;
- request for proof;
- price comparison;
- policy question;
- buying signal;
- compliance trap;
- request to postpone.
