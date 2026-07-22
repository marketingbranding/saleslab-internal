import assert from 'node:assert/strict'
import test from 'node:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createBackendLoader, DataBackendConfigurationError, resolveDataBackend } from '../../lib/server/data/backend'
import { DatabaseConfigurationError, readPostgresConfig, validateDatabaseUrl } from '../../lib/server/postgres/config'
import { runPostgresHealthCheck } from '../../lib/server/postgres/health'

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx)$/.test(entry.name) ? [path] : []
  }))
  return files.flat()
}

test('Firestore remains the default backend without DATABASE_URL', async () => {
  assert.equal(resolveDataBackend(undefined), 'firestore')
  let postgresLoads = 0
  const load = createBackendLoader({
    firestore: async () => 'firestore',
    postgres: async () => { postgresLoads += 1; return 'postgres' },
    dualWrite: async () => 'dual-write',
  })

  assert.equal(await load('firestore'), 'firestore')
  assert.equal(postgresLoads, 0)
})

test('backend resolver accepts planned values and rejects invalid configuration', () => {
  assert.equal(resolveDataBackend('postgres'), 'postgres')
  assert.equal(resolveDataBackend('dual-write'), 'dual-write')
  assert.throws(() => resolveDataBackend('mysql'), DataBackendConfigurationError)
})

test('PostgreSQL configuration accepts valid test URLs without connecting', () => {
  const url = 'postgresql://test_user:test_password@localhost:5432/saleslab_test'
  assert.equal(validateDatabaseUrl(url), url)
  assert.deepEqual(readPostgresConfig({
    DATABASE_URL: url,
    POSTGRES_POOL_MAX: '2',
    POSTGRES_IDLE_TIMEOUT_SECONDS: '15',
  }), { url, max: 2, idleTimeout: 15 })
})

test('invalid and missing DATABASE_URL values fail without exposing their contents', () => {
  assert.throws(() => validateDatabaseUrl(undefined), DatabaseConfigurationError)
  assert.throws(() => validateDatabaseUrl('https://db.example.com/secret-name'), DatabaseConfigurationError)
  assert.throws(() => validateDatabaseUrl('not-a-url'), DatabaseConfigurationError)
})

test('health utility reports unavailable databases without leaking driver errors', async () => {
  const result = await runPostgresHealthCheck(async () => {
    throw new Error('connect ECONNREFUSED postgresql://user:password@private-host/db')
  })
  assert.equal(result.ok, false)
  assert.equal(result.status, 'unavailable')
  assert.equal(result.message, 'PostgreSQL is unavailable.')
  assert.equal(JSON.stringify(result).includes('password'), false)
})

test('client components and app routes do not import PostgreSQL modules', async () => {
  const paths = [...await sourceFiles('app'), ...await sourceFiles('components')]
  for (const path of paths) {
    const source = await readFile(path, 'utf8')
    assert.doesNotMatch(source, /from ['"](?:postgres|drizzle-orm|@\/lib\/server\/postgres)/, path)
  }
})

test('generated migration creates the complete empty schema without data writes', async () => {
  const migrationFiles = (await readdir('db/migrations')).filter(name => name.endsWith('.sql'))
  assert.equal(migrationFiles.length, 1)
  const sql = await readFile(join('db/migrations', migrationFiles[0]), 'utf8')
  const expectedTables = [
    'users', 'admins', 'branches', 'memberships', 'personas', 'persona_versions',
    'persona_version_secrets', 'persona_submissions', 'scenarios', 'scenario_secrets',
    'scenario_success_conditions', 'sessions', 'session_transcript_turns',
    'session_evaluations', 'app_settings', 'migration_records',
  ]
  expectedTables.forEach(table => assert.match(sql, new RegExp(`CREATE TABLE "${table}"`)))
  assert.doesNotMatch(sql, /^\s*(?:INSERT|UPDATE|DELETE)\b/im)
  assert.match(sql, /persona_submissions_public_payload_check/)
  assert.match(sql, /sessions_public_snapshot_check/)
})

test('backend selector is server-only and never uses a NEXT_PUBLIC variable', async () => {
  const source = await readFile('lib/server/data/backend.ts', 'utf8')
  const envExample = await readFile('.env.example', 'utf8')
  assert.doesNotMatch(source, /NEXT_PUBLIC_DATA_BACKEND/)
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_DATA_BACKEND=/)
})
