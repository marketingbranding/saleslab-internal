import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { POST as masterDataPost } from '@/app/api/master-data/route'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import type { MasterDataCommand } from '@/lib/data/master-data-commands'
import { compareBranches, compareSettings, reportMismatchCount } from '@/lib/server/data/compare-master-data'
import {
  branchSourceHash,
  commandFingerprint,
  executeMasterDataCommand,
  type AuthoritativeMasterDataStore,
  type MasterDataMirror,
  type PrimaryCommandResult,
} from '@/lib/server/data/master-data-sync'
import { MasterDataCommandValidationError, validateMasterDataCommand } from '@/lib/validation/master-data-command'
import { readSourceRevision } from '@/lib/server/data/firestore-master-data-store'

const branch = {
  id: 'kc-test',
  name: 'KC Test',
  normalizedName: 'kc test',
  type: 'KC' as const,
  status: 'active' as const,
}

function command(commandId = 'command-1'): MasterDataCommand {
  return { schemaVersion: 1, commandId, type: 'branch.save', payload: { branch } }
}

function primaryResult(input: MasterDataCommand, replayed = false): PrimaryCommandResult {
  const sourceHash = branchSourceHash(branch)
  return {
    operationId: input.commandId,
    commandFingerprint: commandFingerprint(input),
    entityType: 'branch',
    entityId: branch.id,
    sourceRevision: 1,
    sourceHash,
    projections: [{ kind: 'branch.upsert', record: branch, sourceRevision: 1, sourceHash }],
    replayed,
  }
}

function stores(events: string[], options?: { mirrorFails?: boolean }) {
  const operations = new Map<string, PrimaryCommandResult>()
  const authoritative: AuthoritativeMasterDataStore = {
    async apply(input) {
      events.push('firestore')
      const existing = operations.get(input.commandId)
      if (existing) return { ...existing, replayed: true }
      const result = primaryResult(input)
      operations.set(input.commandId, result)
      return result
    },
    async recordMirrorResult(_result, status) { events.push(`status:${status}`) },
    async recordMismatch(_result, errorCode) { events.push(`mismatch:${errorCode}`) },
  }
  const receipts = new Set<string>()
  const mirror: MasterDataMirror = {
    async apply(result) {
      events.push('postgres')
      if (options?.mirrorFails) throw new DataAccessError('Database unavailable.', 'unavailable')
      receipts.add(result.operationId)
    },
  }
  return { authoritative, mirror, receipts }
}

test('dual-write commits Firestore first and PostgreSQL second', async () => {
  const events: string[] = []
  const { authoritative, mirror } = stores(events)
  const result = await executeMasterDataCommand({ backend: 'dual-write', command: command(), actorUid: 'admin-1', authoritative, loadMirror: async () => mirror })

  assert.equal(result.outcome, 'committed')
  assert.equal(result.mirror, 'completed')
  assert.deepEqual(events, ['firestore', 'postgres', 'status:completed'])
})

test('entity revision ledger remains monotonic across deleted document lifecycles', () => {
  assert.equal(readSourceRevision({ revision: 4 }), 4)
  assert.equal(readSourceRevision({ syncRevision: 3 }), 3)
  assert.equal(readSourceRevision(undefined), 0)
})

test('PostgreSQL failure reports primary success and records a safe mismatch', async () => {
  const events: string[] = []
  const { authoritative, mirror } = stores(events, { mirrorFails: true })
  const result = await executeMasterDataCommand({ backend: 'dual-write', command: command(), actorUid: 'admin-1', authoritative, loadMirror: async () => mirror })

  assert.equal(result.outcome, 'primary-committed')
  assert.equal(result.mirror, 'retry-pending')
  assert.deepEqual(events, ['firestore', 'postgres', 'mismatch:PG_UNAVAILABLE', 'status:retry-pending'])
  assert.equal(JSON.stringify(events).includes(branch.name), false)
})

test('retry and repeated updates remain idempotent by stable operation and entity IDs', async () => {
  const events: string[] = []
  const { authoritative, mirror, receipts } = stores(events)
  const input = command('stable-operation')
  const first = await executeMasterDataCommand({ backend: 'dual-write', command: input, actorUid: 'admin-1', authoritative, loadMirror: async () => mirror })
  const retry = await executeMasterDataCommand({ backend: 'dual-write', command: input, actorUid: 'admin-1', authoritative, loadMirror: async () => mirror })

  assert.equal(first.entityId, retry.entityId)
  assert.equal(retry.replayed, true)
  assert.equal(receipts.size, 1)
})

test('Firestore failure never invokes PostgreSQL', async () => {
  let mirrorCalls = 0
  const authoritative = {
    apply: async () => { throw new DataAccessError('Firestore unavailable.', 'unavailable') },
    recordMirrorResult: async () => undefined,
    recordMismatch: async () => undefined,
  } satisfies AuthoritativeMasterDataStore

  await assert.rejects(() => executeMasterDataCommand({
    backend: 'dual-write',
    command: command(),
    actorUid: 'admin-1',
    authoritative,
    loadMirror: async () => ({ apply: async () => { mirrorCalls += 1 } }),
  }), DataAccessError)
  assert.equal(mirrorCalls, 0)
})

test('Firestore mode never loads the PostgreSQL mirror', async () => {
  const events: string[] = []
  const { authoritative } = stores(events)
  let mirrorLoads = 0
  const result = await executeMasterDataCommand({
    backend: 'firestore',
    command: command(),
    actorUid: 'admin-1',
    authoritative,
    loadMirror: async () => { mirrorLoads += 1; throw new Error('must not load') },
  })
  assert.equal(result.mirror, 'skipped')
  assert.equal(mirrorLoads, 0)
})

test('superseded retries do not load PostgreSQL or claim mirror completion', async () => {
  const events: string[] = []
  const input = command('superseded-operation')
  const authoritative: AuthoritativeMasterDataStore = {
    async apply() { return { ...primaryResult(input, true), projections: [] } },
    async recordMirrorResult(_result, status) { events.push(status) },
    async recordMismatch() { events.push('mismatch') },
  }
  let mirrorLoads = 0
  const result = await executeMasterDataCommand({
    backend: 'dual-write', command: input, actorUid: 'admin-1', authoritative,
    loadMirror: async () => { mirrorLoads += 1; throw new Error('must not load') },
  })
  assert.equal(result.mirror, 'superseded')
  assert.equal(mirrorLoads, 0)
  assert.deepEqual(events, ['superseded'])
})

test('branch reconciliation distinguishes archive and other mismatch categories', () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const later = new Date('2026-01-02T00:00:00.000Z')
  const report = compareBranches([
    { ...branch, status: 'archived', updatedAt: now },
    { ...branch, id: 'missing-pg' },
  ], [
    { ...branch, name: 'KC Different', updatedAt: later },
    { ...branch, id: 'missing-firestore' },
  ])
  assert.deepEqual(report.missingInPostgres, ['missing-pg'])
  assert.deepEqual(report.missingInFirestore, ['missing-firestore'])
  assert.deepEqual(report.archivedStatusMismatch, ['kc-test'])
  assert.deepEqual(report.timestampMismatch, ['kc-test'])
  assert.deepEqual(report.fieldMismatch, [{ id: 'kc-test', fields: ['name'] }])
})

test('malformed branch and secret-bearing settings commands are rejected', () => {
  assert.throws(() => validateMasterDataCommand({
    schemaVersion: 1,
    commandId: 'command-invalid',
    type: 'branch.save',
    payload: { branch: { ...branch, normalizedName: 'different' } },
  }), MasterDataCommandValidationError)
  assert.throws(() => validateMasterDataCommand({
    schemaVersion: 1,
    commandId: 'command-secret',
    type: 'settings.update',
    payload: { settings: { openRouterApiKey: 'must-not-pass' } },
  }), MasterDataCommandValidationError)
  assert.throws(() => validateMasterDataCommand({
    schemaVersion: 1,
    commandId: 'command-duplicate-seed',
    type: 'branch.seed',
    payload: { defaults: [
      { id: branch.id, name: branch.name, normalizedName: branch.normalizedName, type: branch.type },
      { id: 'kc-other', name: branch.name, normalizedName: branch.normalizedName, type: branch.type },
    ] },
  }), MasterDataCommandValidationError)
})

test('settings reconciliation reports missing sides without fabricating defaults', () => {
  const settings = { modelProvider: 'gemini' as const, thinkingDelay: 1500, frustrationSensitivity: 5 }
  assert.deepEqual(compareSettings(settings, null).missingInPostgres, ['global'])
  assert.deepEqual(compareSettings(null, settings).missingInFirestore, ['global'])
  assert.equal(reportMismatchCount({
    missingInPostgres: [],
    missingInFirestore: [],
    fieldMismatch: [{ id: 'global', fields: ['modelProvider'] }],
    timestampMismatch: ['global'],
    archivedStatusMismatch: [],
  }), 1)
})

test('master-data route requires Firebase authentication before data access', async () => {
  const response = await masterDataPost(new NextRequest('http://localhost/api/master-data', {
    method: 'POST',
    body: JSON.stringify({}),
  }))
  assert.equal(response.status, 401)
})
