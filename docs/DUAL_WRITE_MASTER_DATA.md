# Dual-Write Master Data

Dual-write is limited to branches and global settings. Scenarios, sessions, transcripts, evaluations, authentication, admin grants, and persona secrets are excluded.

## Runtime Modes

### `DATA_BACKEND=firestore`

- Reads and subscriptions use Firestore.
- Authenticated master-data commands write Firestore only.
- PostgreSQL modules are not loaded or initialized.

### `DATA_BACKEND=dual-write`

- Reads and subscriptions still use Firestore.
- The server command verifies Firebase Auth and the Firestore admin grant.
- Firestore commits first.
- PostgreSQL projection runs second with the same branch/settings ID.
- PostgreSQL failure returns a primary-committed result instead of reporting a Firestore failure.

### `DATA_BACKEND=postgres`

Application master-data commands reject this mode. PostgreSQL-only runtime is not enabled.

## Operation Records

Firestore stores safe synchronization metadata in:

- `dataSyncOperations/{operationId}`
- `dataSyncMismatches/{operationId}`

These records contain IDs, revisions, hashes, state, error category, and differing field names. They do not contain database URLs, credentials, full settings, full branch documents, transcripts, persona secrets, or driver error messages.

PostgreSQL stores `data_sync_receipts` in the same transaction as the projection. Replaying an operation ID with the same fingerprint is safe. Reusing it with different content is rejected.

Each mirrored row stores a Firestore source revision and source hash. Normal dual-write operations cannot overwrite a newer PostgreSQL revision.

## Comparison

Read-only comparison is the default:

```bash
npm run compare:data -- --collection=branches
npm run compare:data -- --collection=settings
```

The JSON report contains only IDs and allowlisted field names:

- `missingInPostgres`
- `missingInFirestore`
- `fieldMismatch`
- `timestampMismatch`
- `archivedStatusMismatch`

Comparison does not repair or delete anything by default.

## Explicit Repair

Firestore is always the repair source. Repair requires both flags:

```bash
npm run compare:data -- --collection=branches --repair --confirm-firestore-authoritative --confirm-project=<FIREBASE_PROJECT_ID> --confirm-firestore-database=<FIRESTORE_DATABASE_ID> --confirm-postgres-target=<host[:port]/database>
```

The same flags apply to settings. Repair upserts Firestore values into PostgreSQL and removes PostgreSQL-only branch rows. It never writes PostgreSQL values back to Firestore.

Run a read-only comparison before and after repair. Do not schedule repair automatically in production.

## Deployment

1. Apply Drizzle migrations, including the dual-write receipt/revision migration.
2. Configure a pooled server-only `DATABASE_URL`.
3. Keep `DATA_BACKEND=firestore` for initial deployment validation.
4. Run read-only comparison and retain the report.
5. Enable `DATA_BACKEND=dual-write` only after PostgreSQL connectivity is healthy.
6. Monitor open `dataSyncMismatches` records.
7. Return to `firestore` mode immediately if PostgreSQL instability affects latency.

No production data migration is performed by application startup, build, or deployment.
