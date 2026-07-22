import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { resolveDataBackend } from '@/lib/server/data/backend'
import { closePostgresConnection, getPostgresConnection } from '@/lib/server/postgres/connection'

async function main() {
  const backend = resolveDataBackend()
  if (backend !== 'postgres') throw new Error('Set DATA_BACKEND=postgres before running PostgreSQL migrations.')
  const { db } = getPostgresConnection()
  await migrate(db, { migrationsFolder: './db/migrations' })
  console.log('PostgreSQL migrations completed.')
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'PostgreSQL migration failed.')
    process.exitCode = 1
  })
  .finally(closePostgresConnection)
