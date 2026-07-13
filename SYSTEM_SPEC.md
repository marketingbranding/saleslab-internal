# SYSTEM_SPEC.md

## Scope

This document specifies Phase 1 findings and target architecture for adding the SOS KPR Subsidi roleplay system described by `SOS_KPR_Subsidi_AI_Training_Module.md` and `docs/sos_kpr_roleplay/` to the current app.

No Phase 2 implementation is included here.

## Source Of Truth

- The requested folder name `docs/sos-kpr-roleplay/` does not exist in this repo; the actual folder is `docs/sos_kpr_roleplay/`.
- Current executable app sources are authoritative over older planning docs in `docs/` that describe a Laravel app.
- Current framework is Next.js App Router with Firebase Auth/Firestore and Gemini/OpenRouter/Ollama AI integrations.

## Current Architecture

- App shell: `app/layout.tsx`, `RootLayout`, wraps all pages in `AuthProvider` from `lib/AuthContext.tsx`.
- Main state machine: `app/page.tsx`, `Home`, uses `Step` union for `selection`, `briefing`, `roleplay`, `transition`, `report`, admin screens, and profile/history/performance screens.
- Active roleplay route: `app/page.tsx`, `Home`, renders `CallInterface` for `step === 'roleplay'`; `ChatInterface` exists but is not currently rendered by the app shell.
- Evaluation route: `app/api/analyze/route.ts`, `POST`, is the only API route found under `app/api/`.
- Firebase initialization: `lib/firebase.ts` initializes Firestore with `firebaseConfig.firestoreDatabaseId` from `firebase-applet-config.json`.
- Firestore rules: `config/firestore.rules`, referenced by `firebase.json`.

## Current Data Model

### Scenario

Current TypeScript source: `lib/gemini.ts`, `SalesScenario`.

Current fields:

- `id`, `title`, `description`, `target`, `consumerProfile`, `difficulty`, `icon`
- persona-like fields embedded in scenario: `name`, `gender`, `aggressiveness`, `patience`, `responseStyle`, `firstSpeaker`
- optional admin fields: `openingMessage`, `hiddenRules`, `successCriteria`, `baseXp`, `status`

Current persistence:

- Built-ins live in `lib/gemini.ts`, `SCENARIOS`.
- Custom scenarios are read from Firestore `scenarios` in `app/page.tsx`, `Home`, lines that map snapshot docs into `SalesScenario`.
- Admin save path writes to `scenarios/{scenarioId}` in `app/page.tsx`, `handleAdminSaveScenario`.
- Firestore validation in `config/firestore.rules`, `isValidScenario`, only requires `title`, `name`, `difficulty`, and `gender`.

Target SOS additions:

- Add scenario stage, target SOS skills, expected closing, forbidden closing, success/failure conditions, evaluation profile, and duration/channel metadata from `docs/sos_kpr_roleplay/09_SCENARIO_SCHEMA.md`.
- Keep scenario IDs compatible with `config/firestore.rules`, `isValidId`: max 128 chars and regex `^[a-zA-Z0-9_\-]+$`.

### Persona

Current TypeScript source: `components/admin/PersonaBuilder.tsx`, `PersonaData`.

Current fields:

- identity: `id`, `name`, `gender`, `age`, `occupation`, `familyStatus`, `incomeRange`
- narrative: `backgroundStory`, `currentSituation`, `goals`, `painPoints`, `motivations`
- behavior: `personality`, `emotionalLevel`, `aggressiveness`, `patience`, `trustLevel`, `curiosityLevel`
- speech: `speechStyle`, `tone`, `formality`, `speakingSpeed`, `commonPhrases`
- objections/hidden: `commonObjections`, `triggerConditions`, `escalationBehavior`, `hiddenInstructions`, `personaKnowledge`, `personaUnknowns`

Current persistence:

- Personas are read from Firestore `personas` in `app/page.tsx`, `Home`.
- Admin save path writes to `personas/{personaId}` in `app/page.tsx`, `handleAdminSavePersona`.
- Firestore rules only check admin status and ID validity for persona writes.

Target SOS additions:

- Convert free-text hidden/persona fields into structured hidden information, objections, buying signals, walk-away conditions, decision authority, skepticism, financial literacy, subsidy knowledge, urgency, and trust start from `docs/sos_kpr_roleplay/08_PERSONA_SCHEMA.md`.
- Preserve current admin fields during migration or map them explicitly to SOS schema fields.

### Session And Transcript

Current session storage source: `components/FeedbackView.tsx`, `saveSessionState`.

Current stored fields:

- `scenarioId`, `salespersonName`, `transcript`, `userId`, `score`, `createdAt`, `updatedAt`
- analysis payload fields such as `analysisStatus`, `transcriptQuality`, `feedback`, `analysisProvider`, `analysisError`

Current transcript shape:

- `components/CallInterface.tsx`, `appendTranscript`, stores `{ role: 'user' | 'model'; text: string }[]`.
- `components/ChatInterface.tsx`, `Message`, uses the same shape, but this component is not connected to the current app shell.

Target SOS additions:

- Store normalized turns with sequence numbers in addition to raw transcript.
- Store semantic events, state snapshots, evaluation evidence, final evaluation, and prompt/version metadata as recommended in `docs/sos_kpr_roleplay/12_EVENT_AND_STATE_MODEL.md`.

## Current AI Runtime

### Voice Runtime

- Active component: `components/CallInterface.tsx`, `CallInterface`.
- Provider: Gemini Live via `getGenAI()` from `lib/gemini.ts` and `ai.live.connect` in `CallInterface.startCall`.
- Model: `gemini-3.1-flash-live-preview` in `CallInterface.startCall`.
- Audio input: browser microphone via `navigator.mediaDevices.getUserMedia`, `AudioContext`, and PCM chunks encoded by `lib/audio-utils.ts`.
- Audio output: `Modality.AUDIO` response modality with prebuilt voice selected by `scenario.gender`.
- Transcript source: Gemini Live `inputTranscription`, `modelTurn.parts`, `userTurn.parts`, and fallbacks in `CallInterface.onmessage`.
- Current system prompt is inline in `CallInterface.startCall`, using only scenario name, profile, aggressiveness, patience, response style, and goal.

### Text Runtime

- Component exists: `components/ChatInterface.tsx`, `ChatInterface`.
- Response function: `lib/gemini.ts`, `getConsumerResponse`.
- Provider selection: Firestore `settings/global` via `lib/firebase.ts`, `getSettings`.
- Current text path uses OpenRouter when `settings.modelProvider === 'openrouter'` and `openRouterApiKey` exists; otherwise it calls Ollama. The `gemini` setting does not currently route text mode to Gemini.
- `ChatInterface` is not rendered in `app/page.tsx`, so text roleplay is not currently an active user flow.

### Prompt Compilation

- There is no reusable prompt compiler.
- Prompt text is duplicated inline in `lib/gemini.ts`, `getConsumerResponse`, and `components/CallInterface.tsx`, `startCall`.
- Evaluation prompt is separately constructed inline in `app/api/analyze/route.ts`, `POST`.

Target SOS additions:

- Introduce a prompt compiler that assembles structured sections instead of injecting the entire knowledge pack into every live prompt.
- Required sections should match `docs/sos_kpr_roleplay/13_IMPLEMENTATION_PLAN.md`: core safety/consistency, persona facts, scenario objective, hidden information rules, current state, project knowledge, customer response policy, and semantic tool/event rules.
- Customer speech must remain separate from semantic event output as required by `docs/sos_kpr_roleplay/10_ROLEPLAY_ENGINE_RULES.md`.

## Current Evaluation Pipeline

- Entry point: `components/FeedbackView.tsx`, `runAnalysis`.
- Client wrapper: `lib/gemini.ts`, `analyzePerformance`, sends `{ scenario, transcript }` to `/api/analyze` in the browser.
- Server route: `app/api/analyze/route.ts`, `POST`.
- Provider order: `GROQ_API_KEY` first with `llama-3.1-8b-instant`; fallback to Gemini `gemini-2.0-flash` with `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY`.
- Current output normalizer: `app/api/analyze/route.ts`, `normalizeAnalysis`.
- Current feedback UI: `components/FeedbackView.tsx`, `FeedbackData`, renders score, grade, summary, strengths, weaknesses, tips, skill scores, and suggested responses.

Current gaps against SOS:

- No weighted SOS rubric implementation.
- No hard caps for compliance violations.
- No required evidence turn references for each dimension score.
- No customer stage, qualification, buying probability, missed questions, unresolved objections, compliance flags, best moment, critical moment, or practice assignment schema.

Target SOS output should align with `docs/sos_kpr_roleplay/11_EVALUATION_RUBRIC.md` while preserving backward-compatible fields used by `FeedbackView` until the UI is migrated.

## Current Admin Capabilities

- Scenario admin: `components/admin/ScenarioList.tsx` and `components/admin/ScenarioBuilder.tsx`.
- Persona admin: `components/admin/PersonaList.tsx` and `components/admin/PersonaBuilder.tsx`.
- AI settings admin: `components/admin/AISettings.tsx` writes `settings/global` fields for provider, Ollama URL/model, OpenRouter key/model, thinking delay, and frustration sensitivity.

Gaps against SOS admin requirements:

- No product knowledge editor.
- No company SOP/policy editor.
- No regulation references with source and validity date.
- No scoring weight editor.
- No prompt preview.
- No scenario-linked persona selection; scenario currently embeds simple persona fields.

## Current Event And State Model

- There is no roleplay event schema or event persistence.
- `lib/frustration-engine.ts`, `analyzeFrustration`, provides a heuristic frustration delta and reasons based on sales message length, filler words, repetition, and question evasion.
- `hooks/useFrustration.ts`, `useFrustration`, stores live frustration/hang-up state in React state only.
- No trust/readiness/qualification/customer stage state is stored or persisted.

Target state variables should include trust, patience, readiness, perceived relevance, pressure level, qualification completeness, objection status, customer stage, revealed information, unresolved concerns, buying signals, and compliance flags from `docs/sos_kpr_roleplay/10_ROLEPLAY_ENGINE_RULES.md`.

## Security And Rules Constraints

- Admin check is duplicated and inconsistent: `app/page.tsx`, `isAdmin`, includes two hardcoded emails; `config/firestore.rules`, `isAdmin`, includes those plus `redhapekug@gmail.com` and `/admins/{uid}` existence.
- `settings/global` is admin-only in Firestore rules, so non-admin reads can fail and must be tolerated.
- `sessions` writes require `userId == request.auth.uid` and numeric `score`; intermediate processing/failed states must still include a number.
- New SOS collections or nested documents will require `config/firestore.rules` updates before app writes can succeed.

## Verification Baseline

- `package.json` has scripts for `dev`, `build`, `start`, `lint`, and `clean` only.
- No test runner or test files were found with `**/*.test.*` or `**/*.spec.*`.
- Phase 2+ implementation should add tests for hidden information gating, event extraction, hard caps, evidence references, prompt compilation, and roleplay state transitions per `docs/sos_kpr_roleplay/13_IMPLEMENTATION_PLAN.md`.
