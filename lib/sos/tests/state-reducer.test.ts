import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialRoleplayState, reduceRoleplayEvent, reduceRoleplayEvents } from '../state-reducer'
import type { EventSeverity, RoleplayEvent, RoleplayEventType } from '../types'

const sessionId = 'state-test-session'
const baseTimestamp = '2026-07-13T10:00:00.000Z'

function event(
  id: string,
  eventType: RoleplayEventType,
  sequence: number,
  severity: EventSeverity = 'LOW'
): RoleplayEvent {
  return {
    id,
    sessionId,
    eventType,
    severity,
    sourceTurnSequence: sequence,
    confidence: 0.9,
    extractor: 'deterministic',
    createdAt: new Date(Date.parse(baseTimestamp) + sequence * 1000).toISOString(),
  }
}

test('createInitialRoleplayState returns safe defaults and clamps custom trust', () => {
  const state = createInitialRoleplayState({ scenarioId: 'scenario-1', personaId: 'persona-1', initialTrust: 150 })

  assert.equal(state.stage, 'opening')
  assert.equal(state.scenarioId, 'scenario-1')
  assert.equal(state.personaId, 'persona-1')
  assert.equal(state.home.housingDiscovered, false)
  assert.equal(state.home.occupationDiscovered, false)
  assert.equal(state.home.moneyDiscovered, false)
  assert.equal(state.home.eligibilityDiscovered, false)
  assert.equal(state.metrics.objectionCount, 0)
  assert.equal(state.metrics.buyingSignalCount, 0)
  assert.equal(state.metrics.closingAttemptCount, 0)
  assert.equal(state.metrics.nextStepAgreementCount, 0)
  assert.equal(state.trust, 100)
  assert.equal(state.readiness, 10)
  assert.equal(state.compliance.criticalViolationDetected, false)
  assert.deepEqual(state.processedEventIds, [])
})

test('approaching keeps opening and probing advances to discovery', () => {
  let state = createInitialRoleplayState()
  state = reduceRoleplayEvent(state, event('e1', 'APPROACHING_STARTED', 1))
  state = reduceRoleplayEvent(state, event('e2', 'PROBING_STARTED', 2))

  assert.equal(state.stage, 'discovery')
  assert.equal(state.trust, 29)
  assert.equal(state.readiness, 11)
})

test('HOME progress completes all categories and repeated category is idempotent', () => {
  let state = createInitialRoleplayState()
  state = reduceRoleplayEvents(state, [
    event('home-1', 'HOUSING_INFO_DISCOVERED', 1),
    event('home-2', 'OCCUPATION_INFO_DISCOVERED', 2),
    event('home-3', 'MONEY_INFO_DISCOVERED', 3),
    event('home-4', 'ELIGIBILITY_INFO_DISCOVERED', 4),
  ])

  assert.equal(state.home.completedCount, 4)
  assert.equal(state.home.completionRatio, 1)
  assert.equal(state.readiness, 30)

  const repeated = reduceRoleplayEvent(state, event('home-5', 'HOUSING_INFO_DISCOVERED', 5))
  assert.equal(repeated.home.completedCount, 4)
  assert.equal(repeated.home.completionRatio, 1)
  assert.equal(repeated.readiness, 30)
})

test('solution stage does not move backward after later probing', () => {
  let state = createInitialRoleplayState()
  state = reduceRoleplayEvent(state, event('solution-1', 'SOLUTION_PRESENTED', 2))
  state = reduceRoleplayEvent(state, event('probe-later', 'PROBING_STARTED', 3))

  assert.equal(state.stage, 'solution')
})

test('objection increments counter and reduces trust/readiness without erasing progress', () => {
  let state = createInitialRoleplayState()
  state = reduceRoleplayEvent(state, event('solution-1', 'SOLUTION_PRESENTED', 1))
  state = reduceRoleplayEvent(state, event('objection-1', 'OBJECTION_RAISED', 2, 'MODERATE'))

  assert.equal(state.stage, 'objection')
  assert.equal(state.metrics.objectionCount, 1)
  assert.equal(state.trust, 27)
  assert.equal(state.readiness, 13)
})

test('buying signal increases readiness but does not commit', () => {
  const state = reduceRoleplayEvent(
    createInitialRoleplayState(),
    event('buying-1', 'BUYING_SIGNAL_DETECTED', 1)
  )

  assert.equal(state.metrics.buyingSignalCount, 1)
  assert.equal(state.readiness, 22)
  assert.notEqual(state.stage, 'committed')
})

test('closing attempt advances to closing and increments counter', () => {
  const state = reduceRoleplayEvent(
    createInitialRoleplayState(),
    event('closing-1', 'CLOSING_ATTEMPTED', 1)
  )

  assert.equal(state.stage, 'closing')
  assert.equal(state.metrics.closingAttemptCount, 1)
})

test('next-step agreement commits and later lower-stage events do not move backward', () => {
  let state = reduceRoleplayEvent(
    createInitialRoleplayState(),
    event('next-1', 'NEXT_STEP_AGREED', 1)
  )

  assert.equal(state.stage, 'committed')
  assert.equal(state.metrics.nextStepAgreementCount, 1)
  assert.equal(state.readiness, 95)
  assert.equal(state.trust, 30)

  state = reduceRoleplayEvent(state, event('probe-later', 'PROBING_STARTED', 2))
  assert.equal(state.stage, 'committed')
})

test('compliance events aggregate counts and highest severity', () => {
  let state = createInitialRoleplayState({ initialTrust: 80 })
  state = reduceRoleplayEvent(state, event('guarantee-1', 'GUARANTEE_LANGUAGE', 1, 'CRITICAL'))
  assert.equal(state.compliance.criticalViolationDetected, true)
  assert.equal(state.compliance.guaranteeLanguageCount, 1)
  assert.equal(state.compliance.highestSeverity, 'CRITICAL')
  assert.equal(state.trust, 65)

  state = reduceRoleplayEvent(state, event('document-1', 'DOCUMENT_MANIPULATION_SUGGESTED', 2, 'CRITICAL'))
  assert.equal(state.compliance.documentManipulationCount, 1)
  assert.equal(state.compliance.highestSeverity, 'CRITICAL')

  state = reduceRoleplayEvent(state, event('pressure-1', 'PRESSURE_TACTIC', 3, 'HIGH'))
  assert.equal(state.compliance.pressureTacticCount, 1)
  assert.equal(state.compliance.highestSeverity, 'CRITICAL')
})

test('highest severity remains monotonic after later LOW event', () => {
  let state = reduceRoleplayEvent(
    createInitialRoleplayState(),
    event('guarantee-1', 'GUARANTEE_LANGUAGE', 1, 'CRITICAL')
  )
  state = reduceRoleplayEvent(state, event('approach-1', 'APPROACHING_STARTED', 2, 'LOW'))

  assert.equal(state.compliance.highestSeverity, 'CRITICAL')
})

test('duplicate event does not apply twice and may return the same object', () => {
  const firstEvent = event('objection-1', 'OBJECTION_RAISED', 1, 'MODERATE')
  const firstState = reduceRoleplayEvent(createInitialRoleplayState(), firstEvent)
  const duplicateState = reduceRoleplayEvent(firstState, firstEvent)

  assert.equal(firstState.metrics.objectionCount, 1)
  assert.equal(duplicateState.metrics.objectionCount, 1)
  assert.equal(duplicateState.trust, firstState.trust)
  assert.equal(duplicateState.readiness, firstState.readiness)
  assert.deepEqual(duplicateState.processedEventIds, ['objection-1'])
  assert.equal(duplicateState, firstState)
})

test('reduceRoleplayEvents processes unsorted events deterministically by turn sequence', () => {
  const state = reduceRoleplayEvents(createInitialRoleplayState(), [
    event('next-3', 'NEXT_STEP_AGREED', 3),
    event('probe-1', 'PROBING_STARTED', 1),
  ])

  assert.equal(state.stage, 'committed')
  assert.equal(state.readiness, 95)
  assert.deepEqual(state.processedEventIds, ['probe-1', 'next-3'])
})

test('reducer does not mutate input state or event', () => {
  const initialState = createInitialRoleplayState()
  const initialProcessedIds = initialState.processedEventIds
  const currentEvent = event('solution-1', 'SOLUTION_PRESENTED', 1)
  const eventSnapshot = { ...currentEvent }

  const nextState = reduceRoleplayEvent(initialState, currentEvent)

  assert.equal(initialState.stage, 'opening')
  assert.equal(initialState.processedEventIds, initialProcessedIds)
  assert.deepEqual(initialState.processedEventIds, [])
  assert.deepEqual(currentEvent, eventSnapshot)
  assert.notEqual(nextState, initialState)
})
