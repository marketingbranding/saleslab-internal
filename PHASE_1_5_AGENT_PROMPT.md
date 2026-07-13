# PHASE 1.5 — Target Architecture Design

You are continuing work inside the existing repository:

`marketingbranding/saleslab-internal`

Phase 1 has already produced:

- `SYSTEM_SPEC.md`
- `TASKLIST.md`
- `PHASE_1_AUDIT_REPORT.md`

The repository has also been provided with the SOS KPR Subsidi knowledge pack under:

`docs/sos_kpr_roleplay/`

Your task in this phase is to design the target architecture before implementation begins.

Do not modify runtime code in this phase.

Do not install packages.

Do not change Firebase.

Do not change prompts.

Do not implement migrations.

Do not begin Phase 2.

---

## Primary Objective

Design a maintainable architecture that allows the existing AI roleplay application to use:

- SOS sales methodology
- SPIN probing
- HOME qualification
- FAB presentation
- objection handling
- negotiation
- closing
- after-sales
- structured personas
- structured scenarios
- hidden information
- semantic events
- session state
- evidence-based evaluation
- product knowledge
- company policy
- regulatory references

The design must preserve the existing Next.js, Firebase, Gemini Live, OpenRouter, Ollama, Groq, and current UI flow wherever practical.

---

## Documents That Must Be Read

Read these first:

1. `SYSTEM_SPEC.md`
2. `TASKLIST.md`
3. `PHASE_1_AUDIT_REPORT.md`
4. all files under `docs/sos_kpr_roleplay/`

Then inspect the relevant repository files again before proposing architecture.

---

## Architecture Principles

The target design must clearly separate these layers:

1. Knowledge
2. Persona
3. Scenario
4. Session
5. State
6. Transcript
7. Semantic Events
8. Prompt Compilation
9. AI Providers
10. Evaluation
11. Persistence
12. Admin Configuration

Do not treat persona, scenario, and knowledge as the same thing.

---

## Required Conceptual Model

The architecture should reflect this flow:

```text
Knowledge Sources
    ↓
Knowledge Loader
    ↓
Knowledge Selector
    ↓
Prompt Compiler
    ↓
Roleplay Runtime
    ↓
Transcript + Semantic Events
    ↓
State Reducer
    ↓
Evaluation Engine
    ↓
Feedback + Persistence
```

The architecture must also explain how these concepts differ:

### Knowledge

Reusable domain knowledge such as:

- SOS
- SPIN
- HOME
- FAB
- objection handling
- negotiation
- closing
- company SOP
- project facts
- verified regulation references

### Persona

The AI customer's identity and behavior:

- background
- job
- housing condition
- financial profile
- trust baseline
- skepticism
- hidden information
- objections
- buying signals
- walk-away conditions

### Scenario

The training mission:

- current customer journey stage
- sales goals
- target skills
- expected closing
- forbidden closing
- success conditions
- failure conditions
- duration
- difficulty

### Session

One roleplay instance containing:

- user
- scenario
- persona
- prompt version
- started time
- ended time
- raw transcript
- normalized transcript
- events
- state snapshots
- evaluation result

### State

Runtime customer state such as:

- trust
- patience
- readiness
- pressure
- qualification completeness
- customer stage
- unresolved objections
- revealed information
- buying signals
- compliance flags

---

## Required Architecture Decisions

The design must explicitly answer the following.

### 1. Knowledge Architecture

Define how knowledge is stored and loaded.

Explain whether each category should live in:

- Markdown files
- TypeScript constants
- Firestore
- generated JSON
- hybrid storage

Cover:

- SOS framework
- objection playbook
- product knowledge
- company SOP
- regulation references
- evaluation rubric
- persona defaults
- scenario templates

State which source is authoritative for each category.

---

### 2. Knowledge Retrieval Strategy

Design a retrieval strategy that does not inject the entire knowledge base into every prompt.

Explain how the system selects only the relevant knowledge.

Examples:

- first-call scenario uses approaching, SPIN, HOME, and compliance
- objection scenario uses objection playbook, persona objection, product facts, and relevant SOP
- closing scenario uses buying signals, closing rules, and current customer state

Define:

- retrieval inputs
- retrieval outputs
- selection rules
- fallback behavior
- stale-data behavior
- missing-data behavior

Do not assume an external vector database is required.

Prefer the simplest reliable approach compatible with the current application.

---

### 3. Context Window Management

Define the prompt budget for Gemini Live and text providers.

Explain:

- static context
- dynamic context
- session memory
- transcript summary
- recent turns
- retrieved knowledge
- hidden information
- semantic event rules

Specify what should never be inserted in full.

Define a recommended token or character budget per section.

The architecture should prioritize low voice latency.

---

### 4. Prompt Compiler

Design a reusable prompt compiler shared by voice and text roleplay.

Required output variants:

- compact voice prompt
- standard text prompt
- evaluation prompt
- admin preview prompt

The compiler should accept structured input, for example:

```ts
type RoleplayPromptInput = {
  persona: Persona
  scenario: Scenario
  state: RoleplayState
  knowledge: SelectedKnowledge
  productContext?: ProductContext
  companyPolicy?: CompanyPolicyContext
  regulationContext?: RegulationContext
  promptVersion: string
}
```

Define:

- compiler responsibilities
- section ordering
- provider-specific formatting
- prompt versioning
- validation
- token budget checks
- preview support

---

### 5. Runtime Architecture

Design the runtime for:

- Gemini Live voice
- OpenRouter text
- Ollama text
- Gemini fallback
- reconnect handling
- interruption
- turn finalization
- transcript deduplication

Explain what logic remains inside `CallInterface` and what moves to reusable services.

The design must preserve the current audio lifecycle and cleanup behavior.

---

### 6. Transcript Architecture

Define two transcript layers:

#### Raw Transcript

Direct provider output.

#### Normalized Transcript

Stable turns with:

- sequence number
- role
- text
- timestamp
- source
- finalized status
- confidence when available
- deduplication metadata

Explain how partial and duplicated Gemini Live transcript chunks are handled.

---

### 7. Semantic Event Architecture

Define how semantic events are produced.

Options to evaluate:

- Gemini Live function/tool calls
- post-turn extraction
- hybrid model
- deterministic pattern detection
- evaluator-only extraction

Recommend one approach and justify it.

Events must be separate from spoken AI customer responses.

Define event validation, confidence, persistence, and replay behavior.

---

### 8. State Engine

Design a deterministic state reducer.

Example:

```ts
reduceRoleplayState(
  currentState,
  event
): RoleplayState
```

Explain:

- initial state
- event application
- trust updates
- patience updates
- readiness updates
- qualification updates
- stage transitions
- objection lifecycle
- reveal rules
- buying signal lifecycle
- compliance flags
- hang-up conditions

The state engine should not depend entirely on free-form LLM judgment.

---

### 9. Hidden Information Engine

Define:

- reveal conditions
- never-reveal conditions
- trust thresholds
- question-specific triggers
- event-based triggers
- scenario overrides
- audit logging

Explain how hidden information remains unavailable to the sales trainee until valid conditions are met.

---

### 10. Evaluation Architecture

Design a multi-stage evaluation pipeline:

```text
Normalized Transcript
    ↓
Deterministic Checks
    ↓
Semantic Event Aggregation
    ↓
LLM Evidence Review
    ↓
Weighted Rubric
    ↓
Hard Cap Rules
    ↓
Feedback Generation
```

Explain which scores are:

- deterministic
- event-derived
- LLM-assisted
- manually configurable

Every score must reference evidence from actual transcript turns.

---

### 11. Persistence Architecture

Recommend Firestore document or subcollection structures for:

- personas
- scenarios
- product knowledge
- company policies
- regulation references
- evaluation profiles
- sessions
- transcript turns
- semantic events
- state snapshots
- evaluation evidence
- final evaluations
- prompt versions

Explain:

- read/write patterns
- document size risks
- backward compatibility
- migration strategy
- rules impact
- indexing requirements

---

### 12. Admin Architecture

Define admin capabilities for:

- persona editor
- hidden information editor
- objection editor
- scenario editor
- product knowledge editor
- company policy editor
- regulation reference editor
- scoring profile editor
- prompt preview
- test simulation
- content versioning
- publish/draft status

---

## Agent Architecture

Do not create artificial autonomous agents unless they provide real separation of responsibility.

At minimum, evaluate these logical services:

- Roleplay Orchestrator
- Knowledge Selector
- Prompt Compiler
- Transcript Normalizer
- Semantic Event Extractor
- State Reducer
- Evaluation Engine
- Compliance Checker

Explain whether these should be:

- plain TypeScript modules
- server-side services
- API routes
- Firebase functions
- separate background jobs

Prefer simple modules unless the existing scale justifies more infrastructure.

---

## Required Deliverables

Create the following files in the project root.

---

# 1. `ARCHITECTURE_V2.md`

This is the primary deliverable.

It must contain:

## A. Executive Summary

A concise explanation of the target design.

## B. Current-to-Target Mapping

A table:

| Current Component | Current Responsibility | Target Responsibility | Change Type |

Use:

- keep
- extend
- extract
- replace
- deprecate

## C. Layered Architecture

Describe each layer and dependency direction.

## D. Runtime Flow

Provide step-by-step flow for:

- starting a session
- compiling a prompt
- handling a user turn
- processing AI response
- recording transcript
- generating events
- updating state
- ending session
- evaluating session

## E. Knowledge Architecture

Storage, retrieval, selection, versioning, freshness, and authority.

## F. Context Management

Prompt budgets, memory policy, and low-latency voice constraints.

## G. Prompt Compiler Design

Inputs, outputs, variants, validation, and versioning.

## H. Transcript and Event Design

Raw transcript, normalized turns, events, and deduplication.

## I. State Engine

State schema, reducer behavior, transitions, and reveal logic.

## J. Evaluation Pipeline

Weighted rubric, evidence, hard caps, and compliance.

## K. Persistence Design

Firestore collections, subcollections, compatibility, and rules impact.

## L. Admin Design

Configuration and preview workflows.

## M. Security Design

API keys, admin authorization, Firestore rules, and sensitive data.

## N. Failure Modes

At minimum:

- missing knowledge
- stale regulation
- malformed tool event
- duplicated transcript
- provider disconnect
- incomplete session
- evaluator failure
- oversized prompt
- persona inconsistency

## O. Migration Strategy

Explain how existing scenarios, personas, sessions, and feedback remain usable.

## P. Recommended Implementation Sequence

Provide a staged sequence with dependencies.

## Q. Deferred Decisions

List features that should not be built yet.

---

# 2. `TASKLIST_V2.md`

Rewrite the task list using:

```text
Epic
  → Feature
      → Task
```

Required epics:

1. Domain Foundation
2. Knowledge Engine
3. Prompt Compiler
4. Transcript Normalization
5. Roleplay State Engine
6. Hidden Information Engine
7. Semantic Event System
8. Evaluation Engine
9. Compliance Engine
10. Persistence and Migration
11. Admin Configuration
12. Testing and Rollout

Each task must include:

- ID
- objective
- affected files
- dependencies
- acceptance criteria
- tests
- migration impact
- status

Do not include implementation tasks that duplicate current working behavior.

---

# 3. `ARCHITECTURE_DECISIONS.md`

Record major decisions using this format:

```md
## ADR-001 — Decision Title

**Status:** Proposed

**Context**

...

**Decision**

...

**Alternatives Considered**

...

**Consequences**

...

**Repository Impact**

...
```

At minimum include ADRs for:

- knowledge storage
- knowledge retrieval
- prompt compiler
- transcript normalization
- semantic event generation
- roleplay state reducer
- Firestore session structure
- evaluation pipeline
- API key storage
- text roleplay support

---

# 4. `PHASE_1_5_REVIEW.md`

Create a concise review for the project owner containing:

- recommended architecture
- most important decisions
- highest risks
- first implementation epic
- estimated refactor scope: low / medium / high
- files that should not be modified first
- decisions requiring owner approval

---

## Quality Requirements

- Reference concrete repository paths and symbols.
- Separate confirmed repository facts from proposed design.
- Prefer incremental extension over rewrite.
- Preserve current Gemini Live audio behavior.
- Do not create unnecessary microservices.
- Do not require a vector database unless clearly justified.
- Do not hardcode government regulations.
- Do not place secrets in client-side code or public Firestore documents.
- Do not use one giant prompt.
- Do not make the LLM the only source of runtime state.
- Do not make evaluation scores without transcript evidence.
- Preserve backward compatibility.

---

## Completion Condition

Phase 1.5 is complete only when these files exist and are internally consistent:

- `ARCHITECTURE_V2.md`
- `TASKLIST_V2.md`
- `ARCHITECTURE_DECISIONS.md`
- `PHASE_1_5_REVIEW.md`

After producing them, stop.

Do not begin implementation.
