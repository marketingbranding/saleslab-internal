# ARCHITECTURE_V2.md

## A. Executive Summary

The target SOS KPR architecture should extend the current Next.js/Firebase roleplay app with clear domain layers instead of rewriting the existing voice flow. The current app already has a working session path: `app/page.tsx` selects a `SalesScenario`, `components/CallInterface.tsx` runs Gemini Live, `components/FeedbackView.tsx` persists a transcript, and `app/api/analyze/route.ts` returns feedback. The target architecture keeps that path, extracts reusable services around it, and adds structured SOS data, prompt compilation, transcript normalization, semantic events, deterministic state reduction, and evidence-based evaluation.

The recommended conceptual flow is:

```text
Knowledge Sources
  -> Knowledge Loader
  -> Knowledge Selector
  -> Prompt Compiler
  -> Roleplay Runtime
  -> Raw Transcript + Normalized Turns + Semantic Events
  -> State Reducer
  -> Evaluation Engine
  -> Feedback + Persistence
```

The design is deliberately modular but not microservice-based. Most additions should be plain TypeScript modules and existing Next.js API routes, with Firestore as persistence. Firebase Functions or background jobs are deferred until latency, retry, or long-running evaluation needs prove they are necessary.

## B. Current-to-Target Mapping

| Current Component | Current Responsibility | Target Responsibility | Change Type |
|---|---|---|---|
| `app/page.tsx`, `Home` | Owns app navigation, auth-gated scenario selection, active roleplay/report/admin flow, Firestore subscriptions | Keep as shell/orchestrator, pass richer scenario/persona/session IDs, avoid owning domain logic | extend |
| `lib/gemini.ts`, `SalesScenario` | Defines built-in scenarios and roleplay/evaluation wrappers | Keep compatibility type initially, then map to structured `Scenario` + `Persona` domain types | extend |
| `lib/gemini.ts`, `SCENARIOS` | Built-in scenario seed data | Become legacy seed/templates that can map into Firestore scenarios | extend |
| `lib/gemini.ts`, `getConsumerResponse` | Text roleplay prompt and OpenRouter/Ollama routing | Move prompt assembly to prompt compiler and keep provider wrapper only | extract |
| `lib/gemini.ts`, `analyzePerformance` | Browser wrapper for `/api/analyze`; also contains unused server fallback branch | Keep browser wrapper, remove duplicated server-side evaluation in later refactor | extract |
| `components/CallInterface.tsx` | Gemini Live setup, audio IO, transcript collection, UI controls, reconnect, inline prompt | Keep audio lifecycle/UI; extract prompt input, transcript normalization hooks, event/state callbacks | extend |
| `components/ChatInterface.tsx` | Text roleplay UI using `getConsumerResponse`, currently not rendered by `app/page.tsx` | Decide product status; if kept, reuse same roleplay orchestrator and prompt compiler | extend |
| `components/FeedbackView.tsx` | Saves session state, calls analysis, renders generic feedback | Keep report shell; render SOS evaluation fields and evidence; move persistence helpers to session service | extend |
| `app/api/analyze/route.ts` | Generic LLM evaluation prompt, Groq/Gemini provider selection, output normalization | Become evaluation API using normalized transcript, events, rubric, hard caps, and evidence schema | replace |
| `components/admin/ScenarioBuilder.tsx` | Basic scenario + embedded persona fields | Structured scenario editor: stage, goals, target skills, expected/forbidden closing, persona link, evaluation profile | extend |
| `components/admin/PersonaBuilder.tsx` | Mostly free-text persona editor | Structured persona editor: hidden info, objections, buying signals, walk-away conditions, trust/skepticism | extend |
| `components/admin/AISettings.tsx` | Writes provider settings and OpenRouter key to `settings/global` | Keep non-secret settings; move sensitive provider keys server-side or protect under admin-only secret policy | extend |
| `lib/frustration-engine.ts`, `analyzeFrustration` | Heuristic frustration delta from message quality | Reuse as one deterministic signal feeding the state reducer; not the full state engine | extend |
| `hooks/useFrustration.ts`, `useFrustration` | React state wrapper around frustration engine | Keep UI meter; later consume state reducer output or bridge reducer events into existing meter | extend |
| `config/firestore.rules` | Rules for `scenarios`, `personas`, `sessions`, `settings`, `users`, `admins` | Add SOS collections/subcollections and reconcile admin checks before writes | extend |
| `firebase.json` | Points Firestore rules to `config/firestore.rules` | Keep; rules impact must be handled before new writes | keep |

## C. Layered Architecture

Dependency direction should flow downward from UI to domain modules to providers/persistence. Domain modules should not import React components.

1. Knowledge Layer: reusable SOS/SPIN/HOME/FAB/objection/closing/rubric content plus admin-maintained product, SOP, and regulation records.
2. Persona Layer: structured AI customer facts and behavior rules, including hidden information and objections.
3. Scenario Layer: mission setup, current customer journey stage, target skills, success/failure conditions, expected closing, forbidden closing.
4. Session Layer: one roleplay instance for one user/scenario/persona with prompt version, timestamps, transcript, events, state, and evaluation.
5. State Layer: deterministic reducer of events into trust, patience, readiness, pressure, qualification completeness, revealed info, and compliance flags.
6. Transcript Layer: raw provider messages plus normalized turns with stable sequence numbers and dedupe metadata.
7. Semantic Event Layer: validated machine-readable events separate from spoken customer text.
8. Prompt Compilation Layer: provider-specific prompt variants from structured inputs and selected knowledge.
9. AI Provider Layer: Gemini Live, OpenRouter, Ollama, Groq, and Gemini analysis wrappers.
10. Evaluation Layer: deterministic checks, event aggregation, LLM evidence review, weighted rubric, hard caps, and feedback generation.
11. Persistence Layer: Firestore documents/subcollections with rules-compatible writes and migration compatibility.
12. Admin Configuration Layer: admin UI for structured content, prompt preview, scoring profiles, and publish/version workflows.

## D. Runtime Flow

### Starting A Session

1. `app/page.tsx`, `Home`, selects a scenario and starts `step === 'briefing'` then `step === 'roleplay'`.
2. Target design loads scenario, linked persona, active evaluation profile, product context, company policy, and regulation references.
3. A session record is created or reserved with `userId`, `scenarioId`, `personaId`, `promptVersion`, `status: active`, and start time.
4. Initial `RoleplayState` is built from persona trust/patience, scenario stage, and configured difficulty.

### Compiling A Prompt

1. `KnowledgeSelector` receives scenario stage, target skills, persona objections, state, and available product/policy/regulation metadata.
2. It returns only relevant slices, for example approaching + SPIN + HOME + compliance for first-call/inquiry.
3. `PromptCompiler` emits a compact Gemini Live prompt for `CallInterface` or a standard text prompt for `ChatInterface`.
4. Prompt version metadata is attached to the session and evaluation context.

### Handling A User Turn

1. `CallInterface` keeps current audio capture and sends PCM to Gemini Live.
2. Provider transcript fragments are collected as raw transcript entries.
3. `TranscriptNormalizer` creates or updates a normalized `RoleplayTurn` with sequence, role, text, timestamp, source, finalized status, confidence when available, and dedupe metadata.
4. Deterministic detectors inspect finalized sales turns for obvious compliance phrases, closing attempts, and HOME/SPIN cues.

### Processing AI Response

1. Gemini Live returns audio and optional text parts.
2. `CallInterface` keeps audio playback and interruption handling.
3. AI/customer text is normalized into model turns.
4. Semantic event generation happens outside the spoken text path.

### Recording Transcript

1. Raw provider output is retained for audit/debug when feasible.
2. Normalized turns become the stable source for events, state, and evaluation.
3. Incomplete sessions are still saved with numeric `score: 0` to satisfy current Firestore session rules.

### Generating Events

1. Deterministic checks emit high-confidence events such as `GUARANTEE_LANGUAGE`, `CLOSING_ATTEMPTED`, or `PRESSURE_TACTIC` when matching configured patterns.
2. Post-turn semantic extraction emits richer events such as `SITUATION_DISCOVERED`, `OBJECTION_CLARIFIED`, or `BUYING_SIGNAL_DETECTED` with confidence and source turn sequence.
3. Events are validated against a strict enum/schema before they can affect state.

### Updating State

1. `reduceRoleplayState(currentState, event)` applies each validated event.
2. Trust, patience, readiness, pressure, qualification completeness, unresolved objections, revealed information, and compliance flags update deterministically.
3. Hidden information reveal eligibility is derived from state + event history, never from customer speech alone.
4. State snapshots are stored periodically and at session end.

### Ending Session

1. `CallInterface.handleEndAndAnalyze` keeps current cleanup via `stopAudio()` and sends final normalized transcript/session ID to the report flow.
2. `FeedbackView` can continue to show processing state while evaluation runs.
3. Session status becomes `completed`, `failed`, or `incomplete` depending on transcript/evaluator result.

### Evaluating Session

1. `/api/analyze` receives session ID or structured payload containing scenario, persona, normalized turns, events, state, and selected rubric.
2. Deterministic checks and event aggregation run before LLM review.
3. LLM evidence review may classify nuanced behavior but must cite actual turn sequences.
4. Weighted rubric scores are calculated with configurable weights.
5. Hard caps are applied after scoring.
6. Feedback is normalized into backward-compatible fields plus SOS fields.
7. Evaluation result, evidence, prompt/evaluation version, and final score are persisted.

## E. Knowledge Architecture

Use hybrid storage. Do not inject full Markdown documents into prompts.

| Knowledge Category | Authoritative Source | Runtime Form | Notes |
|---|---|---|---|
| SOS framework | Versioned repo Markdown under `docs/sos_kpr_roleplay/` initially | Curated TypeScript/JSON slices generated or hand-transcribed later | Stable methodology; admin should not casually edit core framework |
| SPIN/HOME/FAB | Versioned repo Markdown initially | Prompt snippets and evaluator rubric descriptors | Selected by scenario target skills |
| Objection playbook | Versioned repo Markdown + future Firestore extensions | Structured objection records keyed by topic | Company can add local objections later |
| Evaluation rubric | Versioned repo Markdown + Firestore `evaluationProfiles` | Structured weights, dimensions, hard caps | Firestore profile allows scenario-specific weights |
| Product knowledge | Firestore | `ProductKnowledgeContext` selected per scenario/project | Must include freshness timestamp and disclaimer |
| Company SOP | Firestore | `CompanyPolicyContext` | Admin-managed; source and effective date required |
| Regulation references | Firestore | `RegulationContext` | Verified references only, with source, validity date, and stale flag |
| Persona defaults | TypeScript seed + Firestore personas | Structured `Persona` | Firestore is authoritative for custom personas |
| Scenario templates | TypeScript seed + Firestore scenarios | Structured `Scenario` | Existing `SCENARIOS` remain backward-compatible seeds |

Retrieval inputs:

- scenario stage, target skills, expected closing, forbidden closing;
- persona hidden info, objections, buying signals, walk-away conditions;
- current roleplay state;
- latest normalized turns and event summary;
- product/project ID and active policy/regulation references.

Retrieval outputs:

- selected methodology snippets;
- relevant objection handling rules;
- permitted product facts;
- applicable SOP notes;
- verified regulation notes or stale/missing warnings;
- rubric profile and hard cap rules.

Selection rules:

- first-call/inquiry selects approaching, SPIN, HOME, hidden information, and compliance;
- objection scenarios select objection playbook, persona objections, verified product facts, and SOP boundaries;
- closing scenarios select buying signals, current readiness, expected/forbidden closing, and compliance;
- after-sales scenarios select process status, responsibility, next update, and what cannot be promised.

Fallback behavior:

- Missing product data: instruct AI to say the fact must be confirmed, not invented.
- Missing SOP: keep advice generic and mark policy context missing.
- Missing regulation: do not state numeric thresholds; require admin/verified source.
- Stale regulation: surface stale warning in admin/evaluation and avoid definitive claims.

## F. Context Management

Voice latency is the primary constraint. Gemini Live prompts should be compact and stateful; evaluation can use larger context after the session.

Recommended prompt budgets are approximate character budgets:

| Section | Voice Prompt | Text Prompt | Evaluation Prompt |
|---|---:|---:|---:|
| Core role/safety | 800 | 1,200 | 800 |
| Persona facts | 1,200 | 1,800 | 1,200 |
| Scenario objective | 700 | 1,000 | 900 |
| Current state | 700 | 1,000 | 1,200 |
| Hidden info rules | 900 | 1,400 | 1,000 |
| Retrieved knowledge | 1,500 | 2,500 | 4,000 |
| Recent turns | 1,200 | 2,000 | Full normalized transcript when feasible |
| Event rules | 500 | 900 | 1,000 |

Static context: core customer behavior, safety, response style, and selected SOS snippets.

Dynamic context: current state, revealed information, unresolved objection summary, recent turns, active compliance warnings.

Session memory: summarized from state and events, not the entire transcript.

Never insert in full:

- all files under `docs/sos_kpr_roleplay/`;
- complete product catalog;
- complete regulation corpus;
- full historical transcript in live prompts;
- private admin notes unrelated to the scenario.

## G. Prompt Compiler Design

Target module: plain TypeScript, for example `lib/sos/prompt-compiler.ts` in a future phase.

Input shape:

```ts
type RoleplayPromptInput = {
  persona: Persona
  scenario: Scenario
  state: RoleplayState
  knowledge: SelectedKnowledge
  productContext?: ProductContext
  companyPolicy?: CompanyPolicyContext
  regulationContext?: RegulationContext
  recentTurns?: NormalizedTurn[]
  promptVersion: string
}
```

Output variants:

- compact voice prompt for `components/CallInterface.tsx` Gemini Live `systemInstruction`;
- standard text prompt for `components/ChatInterface.tsx` / `lib/gemini.ts` text providers;
- evaluation prompt for `app/api/analyze/route.ts`;
- admin preview prompt for future admin UI.

Compiler responsibilities:

- validate required persona/scenario/state fields;
- order sections consistently: role, non-disclosure, persona, scenario, state, revealed/hidden info, selected knowledge, product/policy/regulation boundaries, response policy, event policy;
- enforce section budgets and produce warnings;
- include prompt version and selected knowledge version IDs;
- format provider-specific messages without changing domain content;
- produce preview/debug metadata without exposing secrets.

The compiler should not fetch data directly. It should receive already-selected structured inputs.

## H. Transcript and Event Design

Raw transcript:

- stores provider output as close as practical to source;
- includes provider, source message type, timestamp, and raw text/audio metadata when available;
- useful for debugging Gemini Live duplication and reconnect cases.

Normalized transcript:

```ts
type NormalizedTurn = {
  sequence: number
  role: 'sales' | 'customer'
  text: string
  timestamp: string
  source: 'gemini_live_input' | 'gemini_live_model' | 'openrouter' | 'ollama' | 'manual' | 'fallback'
  finalized: boolean
  confidence?: number
  dedupeKey?: string
  rawRefs?: string[]
}
```

Deduplication policy:

- keep current exact duplicate guard from `CallInterface.appendTranscript` as a first layer;
- add normalized dedupe keys based on role, normalized text, source, and short time window;
- prefer Gemini Live `inputTranscription` over browser `SpeechRecognition`, matching the current comment in `CallInterface.startCall`;
- mark partial or interrupted turns as not finalized until provider turn completion or session end.

Semantic events:

```ts
type RoleplayEvent = {
  id: string
  sessionId: string
  eventType: RoleplayEventType
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  topic?: string
  sourceTurnSequence: number
  confidence: number
  extractor: 'deterministic' | 'llm_post_turn' | 'evaluator'
  payload?: Record<string, unknown>
  createdAt: string
}
```

Recommended event generation: hybrid.

- Deterministic pattern detection for compliance red flags, obvious closing attempts, and simple HOME/SPIN signals.
- Post-turn LLM extraction for nuanced SOS events when latency allows, or deferred extraction during evaluation for voice sessions.
- Evaluator-only extraction as fallback for incomplete live event streams.

Do not use Gemini Live spoken responses as event JSON. Events must be machine-readable and separate from customer speech.

## I. State Engine

Target reducer:

```ts
reduceRoleplayState(currentState: RoleplayState, event: RoleplayEvent): RoleplayState
```

State schema:

```ts
type RoleplayState = {
  trust: number
  patience: number
  readiness: number
  perceivedRelevance: number
  pressureLevel: number
  qualificationCompleteness: number
  customerStage: CustomerStage
  objectionStatus: Record<string, 'raised' | 'clarified' | 'responded' | 'resolved'>
  revealedInformation: string[]
  unresolvedConcerns: string[]
  buyingSignals: string[]
  complianceFlags: string[]
  hangUpRisk: number
}
```

Initial state:

- trust comes from persona `trust_start` or current `trustLevel` mapping;
- patience comes from persona/scenario `patience`, normalized to 0-100;
- readiness starts from scenario stage and persona urgency;
- qualification completeness starts at 0 unless scenario includes known prequalified facts.

Reducer behavior:

- trust increases on listening, accurate summaries, relevant questions, admitted uncertainty, verified facts, and respected decision process;
- trust decreases on pressure, contradictions, guarantees, generic scripts, and ignored objections;
- patience decreases from pressure/repetition and existing `lib/frustration-engine.ts` output;
- readiness increases after needs, eligibility, and objections are handled;
- qualification completeness increases from HOME events;
- customer stage transitions only from validated events and thresholds;
- compliance flags persist and can trigger hard caps later.

Hidden information reveal logic:

- each hidden info item has reveal conditions, never-reveal conditions, trust thresholds, question triggers, event triggers, and scenario overrides;
- the reducer marks an item as revealable, then the prompt compiler includes it as allowed customer knowledge;
- hidden info remains unavailable to the sales trainee until a valid trigger is met;
- reveal events are logged for audit.

The state engine must not depend entirely on free-form LLM judgment. LLM events can propose changes, but the reducer decides allowed transitions.

## J. Evaluation Pipeline

Target flow:

```text
Normalized Transcript
  -> Deterministic Checks
  -> Semantic Event Aggregation
  -> LLM Evidence Review
  -> Weighted Rubric
  -> Hard Cap Rules
  -> Feedback Generation
```

Score sources:

- deterministic: hard violations, missing transcript, no eligibility questions, no need discovery, obvious guarantee language;
- event-derived: HOME coverage, SPIN stages, objection lifecycle, closing attempt, next step agreed;
- LLM-assisted: empathy quality, transition quality, relevance of FAB, nuanced objection handling, summary and coaching text;
- manually configurable: dimension weights, scenario success/failure conditions, product/SOP/regulation source validity.

Rubric dimensions follow `docs/sos_kpr_roleplay/11_EVALUATION_RUBRIC.md`:

- Opening & Rapport 10;
- Prospect Qualification 15;
- SPIN Probing 15;
- HOME Coverage 10;
- Solution Presentation / FAB 15;
- Objection Handling 10;
- Negotiation 5;
- Closing & Next Step 10;
- Accuracy & Compliance 10.

Every dimension score must include evidence from actual normalized turn sequences. Scores without evidence should fail validation or be downgraded to review-required.

Hard caps:

- max 59 for approval guarantees, illegal manipulation, fabricated regulation, hidden material costs, or discrimination;
- max 69 for no eligibility check, no customer need identification, or aggressive close before qualification.

Backward compatibility:

- continue returning `overallScore`, `grade`, `summary`, `strengths`, `weaknesses`, `verdict`, `actionableTips`, `skillScores`, and `suggestedResponses` for `FeedbackView` until the UI is fully migrated;
- add SOS-native fields alongside them.

## K. Persistence Design

Recommended Firestore structure for a later Firebase phase:

```text
personas/{personaId}
  hiddenInformation/{hiddenInfoId}
  objections/{objectionId}
  buyingSignals/{signalId}

scenarios/{scenarioId}
  goals/{goalId}
  successConditions/{conditionId}
  failureConditions/{conditionId}

productKnowledge/{productId}
companyPolicies/{policyId}
regulationReferences/{referenceId}
evaluationProfiles/{profileId}
promptVersions/{versionId}

sessions/{sessionId}
  turns/{turnId}
  events/{eventId}
  stateSnapshots/{snapshotId}
  evaluationEvidence/{evidenceId}
  evaluations/{evaluationId}
```

Read/write patterns:

- normal users read published scenarios and start/write their own sessions;
- admins manage personas, scenarios, knowledge, policies, regulation references, scoring profiles, and prompt versions;
- session subcollections are append-oriented during roleplay and finalized at evaluation;
- admin dashboards can aggregate from session summary fields on `sessions/{sessionId}` to avoid reading all subcollections.

Document size risks:

- keep long transcripts, events, and evidence in subcollections rather than one large `sessions` document;
- retain summary fields on session doc for dashboards: `score`, `analysisStatus`, `scenarioId`, `userId`, `createdAt`, `customerStage`, `qualification`, `complianceFlagCount`.

Backward compatibility:

- existing session documents with `transcript` array and `feedback` object remain readable;
- new evaluator should accept legacy transcript arrays and normalize them on demand;
- existing `SalesScenario` records remain valid while new structured fields are optional.

Rules impact:

- current `config/firestore.rules` denies all unknown paths;
- new collections/subcollections require explicit rules before implementation writes;
- `sessions` writes must continue to include numeric `score` unless rules change;
- UI/admin hardcoded admin logic in `app/page.tsx` must be reconciled with `config/firestore.rules`.

Indexing requirements:

- sessions by `userId`, `createdAt`, `scenarioId`, `analysisStatus`;
- published scenarios by `status`, `difficulty`, `stage`;
- knowledge by `status`, `projectId`, `validFrom`, `validUntil`, `updatedAt`;
- evaluations by `overallScore`, `profileId`, `createdAt` for admin analytics.

## L. Admin Design

Admin capabilities should extend existing admin tabs rather than introduce a new app.

- Persona editor: structured identity, financial profile, communication style, trust/skepticism, hidden information, objections, buying signals, walk-away conditions.
- Hidden information editor: key/value, importance, reveal conditions, never-reveal conditions, trust threshold, question/event triggers.
- Objection editor: category, possible roots, correct behavior, prohibited responses, linked product/SOP references.
- Scenario editor: stage, channel, persona link, sales goals, target skills, expected closing, forbidden closing, success/failure conditions, evaluation profile, max duration, publish status.
- Product knowledge editor: project, unit type, price, installment simulation, fees, promotions, stock, facilities, location, terms, document requirements, disclaimer, freshness timestamp.
- Company policy editor: policy text, scope, source, effective date, owner, status.
- Regulation reference editor: source URL/name, summary, validity dates, freshness status, verified by.
- Scoring profile editor: dimension weights, hard cap rules, scenario overrides.
- Prompt preview: show compiled prompt variant with selected knowledge and budget warnings.
- Test simulation: run scripted turns against prompt compiler/event/evaluation without altering production sessions.
- Content versioning: draft/published/archived states, version ID, last updated by.

## M. Security Design

- API keys: do not add secrets to client-side code. `NEXT_PUBLIC_GEMINI_API_KEY` is currently required for Gemini Live in browser; server-side evaluator keys such as `GROQ_API_KEY`, `GEMINI_API_KEY`, and any future OpenRouter server key should remain environment/server-only.
- OpenRouter key risk: `components/admin/AISettings.tsx` currently writes `openRouterApiKey` to Firestore `settings/global`; target design should move sensitive keys server-side or store only admin-protected non-public configuration.
- Admin authorization: reconcile `app/page.tsx` `isAdmin` with `config/firestore.rules` `isAdmin`; prefer Firestore `/admins/{uid}` as source of truth plus admin claims when available.
- Firestore rules: add least-privilege rules for every SOS collection before writes; normal users should only read published training content and write their own session data.
- Hidden information: never send unrevealed hidden information to user-visible UI; include only allowed hidden state in customer prompt.
- Evaluation evidence: transcripts may contain sensitive financial data; restrict reads to owner/admin.

## N. Failure Modes

| Failure Mode | Target Behavior |
|---|---|
| Missing knowledge | Use minimal safe prompt; mark missing context in prompt/evaluation metadata; never invent facts |
| Stale regulation | Do not state definitive numeric/regulatory claims; surface stale warning to admin/evaluator |
| Malformed tool event | Reject event, store validation error, continue session with deterministic checks |
| Duplicated transcript | Normalize and dedupe by source/role/text/time window; preserve raw refs |
| Provider disconnect | Preserve current `CallInterface` reconnect/end-and-analyze behavior |
| Incomplete session | Save partial transcript with `analysisStatus: failed` or `partial`, numeric score, and retry option |
| Evaluator failure | Preserve session/transcript, show retry, do not lose transcript |
| Oversized prompt | Compiler trims retrieved knowledge first, then older summary, never persona core/safety |
| Persona inconsistency | State reducer and persona facts override ad hoc LLM drift; evaluation flags inconsistency |
| Hidden info leaked | Log compliance/system event, exclude from scoring as valid sales discovery, mark session review-required |

## O. Migration Strategy

1. Keep current `SalesScenario` shape and existing Firestore `scenarios` readable.
2. Add optional structured fields to scenarios/personas; do not require them for old documents initially.
3. Add mappers from legacy `SalesScenario` to target `Scenario` + lightweight `Persona` when structured persona is missing.
4. Normalize legacy `transcript` arrays into `NormalizedTurn[]` during evaluation.
5. Store new session subcollections only for new sessions while old session documents remain readable by `MissionHistory`, `PerformanceScreen`, and dashboards.
6. Keep current feedback fields in evaluation responses until `FeedbackView` is migrated.
7. Add Firestore rules and indexes before enabling writes to new collections.
8. Migrate admin UI section by section; do not block current scenario creation.

## P. Recommended Implementation Sequence

1. Domain Foundation: add TypeScript domain types and legacy mappers with no runtime behavior change.
2. Knowledge Engine: create structured static knowledge slices from the SOS pack and define Firestore-backed product/policy/regulation interfaces.
3. Prompt Compiler: build compiler and tests, then use it in text flow first or admin preview before touching Gemini Live.
4. Transcript Normalization: introduce normalizer around current transcript arrays and Gemini Live fragments.
5. State + Hidden Info Engine: add reducer, reveal rules, and deterministic events behind feature flags.
6. Evaluation Engine: replace generic analyzer with SOS pipeline while preserving response compatibility.
7. Persistence + Rules: add subcollections/collections and rules in a controlled Firebase phase.
8. Admin Configuration: extend builders and add knowledge/policy/rubric editors.
9. Voice Integration: carefully wire compact prompt/state/event hooks into `CallInterface` without altering audio cleanup.
10. Testing and Rollout: add test runner, unit tests, integration tests, manual voice QA checklist.

## Q. Deferred Decisions

- Do not add a vector database in Phase 2; deterministic selection is enough initially.
- Do not add Firebase Functions/background jobs until API route evaluation proves insufficient.
- Do not rebuild the UI or replace Gemini Live audio handling.
- Do not require full product/regulation databases before the core prompt/evaluation pipeline is testable.
- Do not re-enable text roleplay in the main UI until the owner confirms it is part of product scope.
- Do not migrate all historical sessions before new sessions can use the V2 schema.
