# TASKLIST.md

## Phase 1 Status

- [x] Read `SOS_KPR_Subsidi_AI_Training_Module.md`.
- [x] Read actual folder `docs/sos_kpr_roleplay/`.
- [x] Audit current framework, voice provider, persona model, scenario model, transcript storage, evaluation service, event schema, admin panel, test coverage, and prompt compiler.
- [x] Produce `SYSTEM_SPEC.md`, `TASKLIST.md`, and `PHASE_1_AUDIT_REPORT.md`.
- [ ] Phase 2 implementation has not started.

## Phase 2 — Data Model

- [ ] Define TypeScript SOS domain types without changing runtime behavior first: persona, hidden information, objection, buying signal, scenario goal, failure condition, roleplay state, roleplay event, evaluation profile, evaluation evidence, and evaluation result.
- [ ] Decide migration strategy for `lib/gemini.ts`, `SalesScenario`, because current scenarios embed persona fields instead of referencing a structured `persona_id`.
- [ ] Extend Firestore session shape to support raw transcript, normalized turns, semantic events, state snapshots, evaluation evidence, final evaluation, and prompt/version metadata.
- [ ] Add Firestore rules for any new collections or nested documents before writing to them.
- [ ] Keep `sessions` writes compatible with `config/firestore.rules`, which requires `userId == request.auth.uid` and numeric `score`.
- [ ] Add data validation helpers for scenario/persona IDs using the current rules regex `^[a-zA-Z0-9_\-]+$` and max length 128.

## Phase 3 — Prompt Compilation

- [ ] Create a prompt compiler module instead of continuing inline prompt strings in `lib/gemini.ts`, `getConsumerResponse`, and `components/CallInterface.tsx`, `startCall`.
- [ ] Compile roleplay prompts from structured sections: safety, persona facts, scenario objective, hidden information rules, current roleplay state, project knowledge, customer response policy, and event rules.
- [ ] Keep live voice prompt token usage small enough to preserve Gemini Live latency.
- [ ] Ensure customer speech is separate from semantic events; do not ask the customer voice response to speak JSON aloud.
- [ ] Add prompt version IDs so sessions can be re-evaluated later with known prompt context.

## Phase 4 — Live Runtime

- [ ] Add a roleplay state object for trust, patience, readiness, perceived relevance, pressure level, qualification completeness, objection status, customer stage, revealed information, unresolved concerns, buying signals, and compliance flags.
- [ ] Add turn sequence numbers to transcripts from `components/CallInterface.tsx`, `appendTranscript`, and any future active text flow.
- [ ] Add hidden information gating based on persona facts and sales questions.
- [ ] Add semantic event capture for SOS/HOME/customer/compliance events from `docs/sos_kpr_roleplay/12_EVENT_AND_STATE_MODEL.md`.
- [ ] Preserve existing reconnect and cleanup behavior in `components/CallInterface.tsx`, especially refs and `stopAudio`.
- [ ] Decide whether `components/ChatInterface.tsx` should be reconnected to the app shell or treated as inactive legacy UI.

## Phase 5 — Evaluation Pipeline

- [ ] Replace the generic `/api/analyze` prompt with an SOS evaluation prompt grounded in `docs/sos_kpr_roleplay/11_EVALUATION_RUBRIC.md`.
- [ ] Require dimension scores for Opening & Rapport, Prospect Qualification, SPIN Probing, HOME Coverage, FAB, Objection Handling, Negotiation, Closing & Next Step, and Accuracy & Compliance.
- [ ] Require evidence references for every dimension score; do not allow inferred behavior absent from transcript.
- [ ] Implement hard caps: max 59 for approval guarantees, illegal manipulation, fabricated regulation, hidden material costs, or discrimination; max 69 for no eligibility check, no customer need identification, or aggressive close before qualification.
- [ ] Keep backward-compatible fields currently rendered by `components/FeedbackView.tsx`: `overallScore`, `grade`, `summary`, `strengths`, `weaknesses`, `verdict`, `actionableTips`, `skillScores`, and `suggestedResponses`.
- [ ] Add new output fields: `customer_stage`, `qualification`, `buying_probability`, `missed_questions`, `unresolved_objections`, `compliance_flags`, `best_moment`, `critical_moment`, `recommended_next_step`, and `practice_assignment`.
- [ ] Persist final evaluation and evidence separately from raw transcript to support re-evaluation.

## Phase 6 — Admin Panel

- [ ] Update `components/admin/PersonaBuilder.tsx` from mostly free-text fields to structured SOS persona configuration.
- [ ] Add structured hidden information with reveal rules and never-reveal rules.
- [ ] Add structured objections, buying signals, and walk-away conditions.
- [ ] Update `components/admin/ScenarioBuilder.tsx` for scenario stage, sales goals, expected closing, forbidden closing, target skills, success conditions, failure conditions, evaluation profile, max duration, and persona link.
- [ ] Add product knowledge management for project/unit/price/installment/fees/promotion/stock/facilities/location/terms/document requirements/disclaimer/data freshness.
- [ ] Add company policy and regulation reference management with source and validity date.
- [ ] Add scoring weight configuration per evaluation profile.
- [ ] Add compiled prompt preview and test simulation affordances for admins.

## Phase 7 — Tests And Verification

- [ ] Add a test runner and scripts because `package.json` currently has no test script.
- [ ] Test hidden information not leaked early.
- [ ] Test hidden information revealed on valid trigger.
- [ ] Test persona consistency across turns.
- [ ] Test guarantee language and document manipulation detection.
- [ ] Test scoring hard caps.
- [ ] Test SPIN and HOME event extraction.
- [ ] Test scenario-specific expected closing.
- [ ] Test malformed AI/event output handling.
- [ ] Test evaluation evidence references point to actual transcript turns.
- [ ] Test stale or missing product/regulatory data behavior.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` after implementation changes.

## Open Decisions Before Phase 2

- [ ] Confirm whether new docs should continue using `docs/sos_kpr_roleplay/` or whether the folder should be renamed to the requested `docs/sos-kpr-roleplay/`.
- [ ] Decide whether Firestore should store SOS objects in existing collections or new collections such as `evaluationProfiles`, `productKnowledge`, `companyPolicies`, and `regulationReferences`.
- [ ] Decide whether OpenRouter API keys should remain stored in Firestore `settings/global`, because `components/admin/AISettings.tsx` currently saves `openRouterApiKey` there.
- [ ] Decide whether text roleplay is a product requirement for this app, because `ChatInterface` exists but the current user flow starts only `CallInterface`.
