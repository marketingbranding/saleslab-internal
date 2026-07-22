import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mapBranchRecordToPostgresValues,
  mapPostgresBranchRow,
  mapPostgresSettingsRow,
  mapSettingsRecordToPostgresValues,
  type PostgresBranchRow,
  type PostgresSettingsRow,
} from '../../../lib/server/postgres/row-mappers'

test('Postgres branch rows map to domain records with copied Date values', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z')
  const updatedAt = new Date('2026-02-01T00:00:00.000Z')
  const row: PostgresBranchRow = {
    id: 'kcp-test',
    name: 'KCP Test',
    normalizedName: 'kcp test',
    type: 'KCP',
    status: 'active',
    createdBy: 'firebase-uid',
    createdAt,
    updatedAt,
    sourceRevision: 3,
    sourceHash: 'branch-hash',
  }

  const record = mapPostgresBranchRow(row)
  assert.deepEqual(record, {
    id: 'kcp-test',
    name: 'KCP Test',
    normalizedName: 'kcp test',
    type: 'KCP',
    status: 'active',
    createdBy: 'firebase-uid',
    createdAt,
    updatedAt,
  })
  assert.notEqual(record.createdAt, createdAt)
  assert.notEqual(record.updatedAt, updatedAt)
})

test('branch domain records map to relational insert values without JSONB fields', () => {
  const now = new Date('2026-03-01T00:00:00.000Z')
  const values = mapBranchRecordToPostgresValues({
    id: 'kc-test',
    name: 'KC Test',
    normalizedName: 'kc test',
    type: 'KC',
    status: 'archived',
  }, now)

  assert.equal(values.id, 'kc-test')
  assert.equal(values.status, 'archived')
  assert.equal(values.createdAt?.toISOString(), now.toISOString())
  assert.equal(values.updatedAt?.toISOString(), now.toISOString())
  assert.equal('legacyData' in values, false)
})

test('Postgres settings rows map to complete domain settings', () => {
  const row: PostgresSettingsRow = {
    id: 'global',
    modelProvider: 'openrouter',
    geminiModel: null,
    ollamaModel: null,
    openRouterModel: 'model/test',
    thinkingDelay: 1200,
    frustrationSensitivity: 7,
    ollamaUrl: null,
    nestedConfig: null,
    updatedBy: 'firebase-admin',
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    sourceRevision: 2,
    sourceHash: 'settings-hash',
  }

  const settings = mapPostgresSettingsRow(row)
  assert.equal(settings.modelProvider, 'openrouter')
  assert.equal(settings.openRouterModel, 'model/test')
  assert.equal(settings.thinkingDelay, 1200)
  assert.equal(settings.frustrationSensitivity, 7)
})

test('settings mapping supplies defaults and never produces credential columns', () => {
  assert.deepEqual(mapPostgresSettingsRow(undefined), {
    modelProvider: 'gemini',
    thinkingDelay: 1500,
    frustrationSensitivity: 5,
  })
  const values = mapSettingsRecordToPostgresValues({
    modelProvider: 'gemini',
    thinkingDelay: 1500,
    frustrationSensitivity: 5,
  }, new Date('2026-05-01T00:00:00.000Z'))
  assert.equal('databaseUrl' in values, false)
  assert.equal('openRouterApiKey' in values, false)
})
