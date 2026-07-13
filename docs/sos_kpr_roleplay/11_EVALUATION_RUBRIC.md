# AI Evaluation Rubric

## Weighted Score

| Dimension | Weight |
|---|---:|
| Opening & Rapport | 10 |
| Prospect Qualification | 15 |
| SPIN Probing | 15 |
| HOME Coverage | 10 |
| Solution Presentation / FAB | 15 |
| Objection Handling | 10 |
| Negotiation | 5 |
| Closing & Next Step | 10 |
| Accuracy & Compliance | 10 |
| Total | 100 |

Weights may be adjusted per scenario.

## Evidence-Based Scoring

Every score must include:

- evidence turn;
- behavior observed;
- reason;
- impact;
- recommended improvement.

The evaluator may not infer a behavior that is not present in transcript.

## Score Bands

- 90–100: Excellent
- 80–89: Strong
- 70–79: Competent
- 60–69: Needs Improvement
- below 60: Not Ready

## Hard Caps

Maximum total score becomes 59 if sales:

- guarantees approval;
- recommends illegal manipulation;
- fabricates regulation;
- hides material costs;
- discriminates against customer.

Maximum total score becomes 69 if sales:

- never checks eligibility;
- never identifies customer need;
- closes aggressively before qualification.

## Dimension Definitions

### Opening & Rapport

Evaluate:

- clear introduction;
- permission;
- relevance;
- tone;
- active listening.

### Prospect Qualification

Evaluate:

- need;
- willingness;
- capability;
- decision process;
- urgency.

### SPIN

Evaluate use and quality of:

- Situation;
- Problem;
- Implication;
- Need-Payoff.

### HOME

Evaluate coverage of:

- Housing;
- Occupation;
- Money;
- Eligibility.

### FAB

Evaluate:

- factual feature;
- real advantage;
- customer-specific benefit;
- confirmation.

### Objection

Evaluate:

- listening;
- acknowledgement;
- clarification;
- root cause;
- accurate response;
- confirmation.

### Negotiation

Evaluate:

- boundaries;
- exchange;
- transparency;
- no unauthorized promises.

### Closing

Evaluate:

- buying signal recognition;
- stage-appropriate ask;
- explicit next step;
- responsibility;
- timing.

### Compliance

Evaluate:

- factual accuracy;
- disclaimer;
- no guarantees;
- privacy;
- ethical conduct.

## Required Evaluation Output

```json
{
  "overall_score": 78,
  "rating": "Competent",
  "customer_stage": "inquiry",
  "qualification": "warm",
  "buying_probability": 55,
  "dimension_scores": {},
  "strengths": [],
  "priority_improvements": [],
  "missed_questions": [],
  "unresolved_objections": [],
  "compliance_flags": [],
  "best_moment": {},
  "critical_moment": {},
  "recommended_next_step": "",
  "practice_assignment": ""
}
```
