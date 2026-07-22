# PostgreSQL Foundation

This stage adds a dormant PostgreSQL foundation. Firebase Auth remains the identity provider and the existing application continues to read and write Firestore. No production data is migrated by these commands.

## Backend Flag

`DATA_BACKEND` is server-only and supports:

- `firestore`: default; the application does not import or initialize PostgreSQL.
- `postgres`: enables explicit PostgreSQL server tooling and future server repository integration.
- `dual-write`: Firestore remains authoritative for branch/settings reads and is written before the PostgreSQL mirror.

Do not create `NEXT_PUBLIC_DATA_BACKEND`. Client components must never receive `DATABASE_URL` or import modules under `lib/server/postgres`.

## Firestore-Only Development

PostgreSQL is optional for the existing application:

```dotenv
DATA_BACKEND=firestore
```

Leave `DATABASE_URL` unset. The normal commands continue to work:

```bash
npm run dev
npm run build
npm run verify
```

## Local PostgreSQL

Start the provided development database with Docker:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

Use this local-only configuration in `.env.local`:

```dotenv
DATA_BACKEND=postgres
DATABASE_URL=postgresql://saleslab:saleslab_local_only@localhost:5433/saleslab_local
POSTGRES_POOL_MAX=1
POSTGRES_IDLE_TIMEOUT_SECONDS=20
```

Apply migrations and check connectivity:

```bash
npm run db:migrate
npm run db:health
```

Generate a migration after changing `lib/server/postgres/schema.ts`:

```bash
npm run db:generate
```

Review generated SQL before committing it. Migrations never run during application startup or `next build`.

The initial migration creates an empty target schema. It does not read Firestore and does not insert production records.

## Schema Integrity Notes

- `users.firebase_uid` can be inserted without a completed profile so Firebase UID identity rows can exist before dependent data.
- `personas.current_version` is validated by future approval/import transactions. A circular database FK is intentionally deferred until real data has been reconciled and the operational write path exists.
- Public JSONB snapshots reject known persona and scenario secret keys.
- Persona and scenario secrets use separate tables and are never selected by public repository mappers. Production operators should use a restricted migration role and may introduce separate read roles before those repositories become active.
- The target schema has strict foreign keys. Any future Firestore import must first report and repair orphan users, branches, personas, scenarios, sessions, and submission chains. This stage provides no import command.

Stop the local database without deleting data:

```bash
docker compose -f docker-compose.postgres.yml down
```

To delete only the disposable local volume:

```bash
docker compose -f docker-compose.postgres.yml down -v
```

## Vercel

Use a managed PostgreSQL provider with a pooled connection string. Configure `DATABASE_URL`, `DATA_BACKEND`, and optional pool controls only as encrypted server environment variables.

Recommended defaults per Vercel instance:

```dotenv
POSTGRES_POOL_MAX=1
POSTGRES_IDLE_TIMEOUT_SECONDS=20
```

The Postgres.js client is created lazily and reused by warm serverless instances. It uses `prepare: false`, which is compatible with transaction-pooling proxies. Do not use an unpooled direct database URL in serverless production.

Run migrations as an explicit deployment job before enabling future PostgreSQL server routes. Do not run migrations from a request handler or build hook.

## Firebase Authentication

Firebase Auth remains authoritative. Future PostgreSQL routes must verify Firebase ID tokens server-side and use the verified Firebase UID for relational `users.firebase_uid` and authorization checks. Request bodies must never be trusted for user identity.

## Rollback

Before any PostgreSQL write cutover, rollback is configuration-only:

1. Set `DATA_BACKEND=firestore`.
2. Redeploy the application.
3. Leave PostgreSQL tables intact for investigation and reconciliation.
4. Do not run reverse migrations or copy PostgreSQL rows into Firestore.

Firestore remains authoritative. Returning to `DATA_BACKEND=firestore` stops PostgreSQL mirror attempts and requires no reverse data copy.

For local disposable databases only, `docker compose ... down -v` removes all PostgreSQL data. Never use destructive schema rollback against a shared or production database. Production schema rollback should use a reviewed forward migration after the application has already returned to Firestore.

## Troubleshooting

- Missing `DATABASE_URL`: expected and harmless in `firestore` mode; PostgreSQL commands report a configuration error.
- Invalid URL: `DATABASE_URL` must use `postgres://` or `postgresql://` and include a host and database name.
- Unavailable database: health checks return a generic unavailable result without logging credentials.
- Too many connections: use a provider pooled URL and keep `POSTGRES_POOL_MAX` low.
