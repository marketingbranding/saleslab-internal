# Database Migrations

Drizzle schema source: `lib/server/postgres/schema.ts`.

Generated migrations live in `db/migrations`. They define an empty target schema only; they contain no Firestore export or production data migration.

Do not hand-edit generated migration SQL without also updating the Drizzle schema and snapshot. Cross-row invariants that cannot be represented safely in the current schema are documented and enforced only when a future write path is introduced.

Run migrations explicitly with `DATA_BACKEND=postgres npm run db:migrate`. See `docs/POSTGRES_LOCAL_DEVELOPMENT.md` for setup and rollback guidance.
