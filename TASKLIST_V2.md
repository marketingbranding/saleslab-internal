# TASKLIST_V2.md

## Current Delivery Priority — Leadership Trial Fast Track

Completion date: `2026-07-14`

- `FT-001 Evidence Validator` — completed.
- `FT-002 Evaluation Context Builder` — completed.
- `FT-003 Backward-Compatible Evaluator API` — completed.
- `FT-004 Minimal Compliance Caps` — completed.
- `FT-005 Trial Report Integration` — next.
- `FT-006 Manual Trial QA` — pending.

## Epic 1 — Domain Foundation

### Feature 1.1 — Core SOS Types

#### Task D-001

- ID: `D-001`
- Objective: Define target TypeScript domain types for `Persona`, `Scenario`, `RoleplaySession`, `RoleplayState`, `NormalizedTurn`, `RoleplayEvent`, `EvaluationProfile`, `EvaluationResult`, and `EvaluationEvidence`.
- Affected files: new future files under `lib/sos/`; references from `lib/gemini.ts`, `components/admin/PersonaBuilder.tsx`, `components/admin/ScenarioBuilder.tsx`.
- Dependencies: none.
- Acceptance criteria: types represent fields from `docs/sos_kpr_roleplay/08_PERSONA_SCHEMA.md`, `09_SCENARIO_SCHEMA.md`, `11_EVALUATION_RUBRIC.md`, and `12_EVENT_AND_STATE_MODEL.md`.
- Tests: type-level compile check via `npx tsc --noEmit` after implementation.
- Migration impact: none if added as new types only.
- Status: completed.
- Implementation: Core SOS types are defined in `lib/sos/types.ts`.
- Verification: TypeScript compilation and SOS domain tests pass.
- Remaining: Runtime adoption outside the implemented voice/evaluation foundations is tracked separately.

#### Task D-002

- ID: `D-002`
- Objective: Design legacy mappers from current `SalesScenario` to target `Scenario` and fallback `Persona`.
- Affected files: `lib/gemini.ts`, future `lib/sos/legacy-mappers.ts`.
- Dependencies: `D-001`.
- Acceptance criteria: all current `SCENARIOS` fields map without data loss; missing SOS fields receive explicit defaults.
- Tests: mapper unit tests for all built-in `SCENARIOS`.
- Migration impact: keeps old Firestore scenarios usable.
- Status: completed.
- Implementation: `mapSalesScenario` and `mapLegacyPersona` provide current legacy fallback mapping.
- Verification: Legacy mapper tests pass, including identity, goals, persona scales, and hidden-rule isolation.
- Remaining: Broader persisted-data migration belongs to `M-002`.

## Epic 2 — Knowledge Engine

### Feature 2.1 — Structured Knowledge Sources

#### Task K-001

- ID: `K-001`
- Objective: Convert stable SOS/SPIN/HOME/FAB/objection/closing/rubric content into structured static knowledge slices without injecting whole Markdown files.
- Affected files: `docs/sos_kpr_roleplay/*`, future `lib/sos/knowledge/static.ts`.
- Dependencies: `D-001`.
- Acceptance criteria: every static slice has ID, title, category, version, content summary, and selection tags.
- Tests: static validation test ensures IDs and selection tags are present.
- Migration impact: none.
- Status: partially completed.
- Implementation: Small structured SOS, SPIN, HOME, and FAB entries exist in `lib/sos/knowledge.ts`.
- Verification: Static knowledge metadata tests pass.
- Remaining: Version metadata plus product, policy, regulation, objection, closing, and rubric content are not implemented.

### Feature 2.2 — Knowledge Selection

#### Task K-002

- ID: `K-002`
- Objective: Define deterministic selection rules using scenario stage, target skills, persona objections, state, product context, policy context, and regulation freshness.
- Affected files: future `lib/sos/knowledge-selector.ts`.
- Dependencies: `K-001`, `D-001`.
- Acceptance criteria: first-call, objection, closing, and after-sales examples select different knowledge sets.
- Tests: selector unit tests for scenario examples from `docs/sos_kpr_roleplay/09_SCENARIO_SCHEMA.md`.
- Migration impact: none.
- Status: completed.
- Implementation: Initial deterministic selector uses scenario, persona, and initial-state signals with capped results.
- Verification: Knowledge selector tests pass for targeting, ordering, dedupe, limits, and privacy-safe reasons.
- Remaining: Product, policy, regulation, and freshness selection is deferred.

## Epic 3 — Prompt Compiler

### Feature 3.1 — Prompt Variants

#### Task P-001

- ID: `P-001`
- Objective: Design compiler inputs and outputs for compact voice, standard text, evaluation, and admin preview prompt variants.
- Affected files: future `lib/sos/prompt-compiler.ts`, `components/CallInterface.tsx`, `lib/gemini.ts`, `app/api/analyze/route.ts`.
- Dependencies: `D-001`, `K-002`.
- Acceptance criteria: compiler sections match `ARCHITECTURE_V2.md` and include prompt version metadata.
- Tests: snapshot-style prompt tests after test runner exists.
- Migration impact: low; compiler can be introduced before runtime integration.
- Status: partially completed.
- Implementation: Shared voice and evaluation prompt functions exist; voice is integrated with Gemini Live.
- Verification: Prompt compiler and production build pass.
- Remaining: Text/admin variants, evaluation runtime integration, and prompt versioning are pending.

#### Task P-002

- ID: `P-002`
- Objective: Add prompt budget validation rules for voice/text/evaluation/admin preview variants.
- Affected files: future `lib/sos/prompt-budget.ts`.
- Dependencies: `P-001`.
- Acceptance criteria: oversized retrieved knowledge produces warnings and deterministic trimming order.
- Tests: unit tests for trimming missing/stale/oversized contexts.
- Migration impact: none.
- Status: partially completed.
- Implementation: Deterministic voice character budgeting and optional-knowledge trimming are implemented.
- Verification: Prompt budget tests pass for limits, warnings, dedupe, and required-context overflow.
- Remaining: Text, evaluation, and admin-preview budgeting are pending.

## Epic 4 — Transcript Normalization

### Feature 4.1 — Raw And Normalized Turns

#### Task T-001

- ID: `T-001`
- Objective: Define normalized transcript model with sequence, role, text, timestamp, source, finalized status, confidence, dedupe key, and raw refs.
- Affected files: `components/CallInterface.tsx`, `components/ChatInterface.tsx`, future `lib/sos/transcript-normalizer.ts`.
- Dependencies: `D-001`.
- Acceptance criteria: current `{ role, text }[]` transcripts can normalize into stable turns.
- Tests: unit tests for legacy transcript normalization.
- Migration impact: old sessions remain readable.
- Status: completed.
- Implementation: Voice turns use `NormalizedTurn`; legacy `{ role, text }[]` conversion remains compatible.
- Verification: Transcript normalization and conversion tests pass.
- Remaining: Text-roleplay integration is deferred.

#### Task T-002

- ID: `T-002`
- Objective: Design dedupe policy for Gemini Live `inputTranscription`, `modelTurn.parts`, `userTurn.parts`, and fallback extraction.
- Affected files: `components/CallInterface.tsx`, future `lib/sos/transcript-normalizer.ts`.
- Dependencies: `T-001`.
- Acceptance criteria: exact duplicates and near-duplicate provider chunks collapse without deleting legitimate repeated answers.
- Tests: unit tests using duplicated Gemini Live-like chunks.
- Migration impact: low; can initially run alongside current transcript array.
- Status: completed.
- Implementation: Current Gemini Live input/model/fallback paths use deterministic five-second deduplication.
- Verification: Exact, formatting, cross-source, role, and later-repetition tests pass.
- Remaining: Complex partial-turn merging is intentionally deferred.

## Epic 5 — Roleplay State Engine

### Feature 5.1 — Reducer

#### Task S-001

- ID: `S-001`
- Objective: Define deterministic `reduceRoleplayState(currentState, event)` behavior for trust, patience, readiness, pressure, qualification completeness, customer stage, objections, revealed info, buying signals, and compliance flags.
- Affected files: future `lib/sos/state-reducer.ts`, `lib/frustration-engine.ts`, `hooks/useFrustration.ts`.
- Dependencies: `D-001`.
- Acceptance criteria: reducer handles all event categories from `docs/sos_kpr_roleplay/12_EVENT_AND_STATE_MODEL.md`.
- Tests: reducer unit tests for trust increase/decrease, HOME coverage, closing, and compliance transitions.
- Migration impact: medium; existing frustration meter can be bridged later.
- Status: completed.
- Implementation: Deterministic event-driven roleplay reducer tracks stage, HOME, counters, trust/readiness, and compliance.
- Verification: State reducer tests pass for ordering, idempotency, monotonic stage, and bounded values.
- Remaining: Frustration synchronization and broader event coverage are deferred.

### Feature 5.2 — Initial State

#### Task S-002

- ID: `S-002`
- Objective: Define initial state derivation from persona, scenario stage, difficulty, urgency, and legacy fields.
- Affected files: future `lib/sos/initial-state.ts`, `lib/sos/legacy-mappers.ts`.
- Dependencies: `D-002`, `S-001`.
- Acceptance criteria: legacy `patience` 1-10 maps to 0-100 and persona trust defaults are explicit.
- Tests: unit tests for easy/medium/hard persona defaults.
- Migration impact: low.
- Status: completed.
- Implementation: Initial state derives from mapped persona/scenario scales, urgency, stage, and difficulty.
- Verification: Initial-state matrix, malformed input, legacy scale, and immutability tests pass.
- Remaining: Dynamic difficulty and frustration synchronization are deferred.

## Epic 6 — Hidden Information Engine

### Feature 6.1 — Reveal Rules

#### Task H-001

- ID: `H-001`
- Objective: Define hidden information reveal conditions, never-reveal conditions, trust thresholds, question triggers, event triggers, scenario overrides, and audit logs.
- Affected files: future `lib/sos/hidden-information.ts`, `components/admin/PersonaBuilder.tsx`.
- Dependencies: `D-001`, `S-001`.
- Acceptance criteria: hidden info is not included in trainee-visible data and becomes prompt-eligible only after valid triggers.
- Tests: unit tests for reveal, never-reveal, and trust-threshold scenarios.
- Migration impact: medium; persona admin data model expands.
- Status: partially completed.
- Implementation: Deterministic reveal eligibility, blocking, idempotency, and key-only state updates exist.
- Verification: Hidden-information engine tests pass for conditions, blocks, duplicate keys, and privacy.
- Remaining: Verbal delivery, admin configuration, audit persistence, and scenario overrides are pending.

## Epic 7 — Semantic Event System

### Feature 7.1 — Event Extraction

#### Task E-001

- ID: `E-001`
- Objective: Implement hybrid event strategy design: deterministic events first, post-turn/LLM events later, evaluator-only fallback.
- Affected files: future `lib/sos/event-extractor.ts`, `app/api/analyze/route.ts`, `components/CallInterface.tsx`.
- Dependencies: `T-001`, `S-001`.
- Acceptance criteria: customer speech and event JSON remain separate; invalid events are rejected before state changes.
- Tests: event validation tests for all event enum values.
- Migration impact: medium; new event persistence later.
- Status: partially completed.
- Implementation: Deterministic live event extraction and internal voice-flow integration exist.
- Verification: Event extraction tests pass for supported flow, HOME, objection, buying, and risk events.
- Remaining: LLM post-turn extraction, evaluator fallback, persistence, and complete enum coverage are deferred.

#### Task E-002

- ID: `E-002`
- Objective: Add deterministic detectors for guarantee language, document manipulation, pressure tactics, closing attempts, and basic HOME/SPIN signals.
- Affected files: future `lib/sos/deterministic-detectors.ts`.
- Dependencies: `E-001`.
- Acceptance criteria: prohibited phrases from `docs/sos_kpr_roleplay/05_OBJECTION_HANDLING.md` emit compliance events.
- Tests: detector unit tests with Indonesian examples.
- Migration impact: none until wired.
- Status: completed.
- Implementation: Current deterministic detector scope covers guarantee, manipulation, pressure, closing, HOME/SPIN, and related flow signals.
- Verification: Detector role, exclusion, dedupe, and multiple-event tests pass.
- Remaining: Additional detector categories should be added only with explicit evidence and tests.

## Epic 8 — Evaluation Engine

### Feature 8.1 — SOS Rubric Pipeline

#### Task V-001

- ID: `V-001`
- Objective: Design evaluator pipeline from normalized transcript to deterministic checks, event aggregation, LLM evidence review, weighted rubric, hard caps, and feedback.
- Affected files: `app/api/analyze/route.ts`, `components/FeedbackView.tsx`, future `lib/sos/evaluation/*`.
- Dependencies: `T-001`, `E-001`, `S-001`, `K-002`.
- Acceptance criteria: evaluator output includes SOS fields and current backward-compatible fields.
- Tests: golden transcript tests with expected hard caps and evidence references.
- Migration impact: high; affects feedback and score semantics.
- Status: partially completed.
- Implementation: Deterministic legacy reconstruction, context prompt, evidence normalization, backward-compatible response, leadership-trial score caps, and V2 diagnostics are implemented.
- Verification: Evaluator pipeline, score-adjustment tests, full SOS tests, lint, typecheck, and build pass on `2026-07-14`.
- Remaining: Full weighted scoring, final rubric-approved cap values, `FeedbackView` V2 rendering, persistence, and configurable evaluation profiles are pending.

#### Task V-002

- ID: `V-002`
- Objective: Define evidence schema requiring transcript turn sequence, observed behavior, reason, impact, and recommendation for every dimension score.
- Affected files: future `lib/sos/evaluation/evidence.ts`, `app/api/analyze/route.ts`.
- Dependencies: `V-001`.
- Acceptance criteria: scores without evidence are invalid or review-required.
- Tests: validation tests for missing/invalid evidence.
- Migration impact: medium.
- Status: completed.
- Implementation: Evidence normalization, dimension validation, turn grounding, deterministic IDs, and batch dedupe exist.
- Verification: Evaluation-evidence tests pass for canonical/snake-case inputs, references, duplicates, privacy, and determinism.
- Remaining: Production evaluator integration remains part of `FT-003`.

## Epic 9 — Compliance Engine

### Feature 9.1 — Compliance Flags And Hard Caps

#### Task C-001

- ID: `C-001`
- Objective: Define compliance flags and hard-cap rules for approval guarantees, illegal manipulation, fabricated regulation, omitted material costs, discrimination, no eligibility check, no need discovery, and aggressive early close.
- Affected files: future `lib/sos/compliance.ts`, `app/api/analyze/route.ts`.
- Dependencies: `E-002`, `V-001`.
- Acceptance criteria: max-score caps from `docs/sos_kpr_roleplay/11_EVALUATION_RUBRIC.md` are enforced after weighted scoring.
- Tests: unit tests for cap precedence and multiple violations.
- Migration impact: high; scores may be lower than current generic evaluator.
- Status: partially completed.
- Implementation: Leadership-trial deterministic score caps cover structured compliance events, closing before discovery, no meaningful discovery, strictest-cap precedence, and privacy-safe diagnostics.
- Verification: Score-adjustment and result-normalizer integration tests, lint, typecheck, build, and full SOS verification pass on `2026-07-14`.
- Remaining: Final rubric-approved values, fabricated-regulation detection beyond current events, weighted scoring, profile-driven eligibility/discovery rules, configurable evaluation profiles, and trainer/admin configuration are pending.

## Epic 10 — Persistence and Migration

### Feature 10.1 — Firestore V2 Design

#### Task M-001

- ID: `M-001`
- Objective: Prepare Firestore collection/subcollection design for personas, scenarios, product knowledge, policies, regulation references, evaluation profiles, prompt versions, sessions, turns, events, state snapshots, evidence, and evaluations.
- Affected files: `config/firestore.rules`, `firebase.json`, future persistence modules.
- Dependencies: `D-001`.
- Acceptance criteria: design preserves current `sessions` summary fields and avoids document-size risks.
- Tests: rules tests after rules harness exists.
- Migration impact: high, but design-only until Firebase phase.
- Status: pending.

#### Task M-002

- ID: `M-002`
- Objective: Define migration compatibility for existing `scenarios`, `personas`, and `sessions` documents.
- Affected files: future `lib/sos/legacy-mappers.ts`, `MissionHistory`, `PerformanceScreen`, `Dashboard` if needed.
- Dependencies: `D-002`, `T-001`.
- Acceptance criteria: old sessions can still render history/performance and be re-evaluated through normalization.
- Tests: fixtures for legacy session documents.
- Migration impact: medium.
- Status: pending.

## Epic 11 — Admin Configuration

### Feature 11.1 — Structured Content Editors

#### Task A-001

- ID: `A-001`
- Objective: Design admin UI extensions for structured persona, hidden info, objections, buying signals, scenario stage/goals, product knowledge, company policy, regulation references, scoring profiles, prompt preview, and test simulation.
- Affected files: `components/admin/PersonaBuilder.tsx`, `components/admin/ScenarioBuilder.tsx`, `components/admin/AISettings.tsx`, future admin components.
- Dependencies: `D-001`, `K-002`, `P-001`, `M-001`.
- Acceptance criteria: design reuses existing admin layout and preserves current create/edit flows.
- Tests: component tests after test runner exists.
- Migration impact: high for admin UX, low for trainee flow if phased.
- Status: pending.

## Epic 12 — Testing and Rollout

### Feature 12.1 — Test Infrastructure

#### Task R-001

- ID: `R-001`
- Objective: Add test runner strategy and scripts for domain modules before wiring runtime behavior.
- Affected files: `package.json`, future test config/files.
- Dependencies: owner approval for package/test tooling.
- Acceptance criteria: tests can run deterministically for mappers, selectors, compiler, reducer, hidden info, events, compliance, and evaluation validation.
- Tests: meta task; verified by running selected test command after implementation.
- Migration impact: none.
- Status: completed.
- Implementation: `tsx` and npm scripts execute all SOS TypeScript tests.
- Verification: `npm run test:sos` executes 141 tests successfully on `2026-07-14`.
- Remaining: CI integration is not configured.

### Feature 12.2 — Rollout Plan

#### Task R-002

- ID: `R-002`
- Objective: Define feature flags or phased enablement for prompt compiler, transcript V2, events/state, and SOS evaluator.
- Affected files: future settings/config modules, `components/admin/AISettings.tsx`, `app/page.tsx`.
- Dependencies: `P-001`, `T-001`, `S-001`, `V-001`.
- Acceptance criteria: current Gemini Live call remains available if V2 components fail or are disabled.
- Tests: manual rollback checklist and unit tests for config defaults.
- Migration impact: medium.
- Status: pending.
