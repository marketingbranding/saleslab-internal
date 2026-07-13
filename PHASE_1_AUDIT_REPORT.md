# PHASE_1_AUDIT_REPORT.md

## Summary

Phase 1 audited the actual Next.js/Firebase app against the SOS KPR Subsidi requirements. No code or package changes were made.

The current app supports AI voice roleplay, basic scenario/persona admin, transcript persistence, and generic AI evaluation. It does not yet support structured SOS state, hidden information gating, semantic events, evidence-backed weighted scoring, configurable product/SOP/regulation knowledge, or tests.

## Inputs Reviewed

- `SOS_KPR_Subsidi_AI_Training_Module.md`
- `docs/sos_kpr_roleplay/00_README.md`
- `docs/sos_kpr_roleplay/01_DOMAIN_MODEL.md`
- `docs/sos_kpr_roleplay/02_SOS_FRAMEWORK.md`
- `docs/sos_kpr_roleplay/03_SPIN_HOME_PROBING.md`
- `docs/sos_kpr_roleplay/04_FAB_PRESENTATION.md`
- `docs/sos_kpr_roleplay/05_OBJECTION_HANDLING.md`
- `docs/sos_kpr_roleplay/06_NEGOTIATION.md`
- `docs/sos_kpr_roleplay/07_CLOSING_AND_AFTER_SALES.md`
- `docs/sos_kpr_roleplay/08_PERSONA_SCHEMA.md`
- `docs/sos_kpr_roleplay/09_SCENARIO_SCHEMA.md`
- `docs/sos_kpr_roleplay/10_ROLEPLAY_ENGINE_RULES.md`
- `docs/sos_kpr_roleplay/11_EVALUATION_RUBRIC.md`
- `docs/sos_kpr_roleplay/12_EVENT_AND_STATE_MODEL.md`
- `docs/sos_kpr_roleplay/13_IMPLEMENTATION_PLAN.md`
- `docs/sos_kpr_roleplay/14_AGENT_PROMPT.md`
- `docs/sos_kpr_roleplay/manifest.json`

Note: the user-specified path `docs/sos-kpr-roleplay/` does not exist; the repository contains `docs/sos_kpr_roleplay/`.

## Current Architecture Findings

- Framework: `package.json` uses Next.js, React, TypeScript, Firebase, Motion, and Tailwind; scripts are `dev`, `build`, `start`, `lint`, and `clean`.
- App layout: `app/layout.tsx`, `RootLayout`, wraps children in `AuthProvider` from `lib/AuthContext.tsx`.
- App shell: `app/page.tsx`, `Home`, owns navigation state through `type Step` and renders scenario selection, briefing, roleplay, report, admin, history, performance, achievements, profile, and settings screens.
- Active roleplay: `app/page.tsx`, `Home`, renders `CallInterface` at `step === 'roleplay'`.
- Report flow: `app/page.tsx`, `handleFinishRoleplay`, sets `transcript` then transitions to `report`, where `FeedbackView` is rendered.
- API routes: only `app/api/analyze/route.ts` was found under `app/api/`.

## Live Voice Provider Findings

- Component: `components/CallInterface.tsx`, `CallInterface`.
- Function: `startCall` connects to Gemini Live through `ai.live.connect`.
- Model: `gemini-3.1-flash-live-preview`.
- API key: `lib/gemini.ts`, `getGenAI`, reads `process.env.NEXT_PUBLIC_GEMINI_API_KEY`.
- Audio input: `navigator.mediaDevices.getUserMedia`, `AudioContext({ sampleRate: 16000 })`, `createScriptProcessor`, `floatTo16BitPCM`, `int16ArrayToBase64`.
- Audio output: `Modality.AUDIO`, output `AudioContext({ sampleRate: 24000 })`.
- Voice selection: `CallInterface.startCall` chooses `Zephyr` for `scenario.gender === 'Wanita'`, otherwise `Charon`.
- Current voice prompt: inline `systemInstruction` in `CallInterface.startCall`, using `scenario.name`, `scenario.consumerProfile`, `scenario.aggressiveness`, `scenario.patience`, `scenario.responseStyle`, and `scenario.target`.

Gap: the voice prompt does not include SOS, SPIN, HOME, FAB, hidden information rules, state variables, semantic event rules, compliance rules, or project/regulatory grounding.

## Text Provider Findings

- Component exists: `components/ChatInterface.tsx`, `ChatInterface`.
- Response function: `lib/gemini.ts`, `getConsumerResponse`.
- Provider routing: `getConsumerResponse` checks Firestore settings via `getSettings`; OpenRouter is used when configured, otherwise Ollama is used for text mode.
- Inactive route: `app/page.tsx` imports no `ChatInterface` and never renders it in the active `Step` state machine.

Gap: text roleplay is implemented as a component but not exposed through current navigation. The `gemini` provider selection does not currently make text mode call Gemini.

## Persona Model Findings

- Interface: `components/admin/PersonaBuilder.tsx`, `PersonaData`.
- Admin UI: `components/admin/PersonaList.tsx` opens `PersonaBuilder`, supports create/edit/duplicate/delete through callbacks.
- Persistence: `app/page.tsx`, `handleAdminSavePersona`, writes to Firestore `personas/{personaId}`.
- Fetch: `app/page.tsx`, `Home`, subscribes to `collection(db, 'personas')`.

Current persona model supports many free-text and numeric fields but lacks structured SOS fields from `docs/sos_kpr_roleplay/08_PERSONA_SCHEMA.md`:

- no `age_range`, `employment_type`, `marital_status`, `housing_status`, `primary_goal`, `primary_fear`, or `decision_authority` fields;
- no structured `hidden_information` objects with `reveal_when` and `never_reveal_when`;
- no structured `objections`, `buying_signals`, or `walk_away_conditions`;
- no 0-100 `skepticism`, `financial_literacy`, `subsidy_knowledge`, `urgency`, or `trust_start` fields.

## Scenario Model Findings

- Interface: `lib/gemini.ts`, `SalesScenario`.
- Built-ins: `lib/gemini.ts`, `SCENARIOS`, currently contains KPR-related scenarios like BI checking, DP objection, location, and building quality.
- Admin UI: `components/admin/ScenarioList.tsx` and `components/admin/ScenarioBuilder.tsx`.
- Persistence: `app/page.tsx`, `handleCreateScenario` and `handleAdminSaveScenario`, write to Firestore `scenarios/{scenarioId}`.
- Fetch and merge: `app/page.tsx`, `allScenarios`, merges `SCENARIOS` with Firestore scenarios and filters archived scenarios.

Current scenario model is scenario-plus-embedded-persona. It lacks structured fields from `docs/sos_kpr_roleplay/09_SCENARIO_SCHEMA.md`:

- no `stage`, `channel`, `persona_id`, `sales_goals`, `expected_closing`, `forbidden_closing`, `target_skills`, `max_duration_minutes`, `failure_conditions`, or `evaluation_profile`;
- no dynamic scenario events like spouse intervention, request for proof, policy question, buying signal, or compliance trap.

## Transcript Storage Findings

- Live transcript generation: `components/CallInterface.tsx`, `appendTranscript`, appends `{ role, text }` to local React state and `transcriptRef`.
- User transcript source: `CallInterface.onmessage` uses Gemini Live `inputTranscription`, `userTurn.parts`, and fallback text extraction.
- Model transcript source: `CallInterface.onmessage` uses `modelTurn.parts` and fallback text extraction.
- Report persistence: `components/FeedbackView.tsx`, `saveSessionState`, writes `transcript` to `sessions/{sessionId}`.
- Session ID: `FeedbackView.ensureSessionId` creates `session_${Date.now()}`.

Gap: transcript turns have no sequence number, timestamp, channel, confidence, audio metadata, state snapshot, semantic event IDs, or prompt version metadata.

## Evaluation Service Findings

- Entry point: `components/FeedbackView.tsx`, `runAnalysis`, calls `analyzePerformance(scenario, transcript)`.
- Client function: `lib/gemini.ts`, `analyzePerformance`, posts to `/api/analyze` when running in browser.
- API route: `app/api/analyze/route.ts`, `POST`.
- Prompt: `app/api/analyze/route.ts`, `prompt`, asks for general Indonesian sales analysis and a JSON object.
- Normalizer: `app/api/analyze/route.ts`, `normalizeAnalysis`, maps model output into current UI fields.
- Providers: Groq `llama-3.1-8b-instant` when `GROQ_API_KEY` exists; otherwise Gemini `gemini-2.0-flash` through `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY`.

Current output fields:

- `overallScore`, `grade`, `summary`, `strengths`, `weaknesses`, `keyObjectionsHandled`, `missedOpportunities`, `verdict`, `actionableTips`, `skillScores`, `suggestedResponses`, `recommendedNextScenario`, `actionPlan`.

Gaps against SOS rubric:

- no weighted scoring dimensions;
- no transcript turn references required for evidence;
- no hard caps for compliance violations;
- no `customer_stage`, `qualification`, `buying_probability`, `missed_questions`, `unresolved_objections`, `compliance_flags`, `best_moment`, `critical_moment`, or `practice_assignment`;
- no distinction between government regulation, company policy, product facts, and sales best practices.

## Feedback UI Findings

- Component: `components/FeedbackView.tsx`, `FeedbackView`.
- Interface: `FeedbackData` supports current evaluation fields only.
- Rendered sections: summary, short-transcript warning, hero score, verdict, strengths, weaknesses, actionable tips, skill scores, and suggested responses.
- Persistence behavior: `runAnalysis` saves a processing state first, then a completed or failed analysis state.

Gap: UI has no sections for SOS customer stage, qualification, buying probability, HOME/SPIN coverage, missed qualification questions, unresolved objections, compliance flags, best/critical moment, recommended next step, or homework/practice assignment.

## Event And State Model Findings

- No event schema is implemented.
- No roleplay event persistence exists in `components/FeedbackView.tsx` or Firestore rules.
- Existing live state is mostly UI/audio state in `components/CallInterface.tsx`.
- Existing behavioral heuristic: `lib/frustration-engine.ts`, `analyzeFrustration`, returns frustration delta and reasons.
- Hook: `hooks/useFrustration.ts`, `useFrustration`, keeps frustration/hang-up state in React only and invokes `onHangUp` when frustration reaches 100.

Gap: there is no persistent trust, readiness, pressure level, qualification completeness, objection status, customer stage, revealed information, buying signal, or compliance flag state.

## Admin Panel Findings

- Admin shell: `components/admin/AdminLayout.tsx` is rendered by `app/page.tsx` when `step === 'admin'`.
- Scenario management: `components/admin/ScenarioList.tsx`, `components/admin/ScenarioBuilder.tsx`.
- Persona management: `components/admin/PersonaList.tsx`, `components/admin/PersonaBuilder.tsx`.
- AI settings: `components/admin/AISettings.tsx`, `handleSave`, writes provider and model settings to Firestore `settings/global`.

Gaps against SOS admin requirements:

- no product knowledge editor;
- no company SOP/policy editor;
- no regulation reference editor with source and validity date;
- no evaluation profile/scoring weight editor;
- no prompt preview;
- no test simulation runner;
- no explicit scenario-to-persona relationship.

## Firestore And Auth Findings

- Firebase config: `lib/firebase.ts`, `db = getFirestore(app, firebaseConfig.firestoreDatabaseId)`.
- Firestore deployment config: `firebase.json`, points rules to `config/firestore.rules` for database `ai-studio-471779e6-3ac4-400d-910b-6a025a280090`.
- Rules collections: `scenarios`, `personas`, `sessions`, `settings`, `users`, and `admins`.
- Admin mismatch: `app/page.tsx`, `isAdmin`, allows two hardcoded emails; `config/firestore.rules`, `isAdmin`, allows three hardcoded emails plus `admins/{uid}`.
- Session write constraint: `config/firestore.rules`, `isValidSession`, requires `scenarioId`, `salespersonName`, `userId == request.auth.uid`, and numeric `score`.

Gap: any new SOS collections or nested paths will be denied by default until rules are updated.

## Test Coverage Findings

- No test files were found with `**/*.test.*`.
- No spec files were found with `**/*.spec.*`.
- No `jest.config.*`, `vitest.config.*`, or `playwright.config.*` files were found.
- `package.json` has no `test` or `typecheck` script.

Gap: all SOS-critical behavior will need new test infrastructure or at minimum documented verification commands before implementation can be considered complete.

## Prompt Compiler Findings

- No prompt compiler module exists.
- Roleplay prompt for text is inline in `lib/gemini.ts`, `getConsumerResponse`.
- Roleplay prompt for voice is inline in `components/CallInterface.tsx`, `startCall`.
- Evaluation prompt is inline in `app/api/analyze/route.ts`, `POST`.

Gap: the current app cannot version, preview, test, or compose prompts from structured sections as required by `docs/sos_kpr_roleplay/13_IMPLEMENTATION_PLAN.md` and `14_AGENT_PROMPT.md`.

## Conflicts And Risks

- Folder name mismatch: requested `docs/sos-kpr-roleplay/`, actual `docs/sos_kpr_roleplay/`.
- Current docs under `docs/` include Laravel planning material, but actual app is Next.js; implementation should follow executable source.
- Current voice flow uses low-latency Gemini Live; adding heavy prompt context or JSON-in-speech requirements may hurt latency or user experience.
- Storing OpenRouter API key in Firestore `settings/global` may be sensitive; current code does this in `components/admin/AISettings.tsx`.
- Admin access is inconsistent between UI and Firestore rules.
- Scenario IDs created as `scenario-${Date.now()}` and `custom_${Date.now()}` are valid, but any new generated IDs must preserve the rules regex.
- Existing session write rules require numeric `score`, so failed/processing states must keep a numeric placeholder.

## Recommended Implementation Approach

- Preserve the current `CallInterface` lifecycle and cleanup behavior while adding SOS state incrementally.
- Add structured types and prompt compiler before modifying UI behavior.
- Maintain backward-compatible evaluation fields until `FeedbackView` supports the full SOS output.
- Add semantic events and evaluation evidence as additional session fields first; only split into new collections after rules and migration strategy are agreed.
- Make product facts, company SOP, and regulation references configurable; do not hardcode regulatory values from the knowledge pack.
- Reconcile admin checks in `app/page.tsx` and `config/firestore.rules` before adding more admin-only SOS data.

## Questions Not Resolved By Repository

- Should the docs folder be renamed to `docs/sos-kpr-roleplay/`, or should all future references use the existing `docs/sos_kpr_roleplay/`?
- Which source will provide verified current KPR Subsidi regulations and bank rules?
- Which company SOP and product data should seed the first product knowledge database?
- Should text roleplay become a supported flow, or should SOS implementation focus only on voice call mode?
- Should OpenRouter API keys remain in Firestore settings or move to server-side environment/configuration?
