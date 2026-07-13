# PHASE_1_5_REVIEW.md

## Recommended Architecture

Use an incremental V2 architecture around the existing Next.js/Firebase/Gemini Live app. Keep `app/page.tsx` as the UI state machine, keep `components/CallInterface.tsx` responsible for browser microphone/Web Audio/Gemini Live lifecycle, and add plain TypeScript domain services around it:

- Knowledge Selector
- Prompt Compiler
- Transcript Normalizer
- Semantic Event Extractor
- Roleplay State Reducer
- Hidden Information Engine
- Evaluation Engine
- Compliance Checker

The key design decision is to separate knowledge, persona, scenario, session, state, transcript, semantic events, prompt compilation, providers, evaluation, persistence, and admin configuration. Do not merge these into one large prompt or one overloaded Firestore document.

## Most Important Decisions

- Use hybrid knowledge storage: repo-versioned SOS methodology plus Firestore-managed product/SOP/regulation/scoring content.
- Use deterministic knowledge selection first; no vector database in the initial implementation.
- Build a shared prompt compiler with compact voice, standard text, evaluation, and admin preview variants.
- Preserve current Gemini Live audio behavior in `components/CallInterface.tsx`; extract domain logic, not audio refs/cleanup.
- Store raw provider transcript separately from normalized turn sequences.
- Generate semantic events separately from customer speech.
- Use a deterministic reducer for trust, patience, readiness, pressure, qualification completeness, reveal state, and compliance flags.
- Evaluate with a multi-stage pipeline, not an LLM-only score.
- Keep backward-compatible feedback fields while adding SOS-native fields.
- Move sensitive provider keys server-side where possible; do not add more secrets to client/public Firestore paths.

## Highest Risks

- Voice latency regression if too much knowledge is inserted into Gemini Live prompts.
- Hidden information leaks if unrevealed facts are sent to user-visible UI or broad prompts.
- Firestore rules failures because current rules deny unknown paths and require numeric `score` for sessions.
- Inconsistent admin authorization because `app/page.tsx` and `config/firestore.rules` currently define admin access differently.
- Score trust issues if evaluation lacks evidence references to actual transcript turns.
- Provider transcript duplication from Gemini Live if normalization is not handled carefully.
- Security risk from storing OpenRouter API keys in Firestore `settings/global` as current `components/admin/AISettings.tsx` does.

## First Implementation Epic

Start with **Domain Foundation**.

Reason: all later work depends on shared types and legacy mappers. This can be done without changing runtime behavior, without touching Firebase, and without risking Gemini Live audio. The first concrete tasks should be `D-001` and `D-002` from `TASKLIST_V2.md`.

## Estimated Refactor Scope

High.

Reason: the live voice UI can be preserved, but SOS requires new domain models, prompt compilation, transcript normalization, event/state infrastructure, evaluation semantics, persistence design, admin configuration, and tests.

## Files That Should Not Be Modified First

- `components/CallInterface.tsx`: preserve audio lifecycle until prompt compiler/transcript normalizer are tested outside the live call path.
- `config/firestore.rules`: do not change until the V2 persistence model is approved.
- `firebase.json`: no change needed for architecture design.
- `app/api/analyze/route.ts`: do not replace evaluator until normalized transcript, rubric schema, evidence schema, and compatibility response shape are designed/tested.
- `components/FeedbackView.tsx`: keep existing report flow until evaluator can return backward-compatible fields.
- `components/admin/AISettings.tsx`: avoid secret handling changes until owner approves API key policy.

## Decisions Requiring Owner Approval

- Whether to keep using `docs/sos_kpr_roleplay/` or rename to `docs/sos-kpr-roleplay/`.
- Whether text roleplay should be re-enabled in the product UI.
- Where verified KPR Subsidi regulation references will come from and who owns freshness review.
- What company SOP and product knowledge should seed the first Firestore records.
- Whether OpenRouter keys may remain in Firestore or must move server-side.
- Whether to add a test runner/package in the next implementation phase.
- Whether new SOS data should use new top-level Firestore collections or nested collections under existing entities.

## Phase 1.5 Completion

Created architecture-only documents:

- `ARCHITECTURE_V2.md`
- `TASKLIST_V2.md`
- `ARCHITECTURE_DECISIONS.md`
- `PHASE_1_5_REVIEW.md`

No runtime code, packages, Firebase configuration, prompts, or migrations were changed in this phase.
