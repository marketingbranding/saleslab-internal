# ARCHITECTURE_DECISIONS.md

## ADR-001 — Hybrid Knowledge Storage

**Status:** Proposed

**Context**

The SOS knowledge pack under `docs/sos_kpr_roleplay/` is stable methodology content. Product facts, company SOP, and regulation references are operational data that must be configurable and freshness-aware. Current app data lives in Firestore collections such as `scenarios`, `personas`, `sessions`, and `settings`.

**Decision**

Use hybrid storage. Keep core SOS/SPIN/HOME/FAB/rubric knowledge versioned in repo-derived structured slices. Store product knowledge, company policies, regulation references, evaluation profiles, personas, and scenarios in Firestore.

**Alternatives Considered**

- Put everything in Markdown: simple, but not admin-configurable and too large for prompts.
- Put everything in Firestore: editable, but weak version control for stable methodology.
- TypeScript constants only: fast, but blocks admin-managed product/SOP/regulation data.

**Consequences**

Stable methodology remains reviewable in git. Operational facts become configurable. Prompt selection must merge both sources.

**Repository Impact**

Future additions under `lib/sos/knowledge/*`; future Firestore collections for `productKnowledge`, `companyPolicies`, `regulationReferences`, and `evaluationProfiles`; no immediate runtime code change in Phase 1.5.

## ADR-002 — Deterministic Knowledge Retrieval Before Vector Search

**Status:** Proposed

**Context**

Phase 1.5 requires avoiding one giant prompt and not assuming an external vector database. Scenario stage, target skills, persona objections, and state are structured enough for rule-based selection.

**Decision**

Use deterministic tag/rule-based knowledge selection first. Inputs include scenario stage, target skills, persona objections, current state, product context, SOP context, and regulation freshness.

**Alternatives Considered**

- Vector database: powerful but unnecessary infrastructure for the current app size.
- Full prompt injection: easiest but violates latency and prompt-size requirements.
- Manual admin selection only: brittle and error-prone.

**Consequences**

Selection is predictable, testable, and compatible with current Next.js/Firebase setup. Vector retrieval can be deferred.

**Repository Impact**

Future `lib/sos/knowledge-selector.ts` with tests; no new package required initially.

## ADR-003 — Shared Prompt Compiler

**Status:** Proposed

**Context**

Prompts are currently inline in `lib/gemini.ts`, `components/CallInterface.tsx`, and `app/api/analyze/route.ts`. This prevents versioning, preview, reuse, and budget enforcement.

**Decision**

Create a shared prompt compiler that accepts structured persona, scenario, state, selected knowledge, product/policy/regulation context, recent turns, and prompt version. It emits compact voice, standard text, evaluation, and admin preview variants.

**Alternatives Considered**

- Keep inline prompts: fastest short-term, high duplication and drift.
- Separate compilers for voice/text/evaluation: more control, more duplication.

**Consequences**

Prompt behavior becomes testable and versionable. Voice prompt budgets can be enforced before Gemini Live connection.

**Repository Impact**

Future `lib/sos/prompt-compiler.ts`; later integration with `CallInterface.startCall`, `getConsumerResponse`, and `/api/analyze`.

## ADR-004 — Two-Layer Transcript Model

**Status:** Proposed

**Context**

`CallInterface.appendTranscript` currently stores only `{ role, text }[]` and dedupes exact repeats. Gemini Live can emit `inputTranscription`, `modelTurn.parts`, `userTurn.parts`, and fallback text. Evaluation needs stable turn references.

**Decision**

Store raw provider output separately from normalized turns. Normalized turns include sequence, role, text, timestamp, source, finalized status, confidence, dedupe key, and raw refs.

**Alternatives Considered**

- Keep only current transcript array: compatible but insufficient for evidence and dedupe.
- Store only normalized turns: loses provider debugging context.

**Consequences**

Evaluation can cite turn sequences. Debugging provider duplicates remains possible.

**Repository Impact**

Future `lib/sos/transcript-normalizer.ts`; later `sessions/{sessionId}/turns` subcollection; current `FeedbackView` compatibility preserved.

## ADR-005 — Hybrid Semantic Event Generation

**Status:** Proposed

**Context**

Events must be separate from spoken AI customer responses. Gemini Live tool/function event output may add complexity and latency. Some events are deterministic, others require semantic judgment.

**Decision**

Use a hybrid model. Deterministic detectors emit obvious compliance/closing/HOME events. Post-turn LLM extraction can emit nuanced events when feasible. Evaluation can backfill events for incomplete sessions.

**Alternatives Considered**

- Gemini Live tool calls only: risks latency and event/speech coupling.
- Evaluator-only extraction: simpler live runtime but no stateful hidden info during calls.
- Deterministic only: reliable but misses nuanced behavior.

**Consequences**

Runtime state gets high-confidence signals early while nuanced extraction remains possible.

**Repository Impact**

Future `lib/sos/event-extractor.ts` and `lib/sos/deterministic-detectors.ts`; later integration with `CallInterface` and evaluator.

## ADR-006 — Deterministic Roleplay State Reducer

**Status:** Proposed

**Context**

The knowledge pack requires state variables such as trust, patience, readiness, qualification completeness, customer stage, revealed information, and compliance flags. Current app has only heuristic frustration state in `lib/frustration-engine.ts` and `hooks/useFrustration.ts`.

**Decision**

Implement a deterministic `reduceRoleplayState(currentState, event)` reducer. LLM output may propose events, but reducer rules decide state transitions.

**Alternatives Considered**

- Let LLM own state: flexible but inconsistent and hard to audit.
- Keep only frustration engine: insufficient for SOS hidden info and evaluation.

**Consequences**

State changes become reproducible and testable. Existing frustration engine can feed reducer as one signal.

**Repository Impact**

Future `lib/sos/state-reducer.ts`; possible bridge to `useFrustration` later.

## ADR-007 — Session Subcollections For V2 Persistence

**Status:** Proposed

**Context**

Current `FeedbackView.saveSessionState` writes transcript and feedback into one `sessions/{sessionId}` document. V2 needs raw transcript, normalized turns, events, state snapshots, evidence, and evaluations. Firestore documents have size limits and current rules require numeric `score`.

**Decision**

Keep session summary fields on `sessions/{sessionId}` and store detailed V2 data in subcollections: `turns`, `events`, `stateSnapshots`, `evaluationEvidence`, and `evaluations`.

**Alternatives Considered**

- Single session document: simple but size-risky.
- Separate top-level collections only: scalable but harder owner-based security and reads.

**Consequences**

Dashboards remain fast with summary fields. Detailed audit data avoids document bloat.

**Repository Impact**

Requires future `config/firestore.rules` updates and indexes before writes. Existing session documents remain valid.

## ADR-008 — Multi-Stage Evidence-Based Evaluation Pipeline

**Status:** Proposed

**Context**

`app/api/analyze/route.ts` currently asks an LLM for generic sales feedback. SOS requires weighted dimensions, transcript evidence, and hard caps.

**Decision**

Use a multi-stage pipeline: normalized transcript, deterministic checks, semantic event aggregation, LLM evidence review, weighted rubric, hard cap rules, feedback generation.

**Alternatives Considered**

- LLM-only JSON scoring: fast but unverifiable.
- Fully deterministic scoring: reliable but too shallow for communication quality.

**Consequences**

Scores are explainable and auditable. The implementation is larger than current `/api/analyze`, but can preserve current response fields.

**Repository Impact**

Future `lib/sos/evaluation/*`; later replace internals of `app/api/analyze/route.ts` while preserving API shape initially.

## ADR-009 — Server-Side API Key Policy

**Status:** Proposed

**Context**

Gemini Live currently uses `NEXT_PUBLIC_GEMINI_API_KEY` in browser through `getGenAI`. Analysis uses server-side `GROQ_API_KEY`, `GEMINI_API_KEY`, or fallback public Gemini key. `components/admin/AISettings.tsx` currently stores `openRouterApiKey` in Firestore `settings/global`.

**Decision**

Do not add new secrets to client code or public Firestore documents. Keep Gemini Live public key behavior only if required by current provider. Move analysis/OpenRouter-style keys to server-side environment or a strictly admin-protected secret strategy.

**Alternatives Considered**

- Continue Firestore key storage: easy admin UX but risky.
- Require all AI calls server-side: safer but may disrupt Gemini Live browser audio.

**Consequences**

Security improves while preserving current voice behavior. Admin UX may need a different secret configuration flow.

**Repository Impact**

Future changes to `components/admin/AISettings.tsx`, `lib/gemini.ts`, and API routes; no Firebase change in Phase 1.5.

## ADR-010 — Text Roleplay Remains Deferred Until Product Approval

**Status:** Proposed

**Context**

`components/ChatInterface.tsx` exists and uses `getConsumerResponse`, but `app/page.tsx` does not render it. The current active trainee flow starts `CallInterface`.

**Decision**

Treat text roleplay as supported architecture but deferred product scope. Build prompt compiler/provider abstractions so text can reuse V2, but do not reconnect UI until owner confirms.

**Alternatives Considered**

- Delete/deprecate `ChatInterface`: premature because text can be useful for testing.
- Re-enable immediately: expands scope and QA burden.

**Consequences**

Voice remains the rollout priority. Text mode can become a low-risk test harness later.

**Repository Impact**

Future compiler can target `ChatInterface` and `getConsumerResponse`; `app/page.tsx` remains unchanged until approval.
