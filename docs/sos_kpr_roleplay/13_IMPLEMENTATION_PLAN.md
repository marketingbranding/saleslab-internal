# Implementation Plan for Existing Application

## Phase 1 — Audit Existing System

Coding agent must inspect:

- current framework and architecture;
- live voice provider;
- persona model;
- scenario model;
- transcript storage;
- evaluation service;
- event schema;
- admin panel;
- test coverage;
- current prompt compiler.

Do not rewrite the application before understanding existing components.

## Phase 2 — Data Model

Add or verify entities:

- Persona
- PersonaHiddenInformation
- PersonaObjection
- Scenario
- ScenarioGoal
- ScenarioFailureCondition
- ProductKnowledge
- CompanyPolicy
- RegulationReference
- RoleplaySession
- RoleplayTurn
- RoleplayEvent
- RoleplayStateSnapshot
- EvaluationProfile
- EvaluationResult
- EvaluationEvidence

## Phase 3 — Prompt Compilation

Build prompts from structured sections:

1. Core roleplay safety and consistency.
2. Persona facts.
3. Scenario objective.
4. Hidden information rules.
5. Current state.
6. Project knowledge.
7. Customer response policy.
8. Semantic tool rules.

Avoid placing the entire knowledge base in every live prompt.

## Phase 4 — Live Runtime

Implement:

- session state;
- turn sequence;
- event ingestion;
- hidden information gating;
- trust and patience updates;
- transcript normalization;
- retry and malformed event handling;
- disconnect recovery.

## Phase 5 — Evaluation Pipeline

Recommended:

1. deterministic extraction;
2. semantic event aggregation;
3. LLM evidence review;
4. rubric scoring;
5. hard-cap checks;
6. feedback generation;
7. persistence.

Evaluation must quote or reference transcript turns.

## Phase 6 — Admin Panel

Admin should be able to:

- create personas;
- configure traits;
- define hidden information;
- create objections;
- create scenarios;
- set goals and failure conditions;
- configure scoring weights;
- maintain product facts;
- maintain company SOP;
- mark regulatory data with source and validity date;
- preview compiled prompts;
- run test simulations.

## Phase 7 — Testing

Required tests:

- persona consistency;
- hidden information not leaked early;
- hidden information revealed on valid trigger;
- guarantee language detection;
- scoring hard caps;
- SPIN event extraction;
- HOME coverage;
- scenario-specific expected closing;
- malformed AI tool output;
- evaluation evidence references;
- stale product data behavior;
- prompt token budget.

## Acceptance Criteria

The feature is complete only when:

- at least three personas behave differently;
- at least five scenarios have distinct goals;
- evaluator produces evidence-backed scores;
- critical compliance failures are detected;
- admin can modify content without code changes;
- prompts are versioned;
- tests cover core state transitions.
