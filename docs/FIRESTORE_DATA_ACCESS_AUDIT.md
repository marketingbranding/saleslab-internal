# Firestore Data Access Audit

## Scope

This audit records the Firestore data boundary before any repository abstraction or PostgreSQL migration is introduced.

- Audited branch base: security baseline commit `4b2afba` on top of `main` commit `9dc1062`.
- Audited APIs: `collection`, `doc`, `getDoc`, `getDocs`, `getDocFromServer`, `setDoc`, `updateDoc`, `deleteDoc`, `onSnapshot`, `query`, `where`, `orderBy`, `writeBatch`, `runTransaction`, `serverTimestamp`, `deleteField`, Admin document `get`/`set`/`create`/`update`, Admin `Timestamp`, and `FieldValue.delete`.
- No production use of `addDoc` or query `limit` was found.
- No Firestore converters are used. Snapshot data is generally cast directly to TypeScript interfaces.
- This stage changes no reads, writes, listeners, rules, authentication, or realtime behavior.
- Composite indexes are declared in `config/firestore.indexes.json`: sessions `(userId, createdAt desc)` supports the ordered personal Dashboard query; two persona-submission indexes `(creatorUid, submittedAt desc)` and `(status, submittedAt desc)` exist but are not required by the current client-side ID-sorted listener.

Actual source and `config/firestore.rules` are authoritative. `firebase-blueprint.json` and parts of `docs/DATABASE_SCHEMA.md` describe older or aspirational shapes and do not match the complete live model.

## Executive Summary

The UI is tightly coupled to Firestore, primarily through `app/page.tsx`. The authenticated application maintains broad, app-lifetime listeners even when their consumers are not visible. Admin users sustain full-collection listeners for secrets, memberships, users, submissions, sessions, scenarios, personas, and branches.

Key baseline measurements:

| State | Listener registrations | Normally sustained |
|---|---:|---:|
| Signed out | 0 | 0 |
| Regular user, initial screen | 10 | 9 |
| Admin, settled | 15 | 15 |
| Regular user on Dashboard | 11 | 10 |
| Admin on Dashboard | 16 | 16 |

The difference for a regular user is the attempted `settings/global` listener, which current rules reject because settings are admin-only.

The largest read-amplification risks are:

1. Two simultaneous full `scenarios` listeners in `app/page.tsx`.
2. A persistent `sessions` listener plus another equivalent sessions listener while Dashboard is open.
3. Admin-wide full collection listeners that remain active outside the relevant admin screen.
4. A full `users` listener used only to derive a count.
5. Unbounded session, persona, submission, and secret collection listeners with no `limit`.

## 1. Collection Inventory

### Summary

| Firestore collection/document | Primary owner | Main authorization | Migration difficulty | Future PostgreSQL target |
|---|---|---|---|---|
| `users` | Firebase UID | Owner read/write; admin read | Low-medium | `users` |
| `admins` | Admin grant UID | Admin grant existence | Low | `admin_grants` |
| `branches` | Shared reference data | Signed-in read; admin write | Low-medium | `branches` |
| `userMemberships` | Firebase UID | Owner/admin read; owner create; admin update | Medium | `user_memberships` |
| `scenarios` | Shared training content | Signed-in read; admin write | Medium-high | `scenarios` |
| `scenarioSecrets` | Scenario ID | Admin only | Low | `scenario_secrets` |
| `personas` | Shared approved persona | Signed-in read; admin write | High | `personas`, optionally `persona_versions` |
| `personaSecrets` | Persona ID | Admin only | Low-medium | `persona_secrets` |
| `personaSubmissions` | Creator UID | Owner/admin read; controlled workflow writes | Medium-high | `persona_submissions` |
| `sessions` | Authenticated user UID | Owner/admin read; server writes | High | `roleplay_sessions`, `transcript_turns` |
| `settings` | Singleton/system config | Admin only | Low-medium | `application_settings`, `system_migrations` |
| `test` | None | Default deny | None | No table |

There is no persisted collection named `memberships`. The live Firestore name is `userMemberships`; `membership` and `memberships` are local state names.

### `users/{userId}`

**Document ID**

Firebase Authentication UID. There is no rule-level format validation.

**Observed shape**

| Field | Type | Notes |
|---|---|---|
| `displayName` | string | Required by rules, max 100 |
| `email` | string | Required by rules, max 200; currently browser-written |
| `photoURL` | string or null | Optional |
| `updatedAt` | Firestore Timestamp | Browser `serverTimestamp()` |
| `role` | string | Legacy field used only by dormant `AdminPanel`; not authoritative |
| Additional fields | unrestricted | Rules do not use `hasOnly` |

**Owner/admin fields**

- Owner field is implicit in document ID.
- Admin authority is not `users.role`; it is `/admins/{uid}` existence.
- Canonical email, role, account state, and audit timestamps should eventually become server-owned.

**Reads**

- Current profile realtime listener: `lib/AuthContext.tsx:43`.
- Admin full user count listener: `app/page.tsx:541-557`.
- Dormant admin list one-shot read: `components/AdminPanel.tsx:42-65`.

**Writes**

- Profile completion merge write: `components/CompleteProfileModal.tsx:20-40`.
- Dormant role update attempt: `components/AdminPanel.tsx:105-115`; current rules deny cross-user admin writes.

**Realtime subscribers**

- `users/{currentUid}` for every authenticated user.
- Entire `users` collection for every settled admin, regardless of active screen.

**Security rule**

Owner or admin may read. Only owner may write. Required `displayName` and `email` are validated, but additional keys and email authenticity are not.

**Migration notes**

Difficulty is low-medium. Reconcile stored email against Firebase Auth and remove reliance on legacy `role`. Keep Firebase Auth as identity provider; use Firebase UID as the first PostgreSQL primary/foreign key.

**PostgreSQL recommendation**

`users(firebase_uid primary key, email, display_name, photo_url, status, created_at, updated_at)` plus a separate `admin_grants` table.

### `admins/{adminId}`

**Document ID**

Firebase Authentication UID.

**Observed shape**

The bootstrap script writes `uid`, `label`, `email`, `bootstrappedAt`, and `bootstrappedBy`. Rules tests also permit a minimal `{label}` document because field shape is unrestricted.

**Owner/admin fields**

All fields are administrative. Authorization depends only on document existence, not field values.

**Reads**

- Current-user admin grant realtime listener: `app/page.tsx:304-316`.
- Rule predicate checks existence: `config/firestore.rules:17-20`.

**Writes**

- Server bootstrap merge set: `scripts/bootstrap-admin.ts:14-23`.
- Existing admins may create/update grants in client rules; admins may delete other admins but not themselves.

**Realtime subscribers**

Every authenticated user listens to their own admin document.

**Security rule**

Owner/admin read. Existing admins create/update. Admins can delete another admin but not their own grant. Normal users cannot self-grant.

**Migration notes**

Difficulty is low. Audit fields are heterogeneous and should not be trusted as immutable history.

**PostgreSQL recommendation**

`admin_grants(user_id primary key, label, granted_by, granted_at, source, revoked_by, revoked_at)`. Grant/revoke should be server-only.

### `branches/{branchId}`

**Document ID**

Default branch slugs such as `kc-bandung` and `kcp-tegal`, or browser-generated `branch-${Date.now()}`. Rules require max 128 and `[A-Za-z0-9_-]+`. Stored `id` must equal document ID.

**Observed shape**

`id`, `name`, `normalizedName`, optional `type` (`KC`/`KCP`), `status` (`active`/`archived`), `createdBy`, `createdAt`, and `updatedAt`.

**Owner/admin fields**

No owner. `createdBy` and timestamps are admin-browser audit fields and should become server-owned.

**Reads**

- Full realtime collection for every user: `app/page.tsx:318-347`.

**Writes**

- Default seed batch: `app/page.tsx:361-393`.
- Create: `app/page.tsx:726-744`.
- Rename plus membership propagation batch: `app/page.tsx:746-769`.
- Delete after browser-side membership count check: `app/page.tsx:771-779`.

**Realtime subscribers**

One full collection listener for every authenticated user.

**Security rule**

Signed-in read; admin create/update/delete. Create must be active. Current update rule does not allow changing status even though archived is a valid data value.

**Migration notes**

Difficulty is low-medium. Check duplicate normalized names and dangling memberships before adding constraints. Browser-only delete safety is not a transactional integrity guarantee.

**PostgreSQL recommendation**

`branches(id primary key, name, normalized_name unique, type, status, created_by, created_at, updated_at)`.

### `userMemberships/{userId}` (`memberships` domain)

**Document ID**

Firebase UID. Stored `userId` must match the document ID.

**Observed shape**

`userId`, `email`, `displayName`, `branchId`, `branchName`, `selectedAt`, `updatedAt`, and optional `updatedBy`.

**Owner/admin fields**

- Owner is `userId`/document ID.
- Except for path-bound `userId`, every membership value is effectively admin-mutable, including email, display name, branch fields, selected timestamp, update timestamp, audit actor, and arbitrary extra keys.
- Email, display name, and branch name are denormalized snapshots.

**Reads**

- Current membership realtime document: `app/page.tsx:335-341`.
- Admin full membership collection listener: `app/page.tsx:412-423`.

**Writes**

- User initial selection: `app/page.tsx:713-724`.
- Branch rename propagation batch: `app/page.tsx:753-767`.
- Admin reassignment: `app/page.tsx:781-790`.

**Realtime subscribers**

- Every authenticated user listens to their own membership.
- Every admin also listens to the entire collection, duplicating their own document.

**Security rule**

Owner/admin read. Owner can create once with verified profile/email/active branch and request-time timestamps. Only admin updates/deletes. Admin updates do not enforce exact keys, request-time timestamps, or immutable profile snapshots; extra keys are not prohibited.

**Migration notes**

Difficulty is medium. Reconcile denormalized snapshots with canonical users and branches before foreign keys.

**PostgreSQL recommendation**

`user_memberships(user_id primary key references users, branch_id references branches, selected_at, updated_at, updated_by)`. Do not carry copied names/emails into the normalized table.

### `scenarios/{scenarioId}`

**Document ID**

Persisted custom IDs use `custom-${Date.now()}`, `scenario-${Date.now()}`, and fallback underscore variants. Built-in string slugs are code-defined rather than Firestore records unless an admin creates an override document under the same ID. Create rules validate max 128 and `[A-Za-z0-9_-]+`. A duplicate `id` field commonly exists but is not rule-enforced against the path.

**Observed shape**

The public shape follows `SalesScenario` in `lib/gemini.ts`: `id`, optional `personaId`, title/description/target/profile, difficulty, icon, persona identity and behavior fields, first speaker, optional opening message/success criteria/base XP/status. Firestore writes also add `userId`, `createdAt`, or `updatedAt`.

**Owner/admin fields**

Shared content has no effective owner. `userId`, status, creator, and audit timestamps are admin-browser-controlled and should be server-owned. `hiddenRules` is a legacy public field that is migrated into `scenarioSecrets`.

**Reads**

- Full listener for stats: `app/page.tsx:425-442`.
- Duplicate full listener for scenario data: `app/page.tsx:497-516`.
- Dormant third listener in `components/AdminPanel.tsx:68-90` if that component is reintroduced.

**Writes**

- Create/edit with paired secret batch: `app/page.tsx:563-594` and `634-656`.
- Paired public/secret deletes: `app/page.tsx:607-614` and `660-663`.
- Legacy secret transaction: `app/page.tsx:283-302`.

**Realtime subscribers**

Two simultaneous complete-collection listeners for every authenticated user.

**Security rule**

Signed-in read. Admin create/update/delete. Rules validate only a subset of fields and forbid public `hiddenRules` on current writes.

**Migration notes**

Difficulty is medium-high. Preserve built-in-code override semantics, current string IDs, optional persona references, and legacy timestamps/statuses. Migrate scenarios before personas only if `personaId` remains an unconstrained text reference until persona backfill finishes.

**PostgreSQL recommendation**

`scenarios` with typed public fields and JSONB only for arrays such as success criteria; `scenario_secrets` for restricted content.

### `scenarioSecrets/{scenarioId}`

**Document ID**

Same logical ID as scenario. Rules enforce valid ID but do not require a matching scenario.

**Observed shape**

`hiddenRules`, `updatedAt`, and `updatedBy`.

**Owner/admin fields**

All fields are admin-only. Audit actor/timestamp is browser-written.

**Reads**

- Full admin collection listener: `app/page.tsx:239-251`.

**Writes**

- Legacy migration transaction: `app/page.tsx:287-301`.
- Paired scenario batches: `app/page.tsx:578-588`, `611-614`, `640-652`, and `660-663`.

**Realtime subscribers**

Every settled admin, on every screen.

**Security rule**

Admin-only read/write. Field shape and matching public document are not validated.

**Migration notes**

Difficulty is low after identifying orphan rows and remaining public legacy fields.

**PostgreSQL recommendation**

`scenario_secrets(scenario_id primary key references scenarios on delete cascade, hidden_rules, updated_by, updated_at)`.

### `personas/{personaId}`

**Document ID**

Usually `persona-${Date.now()}`; fallback admin writes support `persona_${Date.now()}`. Rules require valid ID on writes but do not require stored `id` to match path.

**Observed shape**

The public persona has identity, background, goals/fears/motivations, personality metrics, speech settings, common phrases/objections, triggers, and escalation behavior. Approval/provenance adds status, version, source submission, creator UID/name/email/branch snapshots, created/updated/approved timestamps, and approver UID.

See `lib/personas.ts:56-94` and `toPersonaPublicData()` at `lib/personas.ts:157-185`.

**Owner/admin fields**

- Approved personas are shared; `creatorUid` is provenance, not an access owner.
- Status, version, approval identity, creator snapshots, and timestamps are currently admin-browser-written and should be server-owned.
- `hiddenInstructions`, `personaKnowledge`, and `personaUnknowns` are legacy public fields now stored in `personaSecrets`.

**Reads**

- Full collection listener for every user: `app/page.tsx:518-539`.

**Writes**

- Admin public/secret batch save: `app/page.tsx:669-700`.
- Archive merge write: `app/page.tsx:702-710`.
- Approval/revision transaction: `app/page.tsx:815-865`.
- Legacy secret migration transaction: `app/page.tsx:253-281`.

**Realtime subscribers**

Every authenticated user receives the entire public persona library.

**Security rule**

Signed-in read; admin create/update/delete. Public secret field names are forbidden, but direct admin persona shape is otherwise weakly validated.

**Migration notes**

Difficulty is high due to the wide shape, weak historical validation, synthetic `System / Admin` provenance, revisions, and secret relocation.

**PostgreSQL recommendation**

`personas` with typed scalar fields, approval metadata, and optional `persona_versions`; restricted fields in `persona_secrets`.

### `personaSecrets/{personaId}`

**Document ID**

Same logical ID as persona; matching public document is not enforced.

**Observed shape**

`hiddenInstructions`, `personaKnowledge`, `personaUnknowns`, `updatedAt`, and `updatedBy`.

**Owner/admin fields**

All fields are admin-only. Audit fields are admin-browser-written.

**Reads**

- Full admin collection listener: `app/page.tsx:215-237`.

**Writes**

- Legacy migration: `app/page.tsx:258-280`.
- Admin save batch: `app/page.tsx:674-696`.
- Approval transaction: `app/page.tsx:818-865`.

**Realtime subscribers**

Every settled admin, on every screen.

**Security rule**

Admin-only read/write with valid ID; shape and matching persona are not validated.

**Migration notes**

Difficulty is low-medium. Reconcile legacy public values and remove orphan secrets.

**PostgreSQL recommendation**

`persona_secrets(persona_id primary key references personas on delete cascade, hidden_instructions, persona_knowledge, persona_unknowns, updated_by, updated_at)`.

### `personaSubmissions/{submissionId}`

**Document ID**

`submission-${Date.now()}-${first12UidCharacters}`. The nested `id` must match the path and satisfy the global ID rule.

**Observed shape**

`id`, strict nested public `persona`, status, creator UID/name/email/branch snapshots, submitted/updated timestamps, optional target persona and previous submission, plus review actor/time/rejection reason.

**Owner/admin fields**

- Owner is `creatorUid`.
- Review status, reviewer identity, target persona, review timestamp, and rejection reason are admin workflow fields.
- Creator snapshots are intentionally denormalized historical data.

**Reads**

- User query by `creatorUid`; admin full collection: `app/page.tsx:395-410`.

**Writes**

- User create: `app/page.tsx:793-813`.
- Admin approval transaction: `app/page.tsx:818-865`.
- Admin rejection merge: `app/page.tsx:869-879`.

**Realtime subscribers**

All users listen to their own submissions across every screen. Admins listen to all submissions across every screen.

**Security rule**

This is the strictest browser-written collection. Create validates ownership, membership, branch, request-time timestamps, exact keys, nested persona ranges, and revision chain. Admin update is restricted to pending-to-approved/rejected transitions. Delete is denied.

**Migration notes**

Difficulty is medium-high. Preserve immutable payload snapshots and revision chains. Validate missing target/previous references before adding FKs.

**PostgreSQL recommendation**

`persona_submissions` with creator/reviewer FKs, status, timestamps, target/previous references, and `persona_payload jsonb` for the immutable submitted snapshot.

### `sessions/{sessionId}`

**Document ID**

Client-generated `session_${crypto.randomUUID()}` or fallback. API validation enforces max 128 and `[A-Za-z0-9_-]+`.

**Observed top-level shape**

`scenarioId`, `salespersonName`, transcript turns, authenticated `userId`, score, analysis status/attempt/error/provider, transcript quality, SHA-256 input digest, created/updated/completed timestamps, optional persona ID/version, and nested feedback.

**Nested feedback JSON**

The normalized payload contains overall score/grade/summary/verdict, string-array guidance fields, skill scores with evidence, and `evaluationV2` containing dimensions, canonical evidence, evidence diagnostics, HOME summary, compliance flags, weighted scoring diagnostics, and score adjustment diagnostics. The canonical response type is `TrialEvaluationResponse` in `lib/sos/evaluation/result-normalizer.ts:25-82`.

**Owner/admin/server fields**

- Owner is server-derived `userId`.
- Score, feedback, provider, digest, status, attempts, timestamps, and errors are server-owned.
- Scenario/transcript/salesperson/persona inputs originate from the client but are validated and persisted by the server.

**Reads**

- Persistent owner/all realtime listener: `app/page.tsx:425-495`.
- Duplicate ordered Dashboard listener: `components/Dashboard.tsx:49-81`.

**Writes**

- Server initialization/idempotency transaction: `app/api/analyze/route.ts:113-158`.
- Server failed-state transaction: `app/api/analyze/route.ts:169-184`.
- Server completion transaction: `app/api/analyze/route.ts:207-221`.
- Admin browser delete: `components/Dashboard.tsx:89-99`.

**Realtime subscribers**

- Regular users receive all of their sessions throughout the app.
- Admins receive all sessions throughout the app.
- Dashboard mounts a second query over the same document scope.

**Security rule**

Owner/admin read. Client create/update denied. Admin delete. Server Admin SDK bypasses rules to create/finalize evaluation.

**Migration notes**

Difficulty is high. Historical feedback versions, large transcripts, missing Firestore scenario/persona references, and date variants require staged backfill and exception reporting.

**PostgreSQL recommendation**

Use `roleplay_sessions`, `transcript_turns`, `analysis_reports`, `analysis_skill_scores`, and optionally `analysis_evidence`. Preserve the original feedback as JSONB during transition for lossless compatibility.

### `settings/{settingsId}`

#### `settings/global`

**Document ID and shape**

Fixed ID `global`. Fields include model provider, Ollama/OpenRouter model names, thinking delay, frustration sensitivity, updated actor/time, and legacy `ollamaUrl`. `openRouterApiKey` is a prohibited legacy field with a cleanup script.

**Owner/admin fields**

All settings are admin-only. Provider secrets and provider endpoint targets must remain server environment/secret-manager owned. Update actor/time is currently browser-authored.

**Reads**

- Persistent browser listener: `app/page.tsx:201-213`.
- One-shot browser utility read at call start/reconnect: `lib/firebase.ts:76-85`, invoked by `components/CallInterface.tsx:371`.
- Server text route one-shot read per request: `app/api/roleplay/text/route.ts:64`.
- Dormant `AdminPanel` listener: `components/AdminPanel.tsx:93-103`.

**Writes**

- `components/AdminSettingsModal.tsx:26-46`.
- `components/admin/AISettings.tsx:25-47`.
- Legacy secret removal: `scripts/cleanup-openrouter-key.ts:4-12`.

**Realtime subscribers**

Every authenticated client attempts the persistent listener, but normal users are denied. Admins sustain it.

**Security rule**

Admin-only read/write. `openRouterApiKey` is forbidden; other keys/types are not constrained.

#### `settings/branchCatalog`

Shape is `version`, `seededAt`, and `seededBy`. It has an admin listener and is written in the default branch seed batch at `app/page.tsx:349-393`.

**Migration notes**

Difficulty is low-medium. Remove any legacy key, discard obsolete endpoint fields, and validate arbitrary historical fields.

**PostgreSQL recommendation**

`application_settings` for validated non-secret configuration and `system_migrations`/`seed_markers` for branch catalog state. Keep provider credentials outside PostgreSQL.

### `test/connection`

`lib/firebase.ts:88-100` performs a browser `getDocFromServer` connection probe on module load. No matching rule or writer exists, so default deny normally rejects it.

No PostgreSQL table is recommended. Replace it later with a health endpoint or permitted lightweight query.

## 2. Component Coupling Inventory

### React files importing Firestore directly

| React component/hook | Access class | Realtime | Mutation | Transaction/batch | Admin-only | Trial-critical |
|---|---|---:|---:|---:|---:|---:|
| `app/page.tsx` | Read and mutation hub | Yes | Yes | Yes | Mixed | Yes |
| `lib/AuthContext.tsx` | Read-only profile hook | Yes | No | No | No | Yes |
| `components/Dashboard.tsx` | Read plus delete | Yes | Yes | No | Delete only | No |
| `components/AdminPanel.tsx` | Read plus mutation, currently dormant | Yes | Yes | No | Intended | No |
| `components/CompleteProfileModal.tsx` | Mutation | No | Yes | No | No | Authentication/profile critical |
| `components/AdminSettingsModal.tsx` | Mutation | No | Yes | No | Yes | No |
| `components/admin/AISettings.tsx` | Mutation | No | Yes | No | Yes | No |

No file under `hooks/` imports Firestore directly.

### Test-only direct Firestore access

`tests/firestore/firestore.rules.test.ts` imports the client Firestore API to seed emulator data with rules disabled and assert allowed/denied reads and writes. It also invokes both Firestore-backed API routes to verify Admin session persistence and server-side settings access. These operations are test-only and are excluded from production listener counts.

### Non-React Firestore access modules

| Module | Access |
|---|---|
| `lib/firebase.ts` | Firestore initialization; one-shot settings and connection reads |
| `lib/server/firebase-admin.ts` | Server Admin initialization and named database selection |
| `app/api/analyze/route.ts` | Server transactions over sessions |
| `app/api/roleplay/text/route.ts` | Server one-shot settings read |
| `scripts/bootstrap-admin.ts` | Server admin grant write |
| `scripts/cleanup-openrouter-key.ts` | Server settings read/update |

### Coupling observations

- `app/page.tsx` directly knows collection names, rule-sensitive ownership, legacy migrations, data normalization, listener lifecycles, and UI callbacks. It is the highest-priority future repository boundary, but broad refactoring is intentionally out of scope here.
- `Dashboard` re-queries sessions that `app/page.tsx` already owns.
- `AdminPanel` is not imported anywhere. If restored, it adds duplicate scenarios/settings subscriptions and contains a role mutation that current rules deny.
- `FeedbackView` no longer imports Firestore; session persistence is correctly routed through `/api/analyze`.

## 3. Realtime Necessity Audit

There are 18 `onSnapshot` call sites: 14 in `app/page.tsx`, two in dormant `AdminPanel`, one in `Dashboard`, and one in `AuthContext`.

| Listener | Current lifecycle | Classification | Rationale |
|---|---|---|---|
| `users/{uid}` profile | App lifetime | Realtime required under current UX | Profile completion is observed without explicit state plumbing |
| `settings/global` | App lifetime | Fetch-on-load sufficient; admin-only | Normal users are denied; admin changes are infrequent |
| `personaSecrets` | Admin app lifetime | Active-screen only | Used only by persona admin workspace |
| `scenarioSecrets` | Admin app lifetime | Active-screen only | Used only by scenario admin workspace |
| `admins/{uid}` | App lifetime | Realtime required | Immediate grant/revocation reflection |
| `branches` | App lifetime | Polling acceptable | Changes are infrequent; realtime is useful only in selection/admin views |
| `userMemberships/{uid}` | App lifetime | Realtime justified | Admin reassignment should reach an online user promptly |
| `settings/branchCatalog` | Admin app lifetime | Fetch-on-load sufficient | One-time seed marker |
| `personaSubmissions` | App lifetime | Active-screen only | Needed on Persona Saya/admin review screens |
| All `userMemberships` | Admin app lifetime | Active-screen only | Needed only by Branch Manager |
| `scenarios` stats listener | App lifetime | Duplicate listener | Same collection already loaded below |
| `sessions` parent listener | App lifetime | Active-screen realtime/polling acceptable | Shared by many screens, but unnecessary during unrelated screens |
| `scenarios` data listener | App lifetime | Keep one or poll | This is the useful scenario data source |
| `personas` | App lifetime | Fetch-on-load/polling acceptable | Needed on main screen; continuous updates optional |
| All `users` count | Admin app lifetime | Active-screen only/aggregate | Full documents are read only to derive a count |
| Dashboard `sessions` | Dashboard mount | Duplicate/overlapping listener | Equivalent scope for regular users and admin `all`; admin `personal` overlaps a filtered subset of the parent all-session listener |
| Dormant AdminPanel `scenarios` | Modal open | Duplicate listener | Duplicates parent if component is restored |
| Dormant AdminPanel `settings/global` | Modal open | Duplicate listener | Duplicates parent if component is restored |

### Duplicate listeners

1. `scenarios` is subscribed twice for every authenticated user: stats at `app/page.tsx:434-442` and data at `502-515`.
2. `sessions` is subscribed by `app/page.tsx` and again by `Dashboard` while Dashboard is mounted. Scope is equivalent for regular users and admin `all`, but only overlapping for admin `personal`.
3. Admins listen to their membership document and the full membership collection.
4. `settings/global` has a persistent listener plus one-shot roleplay reads; dormant `AdminPanel` would add another listener.
5. Direct account switching can overwrite `unsubProfile` in `AuthContext` without first closing a previous non-null user's listener.

## 4. Data-Shape Audit

### Duplicate interfaces

Session-shaped interfaces are declared independently in:

- `app/page.tsx` (`SessionData`)
- `components/Dashboard.tsx` (`Session`)
- `components/MissionHistory.tsx` (`HistorySession`)
- `components/PerformanceScreen.tsx` (`PerfSession`)
- `components/PerformanceDashboard.tsx`
- `components/TrainingScreen.tsx`
- `components/AchievementsScreen.tsx`
- `components/admin/AdminDashboard.tsx`

Feedback subsets and the `Good | Fair | Poor | Not Done` rating union are repeated across these files. Transcript turn `{role: 'user' | 'model'; text: string}` is repeated in UI, API validation, and roleplay code.

No type extraction is performed in this stage because these declarations represent different legacy tolerances and consumer subsets. A later type-only stage should introduce `TranscriptTurn`, `SalesPathRating`, `SessionFeedback`, and a migration-tolerant `SessionRecord`, with screen props using `Pick`.

### `any` and `unknown`

Firestore-related `any` includes:

- `app/page.tsx`: `SessionData.createdAt`, settings state, error handling, scenario status cast.
- `components/Dashboard.tsx`: session `createdAt`, leaderboard `lastSeen`.
- `components/AdminSettingsModal.tsx`, `components/AdminPanel.tsx`, and `components/admin/AISettings.tsx`: settings/entry shapes.
- Session props in Mission History, Performance, Training, Achievements, and Admin Dashboard.

Persona-domain interfaces use `unknown` for Firestore dates in `lib/personas.ts`. This is safer than `any`, but no shared timestamp boundary exists.

### Timestamp inconsistencies

- Browser writes use `serverTimestamp()`.
- Server routes/scripts use Admin `Timestamp.now()`.
- Rules tests seed JavaScript `Date`, which the emulator serializes as timestamps.
- Most session UI types declare `createdAt: any`.
- Some consumers call `.toDate()` directly; others tolerate `Timestamp | Date | string`.
- `firebase-blueprint.json` incorrectly documents some dates as ISO strings.

A future shared type should deliberately choose either strict `Timestamp` at the Firestore adapter boundary or a migration-tolerant union plus one normalization helper.

### Nested JSON structures

- `personaSubmissions.persona` is a strict nested immutable public persona snapshot.
- `sessions.transcript` is an array of role/text objects.
- `sessions.feedback` is a large versioned evaluation graph with skill scores, evidence, HOME diagnostics, compliance, weighted scoring, and score adjustment.
- `scenarios.successCriteria` is an optional string array.

For PostgreSQL migration, preserve nested payloads as JSONB first, then normalize high-value query domains incrementally.

### Inconsistent naming

- Persisted `userMemberships` versus local `membership`/`memberships`.
- Actor fields: `userId`, `createdBy`, `creatorUid`, `approvedBy`, `reviewedByUid`, `updatedBy`, `seededBy`, and `bootstrappedBy`.
- Both hyphen and underscore timestamp-based IDs exist.
- Many documents duplicate the Firestore document ID in `id`, but equality is enforced only for some collections.
- Settings writers use `thinkingDelay`; `SettingsScreen` declares `responseDelay`.
- Difficulty/status vocabularies differ between domains.
- `users.role` is legacy and unrelated to `/admins/{uid}` authorization.

### Legacy fields

- Public scenario `hiddenRules` moved to `scenarioSecrets`.
- Public persona `hiddenInstructions`, `personaKnowledge`, and `personaUnknowns` moved to `personaSecrets`.
- `settings/global.openRouterApiKey` is prohibited and removed by cleanup script.
- `settings/global.ollamaUrl` remains a legacy browser-oriented field; the secure text route uses server `OLLAMA_BASE_URL`.
- Older session readers may expect `salesPathEvaluation`, while current evaluator emits `skillScores` and `evaluationV2`.
- `firebase-blueprint.json` and parts of `docs/DATABASE_SCHEMA.md` are stale.

### Server-owned fields

Sessions already correctly keep these server-owned:

- `userId`
- score and feedback
- analysis status, attempt, error, and provider
- input digest
- created/updated/completed timestamps

### Browser-written fields that should become server-owned

Future hardening should move these behind server commands without changing them in this audit stage:

- Canonical user email, account role/status, and user audit timestamps.
- Admin grant/revoke and audit metadata.
- Branch creator/timestamps/status transitions and referential delete checks.
- Membership reassignment audit metadata.
- Scenario/persona creator, approver, version, status, and audit timestamps.
- Persona review actor/name/timestamps.
- Settings update/seed actor and timestamps.
- All secret documents.

## 5. Migration Order Recommendation

The migration should remain incremental. Firebase Auth stays in place and Firestore remains authoritative until each collection has a verified dual-read/cutover plan. Before FK-backed tables are introduced, create a minimal identity spine containing Firebase UID only; this is not a user-profile cutover and does not replace Firebase Auth.

### Recommended sequence, safest to riskiest

0. **Minimal Firebase identity spine**
   - Mirror only Firebase UID and lifecycle metadata needed for foreign keys.
   - Keep Firebase Auth and Firestore user profiles authoritative.
1. **Branches**
   - Small reference set and simple shape.
   - Validate normalized-name uniqueness first.
2. **Settings and seed markers**
   - Small singleton data.
   - Keep credentials in environment/secret manager, not PostgreSQL.
3. **Admin grants shadow table**
   - Mirror `/admins/{uid}` while Firestore remains the authorization source.
   - Do not switch authorization in this step.
4. **Scenarios and scenario secrets**
   - Preserve string IDs and built-in override behavior.
   - Keep `personaId` as an unconstrained text reference until personas migrate.
5. **Personas and persona secrets**
   - Backfill legacy defaults and secret relocation exceptions.
   - Decide version-history strategy before enforcing writes.
6. **Persona submissions**
   - Preserve immutable JSON snapshot and revision links.
7. **User memberships**
   - Requires branch and user identity reconciliation.
   - Remove denormalized names only after canonical reads exist.
8. **Sessions**
   - First mirror top-level metadata and original feedback JSON losslessly.
9. **Evaluations, evidence, and transcripts**
   - Split nested session JSON into child tables after parity checks.
10. **User profile data and authentication last**
   - Keep Firebase UID as identity key.
   - Replacing Firebase Auth is explicitly outside the current direction.

### Required exception reports before foreign keys

- Memberships pointing to missing users/branches.
- Duplicate normalized branch names.
- Scenarios pointing to missing personas.
- Sessions pointing to code-only/deleted scenarios or personas.
- Orphan scenario/persona secret documents.
- Public documents still containing secret fields.
- Submission chains with missing previous/target documents.
- Non-Timestamp date values.
- Stored user email differing from Firebase Auth.

## 6. Baseline Measurements

### Listener counts

| Application state | Listener detail |
|---|---|
| Signed out | No Firestore listeners; Firebase Auth observer only |
| Regular initial load | Profile, settings attempt, admin grant, branches, own membership, own submissions, scenarios twice, own sessions, personas |
| Settled admin | Regular set plus persona secrets, scenario secrets, branch seed marker, all memberships, and all users; owner queries switch to all submissions/sessions |
| Dashboard | Adds another ordered sessions listener |
| History/performance/achievements | No child listener; uses parent sessions state |
| Current AdminLayout tabs | No child listeners; uses parent state |
| Roleplay call | Adds one-shot `settings/global` read on mount/reconnect, not a listener |

### Initial-load read amplification

- Every scenario document is initially read twice because two equivalent listeners start.
- A regular user attempts an unauthorized settings listener before falling back.
- An admin initially starts owner-scoped submissions/sessions, then resubscribes to full collections once the admin document resolves.
- Admins read every user document just to derive `totalUsers`.
- Admins subscribe to all secret documents even when not in the admin scenario/persona screens.
- No production collection query uses `limit`; collection growth directly increases initial read volume.

### Dashboard amplification

- Parent sessions listener remains active.
- Dashboard adds a second ordered query over the same owner/all scope.
- Admin Dashboard therefore sustains 16 listeners and receives every session document twice.

### Duplicate subscriptions

| Data | Duplicate source | Impact |
|---|---|---|
| Scenarios | Two `app/page.tsx` listeners | Double initial and update reads |
| Sessions | Parent plus Dashboard | Double reads in regular/admin-all mode; overlapping reads in admin-personal mode |
| Memberships | Admin own document plus full collection | Small overlap but redundant |
| Settings | Persistent listener plus call-time read | Repeated document read; normal user denial |
| Dormant AdminPanel | Scenarios and settings | Would duplicate active parent listeners if restored |

## 7. Access Operation Index

### Client operations found

| API | Production use |
|---|---|
| `collection` / `query` | Collection listeners and one-shot admin list reads |
| `doc` | Fixed and computed document references |
| `getDoc` | `settings/global` utility read |
| `getDocFromServer` | Denied `test/connection` probe |
| `getDocs` | Dormant AdminPanel user list |
| `setDoc` | Profiles, settings, branches, memberships, submissions, persona archive/reject |
| `updateDoc` | Dormant AdminPanel user role |
| `deleteDoc` | Dashboard admin session deletion |
| `onSnapshot` | 18 call sites |
| `where` | Owner-scoped submissions/sessions |
| `orderBy` | Dashboard session date ordering |
| `writeBatch` | Scenario/secret pairs, branch seed/rename/delete, persona/secret save |
| `runTransaction` | Secret migrations and persona approval |
| `serverTimestamp` | Browser audit/workflow timestamps |
| `deleteField` | Legacy secret removal |
| `addDoc` | Not found |
| `limit` | Not found |

### Server Admin operations found

- Session `get/create/update` transactions in `/api/analyze`.
- One-shot `settings/global` read in `/api/roleplay/text`.
- Admin grant merge set in bootstrap script.
- Legacy OpenRouter field get/update/delete in cleanup script.
- Admin code uses `Timestamp.now()` and `FieldValue.delete()`; no Admin realtime listeners are present.

## 8. Recommended Boundary for a Later Stage

This audit does not introduce a repository abstraction. A future stage should start with a narrow, behavior-preserving interface around one low-risk collection, preferably branches, and retain Firestore listener semantics behind that interface.

Recommended principles:

- Keep Firebase Auth UID as the identity key.
- Separate persisted document types from UI view models.
- Centralize timestamp conversion at the data boundary.
- Model one-shot reads and realtime subscriptions as distinct repository methods.
- Preserve unsubscribe behavior explicitly.
- Keep server-owned session evaluation outside browser repositories.
- Add runtime validation or Firestore converters before claiming TypeScript interfaces are authoritative.
- Do not dual-write until an idempotent backfill and reconciliation report exist.

## 9. Audit Conclusions

The safest first decoupling target is branches, followed by settings. Sessions are the riskiest because they combine ownership, evaluator state, transcript arrays, large versioned feedback JSON, realtime dashboards, and historical shape drift.

The first repository-abstraction stage should not begin by moving `app/page.tsx` wholesale. It should introduce one typed boundary, prove parity, and then migrate consumers collection-by-collection while preserving the current Firestore implementation underneath.
