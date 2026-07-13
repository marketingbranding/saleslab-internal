# PHASE 1 — Repository Audit & Gap Analysis

You are working inside the existing repository:

`marketingbranding/saleslab-internal`

This repository is an existing AI roleplay application for subsidized housing sales training.

Before making any code changes, you must audit the current implementation and compare it against the SOS KPR Subsidi AI Roleplay requirements located in:

`docs/sos-kpr-roleplay/`

## Primary Objective

Understand how the current application works, identify what already exists, identify what is missing, and produce an implementation plan that reuses the current architecture as much as possible.

Do not implement features in this phase.

Do not refactor code in this phase.

Do not create migrations in this phase.

Do not change prompts in this phase.

Your only responsibility is analysis and planning.

---

## Files That Must Be Read First

Read these files before inspecting implementation details:

1. `docs/sos-kpr-roleplay/00_README.md`
2. `docs/sos-kpr-roleplay/01_DOMAIN_MODEL.md`
3. `docs/sos-kpr-roleplay/02_SOS_FRAMEWORK.md`
4. `docs/sos-kpr-roleplay/03_SPIN_HOME_PROBING.md`
5. `docs/sos-kpr-roleplay/04_FAB_PRESENTATION.md`
6. `docs/sos-kpr-roleplay/05_OBJECTION_HANDLING.md`
7. `docs/sos-kpr-roleplay/06_NEGOTIATION.md`
8. `docs/sos-kpr-roleplay/07_CLOSING_AND_AFTER_SALES.md`
9. `docs/sos-kpr-roleplay/08_PERSONA_SCHEMA.md`
10. `docs/sos-kpr-roleplay/09_SCENARIO_SCHEMA.md`
11. `docs/sos-kpr-roleplay/10_ROLEPLAY_ENGINE_RULES.md`
12. `docs/sos-kpr-roleplay/11_EVALUATION_RUBRIC.md`
13. `docs/sos-kpr-roleplay/12_EVENT_AND_STATE_MODEL.md`
14. `docs/sos-kpr-roleplay/13_IMPLEMENTATION_PLAN.md`

After that, inspect the repository.

---

## Repository Areas That Must Be Audited

At minimum, inspect:

### Application Architecture

- Next.js application structure
- App Router routes
- API routes
- client-side and server-side responsibilities
- Firebase integration
- Firestore collections and document shapes
- authentication and authorization
- admin-only behavior

### Roleplay Runtime

- text roleplay flow
- voice roleplay flow
- Gemini Live connection
- OpenRouter integration
- Ollama integration
- scenario loading
- persona loading
- prompt construction
- first-speaker logic
- call lifecycle
- transcript capture
- interruption handling
- reconnect handling
- duplicate transcript prevention

### Scenario and Persona System

Inspect how the current system stores and uses:

- scenario identity
- persona identity
- consumer profile
- difficulty
- aggressiveness
- patience
- response style
- target
- hidden rules
- success criteria
- opening message
- status
- XP or scoring metadata

Determine whether persona and scenario are currently mixed into one structure.

### Evaluation System

Inspect:

- `app/api/analyze/route.ts`
- client-side evaluation calls
- evaluator prompt
- JSON schema
- score normalization
- fallback providers
- error handling
- evaluation persistence
- evidence generation
- UI rendering of feedback

### Admin Panel

Inspect whether admin can manage:

- scenarios
- personas
- hidden information
- objections
- scoring weights
- product knowledge
- company policies
- regulatory references
- evaluation profiles
- prompt previews
- session results

### Existing Semantic Events

Inspect whether the application already supports:

- roleplay events
- tool/function declarations
- event storage
- event validation
- event-to-score mapping
- hidden-information reveal events
- compliance events
- customer-state updates

### Tests

Inspect:

- test framework
- unit tests
- integration tests
- API tests
- Firebase tests
- prompt compiler tests
- live roleplay tests
- evaluation tests

---

## Questions the Audit Must Answer

### Current State

1. What is the current architecture?
2. Which files control text roleplay?
3. Which files control voice roleplay?
4. Which files build system instructions?
5. How are scenarios stored?
6. How are personas represented?
7. How are transcripts stored and normalized?
8. How are evaluations generated?
9. How are results stored?
10. What can already be configured from the admin panel?

### SOS Compatibility

11. Which SOS stages are already represented?
12. Is SPIN currently represented explicitly or only implicitly?
13. Is HOME qualification supported?
14. Is FAB presentation evaluated?
15. Are objections structured or only free text?
16. Does the system track trust, patience, readiness, and qualification?
17. Does hidden information have structured reveal rules?
18. Are buying signals detected?
19. Is closing evaluated based on customer stage?
20. Are compliance violations detected?

### Technical Gaps

21. What should be reused?
22. What should be extended?
23. What should be replaced?
24. What new models or types are needed?
25. What Firestore changes are needed?
26. What prompt compiler changes are needed?
27. What evaluation schema changes are needed?
28. What admin UI changes are needed?
29. What tests are missing?
30. What migration risks exist?

---

## Required Deliverables

Create or update the following files in the project root:

### 1. `SYSTEM_SPEC.md`

This document must include:

#### A. Existing Architecture

Describe the current application using concrete repository paths and symbols.

#### B. Current Roleplay Flow

Document:

`Scenario selection → Roleplay start → AI provider → Transcript → Evaluation → Result storage → Feedback UI`

#### C. Existing Data Model

Document all relevant TypeScript interfaces, Firestore collections, settings, session data, scenario data, and analysis results.

#### D. Gap Analysis

For each requirement in the SOS module, classify it as:

- already implemented;
- partially implemented;
- missing;
- conflicting with current design;
- unclear.

Use a table with these columns:

| Requirement | Current Implementation | Status | Relevant Files | Recommended Change |

#### E. Proposed Target Architecture

Propose a compatible architecture for:

- persona;
- scenario;
- roleplay state;
- hidden information;
- objections;
- semantic events;
- transcript normalization;
- product knowledge;
- company policy;
- regulatory references;
- evaluation rubric;
- compliance checker.

#### F. Data Migration Strategy

Explain how existing scenarios and sessions can continue working.

#### G. Prompt Strategy

Explain how one instruction compiler can support both:

- text roleplay;
- Gemini Live voice roleplay.

#### H. Evaluation Strategy

Explain how to move from general LLM scoring to evidence-based SOS scoring.

#### I. Risks

Include:

- voice latency;
- prompt size;
- duplicate transcripts;
- provider inconsistencies;
- stale regulatory data;
- Firestore compatibility;
- backward compatibility;
- evaluation reliability.

#### J. Open Questions

Only include questions that cannot be answered from the repository.

Do not ask questions whose answers are already available in the codebase.

---

### 2. `TASKLIST.md`

Create an incremental implementation task list.

Each task must include:

- task ID;
- objective;
- affected files;
- dependencies;
- acceptance criteria;
- required tests;
- status.

Use this format:

```md
## TASK-001 — Example Task

**Objective**

...

**Affected Files**

- ...

**Dependencies**

- None

**Acceptance Criteria**

- [ ] ...
- [ ] ...

**Tests**

- [ ] ...

**Status**

Pending
```

The task order must follow this sequence:

1. type and schema foundation;
2. backward-compatible scenario migration;
3. instruction compiler;
4. transcript normalization;
5. roleplay state;
6. hidden information;
7. semantic events;
8. SOS/SPIN/HOME evaluation;
9. compliance rules;
10. admin configuration;
11. migration tools;
12. testing and rollout.

Do not create tasks that duplicate features already present.

---

### 3. `PHASE_1_AUDIT_REPORT.md`

Create a concise executive audit containing:

- what already works;
- critical gaps;
- highest-risk areas;
- recommended first implementation task;
- implementation order;
- items that should not be changed yet.

---

## Important Constraints

- Do not make code changes.
- Do not install packages.
- Do not modify Firebase.
- Do not change environment variables.
- Do not change API models.
- Do not rewrite `CallInterface` yet.
- Do not replace Gemini Live.
- Do not remove OpenRouter, Ollama, Groq, or Gemini fallbacks.
- Do not hardcode government regulation values.
- Do not assume current README documentation is fully accurate; verify against code.
- Separate confirmed findings from assumptions.
- Reference concrete file paths, functions, interfaces, and components.
- Preserve backward compatibility in every recommendation.

## Completion Condition

Phase 1 is complete only when these files exist and are internally consistent:

- `SYSTEM_SPEC.md`
- `TASKLIST.md`
- `PHASE_1_AUDIT_REPORT.md`

After producing them, stop and wait for review.

Do not begin Phase 2.
