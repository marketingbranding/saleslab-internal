import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyHiddenInformationRevealKeys,
  evaluateHiddenCondition,
  evaluateHiddenInformation,
  isSupportedHiddenCondition,
  mapLegacyRevealCondition,
} from '../hidden-information-engine'
import { createInitialRoleplayState, reduceRoleplayEvents } from '../state-reducer'
import type { HiddenInformation, RoleplayEvent, RoleplayEventType, RoleplayState } from '../types'

const sessionId = 'hidden-test-session'
const baseTimestamp = '2026-07-13T10:00:00.000Z'

function event(id: string, eventType: RoleplayEventType, sequence: number): RoleplayEvent {
  return {
    id,
    sessionId,
    eventType,
    severity: eventType === 'GUARANTEE_LANGUAGE' || eventType === 'DOCUMENT_MANIPULATION_SUGGESTED' ? 'CRITICAL' : 'LOW',
    sourceTurnSequence: sequence,
    confidence: 0.9,
    extractor: 'deterministic',
    createdAt: new Date(Date.parse(baseTimestamp) + sequence * 1000).toISOString(),
  }
}

function item(overrides: Partial<HiddenInformation>): HiddenInformation {
  return {
    key: 'income_instability',
    value: 'Income varies substantially each month.',
    revealWhen: ['home:occupation', 'trust>=60'],
    neverRevealWhen: [],
    importance: 'critical',
    ...overrides,
  }
}

function stateWith(events: RoleplayEvent[], initialTrust = 25, initialReadiness = 10): RoleplayState {
  return reduceRoleplayEvents(createInitialRoleplayState({ initialTrust, initialReadiness }), events)
}

test('empty hidden item input returns no decisions and no new keys', () => {
  const result = evaluateHiddenInformation([], { events: [], state: createInitialRoleplayState() })

  assert.deepEqual(result.decisions, [])
  assert.deepEqual(result.newlyRevealedKeys, [])
})

test('event reveal condition becomes eligible when the event exists', () => {
  const events = [event('probe-1', 'PROBING_STARTED', 1)]
  const result = evaluateHiddenInformation([item({ revealWhen: ['event:PROBING_STARTED'] })], {
    events,
    state: stateWith(events),
  })

  assert.equal(result.decisions[0].status, 'eligible')
  assert.deepEqual(result.newlyRevealedKeys, ['income_instability'])
})

test('HOME occupation condition requires occupation discovery', () => {
  const withoutOccupation = evaluateHiddenInformation([item({ revealWhen: ['home:occupation'] })], {
    events: [],
    state: createInitialRoleplayState(),
  })
  const events = [event('occupation-1', 'OCCUPATION_INFO_DISCOVERED', 1)]
  const withOccupation = evaluateHiddenInformation([item({ revealWhen: ['home:occupation'] })], {
    events,
    state: stateWith(events),
  })

  assert.equal(withoutOccupation.decisions[0].status, 'not_eligible')
  assert.equal(withOccupation.decisions[0].status, 'eligible')
})

test('HOME complete requires all four categories', () => {
  const partialEvents = [event('housing-1', 'HOUSING_INFO_DISCOVERED', 1)]
  const completeEvents = [
    event('housing-1', 'HOUSING_INFO_DISCOVERED', 1),
    event('occupation-2', 'OCCUPATION_INFO_DISCOVERED', 2),
    event('money-3', 'MONEY_INFO_DISCOVERED', 3),
    event('eligibility-4', 'ELIGIBILITY_INFO_DISCOVERED', 4),
  ]

  assert.equal(evaluateHiddenInformation([item({ revealWhen: ['home:complete'] })], {
    events: partialEvents,
    state: stateWith(partialEvents),
  }).decisions[0].status, 'not_eligible')
  assert.equal(evaluateHiddenInformation([item({ revealWhen: ['home:complete'] })], {
    events: completeEvents,
    state: stateWith(completeEvents),
  }).decisions[0].status, 'eligible')
})

test('stage threshold matches solution and later stages but not opening or discovery', () => {
  const opening = createInitialRoleplayState()
  const discovery = stateWith([event('probe-1', 'PROBING_STARTED', 1)])
  const solution = stateWith([event('solution-1', 'SOLUTION_PRESENTED', 1)])
  const objection = stateWith([event('solution-1', 'SOLUTION_PRESENTED', 1), event('objection-2', 'OBJECTION_RAISED', 2)])
  const closing = stateWith([event('closing-1', 'CLOSING_ATTEMPTED', 1)])
  const committed = stateWith([event('next-1', 'NEXT_STEP_AGREED', 1)])

  for (const state of [opening, discovery]) {
    assert.equal(evaluateHiddenCondition('stage>=solution', { events: [], state }), false)
  }
  for (const state of [solution, objection, closing, committed]) {
    assert.equal(evaluateHiddenCondition('stage>=solution', { events: [], state }), true)
  }
})

test('trust and readiness thresholds match at configured values and above', () => {
  assert.equal(evaluateHiddenCondition('trust>=60', { events: [], state: createInitialRoleplayState({ initialTrust: 60 }) }), true)
  assert.equal(evaluateHiddenCondition('trust>=60', { events: [], state: createInitialRoleplayState({ initialTrust: 59 }) }), false)
  assert.equal(evaluateHiddenCondition('readiness>=75', { events: [], state: createInitialRoleplayState({ initialReadiness: 75 }) }), true)
  assert.equal(evaluateHiddenCondition('readiness>=75', { events: [], state: createInitialRoleplayState({ initialReadiness: 74 }) }), false)
})

test('metrics condition matches objection count', () => {
  const events = [event('objection-1', 'OBJECTION_RAISED', 1)]
  const result = evaluateHiddenInformation([item({ revealWhen: ['objections>=1'] })], {
    events,
    state: stateWith(events),
  })

  assert.equal(result.decisions[0].status, 'eligible')
})

test('revealWhen uses OR semantics', () => {
  const result = evaluateHiddenInformation([item({ revealWhen: ['home:money', 'trust>=60'] })], {
    events: [],
    state: createInitialRoleplayState({ initialTrust: 60 }),
  })

  assert.equal(result.decisions[0].status, 'eligible')
})

test('empty and unknown reveal conditions do not reveal automatically', () => {
  const state = createInitialRoleplayState({ initialTrust: 100 })

  assert.equal(evaluateHiddenInformation([item({ revealWhen: [] })], { events: [], state }).decisions[0].status, 'not_eligible')
  assert.equal(evaluateHiddenInformation([item({ revealWhen: ['unknown:rule'] })], { events: [], state }).decisions[0].status, 'not_eligible')
})

test('blocking precedence overrides matched reveal conditions', () => {
  const events = [event('guarantee-1', 'GUARANTEE_LANGUAGE', 1)]
  const result = evaluateHiddenInformation([
    item({ revealWhen: ['trust>=60'], neverRevealWhen: ['compliance:critical'] }),
  ], {
    events,
    state: stateWith(events, 80),
  })

  assert.equal(result.decisions[0].status, 'blocked')
  assert.deepEqual(result.newlyRevealedKeys, [])
})

test('direct compliance block conditions match guarantee, document manipulation, and pressure', () => {
  const guaranteeState = stateWith([event('guarantee-1', 'GUARANTEE_LANGUAGE', 1)], 80)
  const documentState = stateWith([event('document-1', 'DOCUMENT_MANIPULATION_SUGGESTED', 1)], 80)
  const pressureState = stateWith([event('pressure-1', 'PRESSURE_TACTIC', 1)], 80)

  assert.equal(evaluateHiddenCondition('compliance:guarantee', { events: [], state: guaranteeState }), true)
  assert.equal(evaluateHiddenCondition('compliance:document_manipulation', { events: [], state: documentState }), true)
  assert.equal(evaluateHiddenCondition('compliance:pressure', { events: [], state: pressureState }), true)
})

test('already revealed item is not emitted again', () => {
  const result = evaluateHiddenInformation([item({ revealWhen: ['trust>=60'] })], {
    events: [],
    state: createInitialRoleplayState({ initialTrust: 60 }),
    alreadyRevealedKeys: ['income_instability'],
  })

  assert.equal(result.decisions[0].status, 'already_revealed')
  assert.deepEqual(result.newlyRevealedKeys, [])
})

test('multiple eligible items emit deterministic importance order', () => {
  const result = evaluateHiddenInformation([
    item({ key: 'low_item', importance: 'low', revealWhen: ['trust>=60'] }),
    item({ key: 'critical_item', importance: 'critical', revealWhen: ['trust>=60'] }),
    item({ key: 'moderate_item', importance: 'moderate', revealWhen: ['trust>=60'] }),
  ], {
    events: [],
    state: createInitialRoleplayState({ initialTrust: 60 }),
  })

  assert.deepEqual(result.newlyRevealedKeys, ['critical_item', 'moderate_item', 'low_item'])
})

test('duplicate keys are ignored after the first configured item', () => {
  const result = evaluateHiddenInformation([
    item({ key: 'duplicate', importance: 'low', revealWhen: ['trust>=60'] }),
    item({ key: 'duplicate', importance: 'critical', revealWhen: ['trust>=60'] }),
  ], {
    events: [],
    state: createInitialRoleplayState({ initialTrust: 60 }),
  })

  assert.equal(result.decisions.length, 1)
  assert.deepEqual(result.newlyRevealedKeys, ['duplicate'])
})

test('applyHiddenInformationRevealKeys appends unique keys only and stores no values', () => {
  const state = createInitialRoleplayState({ initialTrust: 60 })
  const withExisting = { ...state, revealedInformation: ['existing_key'] }
  const next = applyHiddenInformationRevealKeys(withExisting, ['existing_key', 'income_instability'])
  const same = applyHiddenInformationRevealKeys(next, [])

  assert.deepEqual(next.revealedInformation, ['existing_key', 'income_instability'])
  assert.equal(next.stage, withExisting.stage)
  assert.equal(next.trust, withExisting.trust)
  assert.equal(next.readiness, withExisting.readiness)
  assert.equal(next.revealedInformation.includes('Income varies substantially each month.'), false)
  assert.equal(same, next)
})

test('applyHiddenInformationRevealKeys ignores empty, existing, and duplicate input keys while preserving first occurrence order', () => {
  const state = createInitialRoleplayState()
  const withExisting = { ...state, revealedInformation: ['existing'] }
  const next = applyHiddenInformationRevealKeys(withExisting, ['income', 'income', '', 'housing', 'income', 'existing'])

  assert.deepEqual(next.revealedInformation, ['existing', 'income', 'housing'])
  assert.deepEqual(withExisting.revealedInformation, ['existing'])
})

test('input items, events, and state are not mutated', () => {
  const hiddenItems = [item({ revealWhen: ['trust>=60'] })]
  const events = [event('probe-1', 'PROBING_STARTED', 1)]
  const state = createInitialRoleplayState({ initialTrust: 60 })
  const itemSnapshot = JSON.stringify(hiddenItems)
  const eventSnapshot = JSON.stringify(events)
  const stateSnapshot = JSON.stringify(state)

  evaluateHiddenInformation(hiddenItems, { events, state })

  assert.equal(JSON.stringify(hiddenItems), itemSnapshot)
  assert.equal(JSON.stringify(events), eventSnapshot)
  assert.equal(JSON.stringify(state), stateSnapshot)
})

test('condition support and legacy mapping remain explicit', () => {
  assert.equal(isSupportedHiddenCondition('event:PROBING_STARTED'), true)
  assert.equal(isSupportedHiddenCondition('unknown:rule'), false)
  assert.equal(mapLegacyRevealCondition('after trust is built'), 'trust>=60')
  assert.equal(mapLegacyRevealCondition('after customer smiles'), undefined)
})
