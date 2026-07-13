# Prompt for Coding Agent

You are working inside an existing AI sales roleplay application.

Your task is to inspect the current codebase and determine how to implement the SOS KPR Subsidi training system described in this directory.

## Mandatory Instructions

1. Do not assume the current architecture.
2. Inspect the repository before proposing changes.
3. Reuse existing models, services, providers, events, prompts, and admin components where appropriate.
4. Do not rewrite working features without a documented reason.
5. Treat the Markdown files in this directory as domain and product requirements.
6. Identify conflicts between these requirements and the current implementation.
7. Do not hardcode current government regulation values unless the project already has verified sources.
8. Make regulatory, product, and company policy data configurable.
9. Preserve roleplay voice latency where possible.
10. Keep customer speech separate from semantic event output.
11. Require evidence for every evaluation score.
12. Add tests for all critical behavior.

## First Deliverable

Produce:

- current architecture summary;
- relevant files and classes;
- gap analysis;
- recommended implementation approach;
- migration impact;
- task breakdown;
- risks;
- questions that cannot be resolved from the repository.

## Second Deliverable

Create or update:

- `SYSTEM_SPEC.md`
- `TASKLIST.md`

The task list must be ordered, testable, and small enough for incremental implementation.

## Third Deliverable

Implement only after the architecture and plan are documented.

## Required Functional Scope

The application must support:

- SOS stages;
- SPIN probing;
- HOME qualification;
- FAB presentation;
- objection handling;
- negotiation;
- stage-appropriate closing;
- persona hidden information;
- trust, patience, and readiness state;
- semantic roleplay events;
- evidence-based evaluation;
- configurable scoring;
- compliance flags;
- admin-managed personas, scenarios, knowledge, and policies.

## Output Style

Be precise. Reference concrete repository paths and symbols. Separate confirmed findings from assumptions.
