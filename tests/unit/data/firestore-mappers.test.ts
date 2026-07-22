import test from 'node:test'
import assert from 'node:assert/strict'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import { toDataAccessError } from '@/lib/data/firestore/error-mapper'
import {
  mapBranchDocument,
  mapPersonaDocument,
  mapScenarioDocument,
  mapSessionDocument,
  scenarioWriteData,
} from '@/lib/data/firestore/mappers'
import { toDomainDate } from '@/lib/data/types/dates'
import { getBranchRepository, getPersonaRepository, getScenarioRepository, getSessionRepository } from '@/lib/data'

test('date conversion returns plain Date values without leaking Timestamp objects', () => {
  const source = new Date('2026-07-22T00:00:00.000Z')
  const fromDate = toDomainDate(source)
  const fromTimestamp = toDomainDate({ toDate: () => source })
  const fromIso = toDomainDate('2026-07-22T00:00:00.000Z')

  assert.ok(fromDate instanceof Date)
  assert.notEqual(fromDate, source)
  assert.equal(fromTimestamp?.toISOString(), source.toISOString())
  assert.equal(fromIso?.toISOString(), source.toISOString())
  assert.equal(toDomainDate('not-a-date'), undefined)
  assert.equal(toDomainDate(null), undefined)
})

test('branch mapper uses document ID and handles missing optional fields', () => {
  const branch = mapBranchDocument('kc-test', {
    id: 'wrong-id',
    name: 'KC Test',
    status: 'active',
    createdAt: { toDate: () => new Date('2026-01-01T00:00:00.000Z') },
  })

  assert.equal(branch.id, 'kc-test')
  assert.equal(branch.normalizedName, 'kc test')
  assert.equal(branch.type, undefined)
  assert.equal(branch.updatedAt, undefined)
  assert.equal(branch.createdAt?.toISOString(), '2026-01-01T00:00:00.000Z')
})

test('branch mapper treats malformed legacy status conservatively', () => {
  const branch = mapBranchDocument('legacy-branch', { name: 'KC Legacy' })
  assert.equal(branch.status, 'archived')
})

test('legacy scenario normalization supplies runtime-safe defaults', () => {
  const scenario = mapScenarioDocument('legacy-scenario', {
    id: 'ignored-id',
    title: 'Skenario Lama',
    name: 'Ibu Lama',
    difficulty: 'Medium',
    gender: 'Wanita',
    hiddenRules: 'must not leak',
    userId: 'admin-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  })

  assert.equal(scenario.id, 'legacy-scenario')
  assert.equal(scenario.description, 'Skenario Lama')
  assert.equal(scenario.target, 'Skenario Lama')
  assert.equal(scenario.consumerProfile, 'Skenario Lama')
  assert.equal(scenario.aggressiveness, 5)
  assert.equal(scenario.patience, 5)
  assert.equal(scenario.responseStyle, 'Banyak Tanya')
  assert.equal(scenario.firstSpeaker, 'AI')
  assert.equal('hiddenRules' in scenario, false)
  assert.equal(scenario.userId, 'admin-1')
  assert.equal(scenario.createdAt?.toISOString(), '2026-01-01T00:00:00.000Z')
})

test('scenario write mapper removes secret and undefined fields', () => {
  const writeData = scenarioWriteData({
    id: 'scenario-1',
    title: 'Test',
    description: 'Test description',
    target: 'Test target',
    consumerProfile: 'Test profile',
    difficulty: 'Easy',
    icon: 'User',
    name: 'Ibu Test',
    gender: 'Wanita',
    aggressiveness: 4,
    patience: 6,
    responseStyle: 'To the point',
    firstSpeaker: 'AI',
    hiddenRules: 'secret',
    openingMessage: undefined,
  } as import('../../../lib/data/types/records').ScenarioEditorRecord)

  assert.equal('hiddenRules' in writeData, false)
  assert.equal('openingMessage' in writeData, false)
})

test('persona mapper normalizes missing fields and removes public legacy secrets', () => {
  const persona = mapPersonaDocument('persona-legacy', {
    name: 'Persona Lama',
    hiddenInstructions: 'secret',
    createdAt: '2026-01-02T00:00:00.000Z',
  })

  assert.equal(persona.id, 'persona-legacy')
  assert.equal(persona.status, 'approved')
  assert.equal(persona.version, 1)
  assert.equal(persona.patience, 5)
  assert.equal('hiddenInstructions' in persona, false)
  assert.equal(persona.createdAt?.toISOString(), '2026-01-02T00:00:00.000Z')
})

test('session mapper converts dates and ignores malformed transcript turns', () => {
  const session = mapSessionDocument('session-1', {
    scenarioId: 'scenario-1',
    salespersonName: 'Sales Test',
    userId: 'user-1',
    score: 80,
    transcript: [
      { role: 'user', text: 'Halo' },
      { role: 'invalid', text: 'Ignore' },
    ],
    feedback: { overallScore: 80 },
    createdAt: { toDate: () => new Date('2026-01-03T00:00:00.000Z') },
  })

  assert.deepEqual(session.transcript, [{ role: 'user', text: 'Halo' }])
  assert.equal(session.createdAt?.toISOString(), '2026-01-03T00:00:00.000Z')
  assert.equal(session.analysisStatus, undefined)
  assert.deepEqual(session.feedback?.strengths, [])
  assert.deepEqual(session.feedback?.actionableTips, [])
})

test('Firestore error conversion maps stable public categories', () => {
  const forbidden = toDataAccessError({ code: 'permission-denied', message: 'Missing permissions' })
  const unavailable = toDataAccessError({ code: 'firestore/unavailable', message: 'Offline' })
  const unknown = toDataAccessError(new Error('Unexpected'))

  assert.ok(forbidden instanceof DataAccessError)
  assert.equal(forbidden.category, 'forbidden')
  assert.equal(forbidden.message, 'Anda tidak memiliki izin untuk tindakan ini.')
  assert.equal(unavailable.category, 'unavailable')
  assert.equal(unknown.category, 'unknown')
})

test('repository factories return stable Firestore-backed instances', () => {
  assert.equal(getBranchRepository(), getBranchRepository())
  assert.equal(getScenarioRepository(), getScenarioRepository())
  assert.equal(getPersonaRepository(), getPersonaRepository())
  assert.equal(getSessionRepository(), getSessionRepository())
})
