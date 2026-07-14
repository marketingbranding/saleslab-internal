import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvaluationContext } from '../evaluation/context'
import { createInitialRoleplayState } from '../state-reducer'
import type { NormalizedTurn, Persona, RoleplayEvent, RoleplayState, Scenario } from '../types'

const persona: Persona = {
  id: 'persona-context',
  name: 'Ibu Rina',
  gender: 'female',
  patience: 5,
  aggressiveness: 4,
  skepticism: 6,
  trustStart: 40,
  hiddenInformation: [{
    key: 'private_income',
    value: 'Hidden income value must not enter context.',
    revealWhen: ['trust>=60'],
    importance: 'critical',
  }],
  objections: [{
    key: 'private_objection',
    category: 'money',
    statement: 'Configured persona objection must not be injected.',
  }],
  buyingSignals: ['configured survey phrase'],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'scenario-context',
  name: 'KPR Inquiry',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: [],
  expectedClosing: 'Schedule survey',
  forbiddenClosing: 'Force booking',
  targetSkills: ['probing', 'home'],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

const turns: NormalizedTurn[] = [
  {
    sequence: 2,
    role: 'sales',
    text: '  Selamat pagi, Bu. Saya ingin memahami kebutuhan rumah Ibu terlebih dahulu.  ',
    timestamp: '2026-07-14T08:00:00.000Z',
    source: 'legacy',
    finalized: true,
  },
  {
    sequence: 5,
    role: 'customer',
    text: 'Saya masih tinggal bersama orang tua dan ingin mencari rumah pertama.',
    timestamp: '2026-07-14T08:00:05.000Z',
    source: 'legacy',
    finalized: true,
  },
  {
    sequence: 8,
    role: 'sales',
    text: 'Pekerjaan Ibu saat ini apa, dan apakah ada cicilan aktif?',
    timestamp: '2026-07-14T08:00:10.000Z',
    source: 'legacy',
    finalized: true,
  },
]

function roleplayEvent(
  id: string,
  eventType: RoleplayEvent['eventType'],
  sourceTurnSequence: number,
  overrides: Partial<RoleplayEvent> = {}
): RoleplayEvent {
  return {
    id,
    sessionId: 'session-context',
    eventType,
    severity: 'LOW',
    sourceTurnSequence,
    confidence: 0.9,
    extractor: 'deterministic',
    createdAt: '2026-07-14T08:00:10.000Z',
    ...overrides,
  }
}

function finalState(): RoleplayState {
  return {
    ...createInitialRoleplayState({ scenarioId: scenario.id, personaId: persona.id }),
    home: {
      housingDiscovered: true,
      occupationDiscovered: true,
      moneyDiscovered: false,
      eligibilityDiscovered: false,
      completedCount: 99,
      completionRatio: 99,
    },
    unresolvedConcerns: [' Price ', 'price', 'Location'],
    buyingSignals: [' Survey ', 'survey', 'Document check'],
    complianceFlags: ['GUARANTEE_LANGUAGE', 'guarantee_language'],
  }
}

function build(overrides: Partial<Parameters<typeof buildEvaluationContext>[0]> = {}) {
  return buildEvaluationContext({
    persona,
    scenario,
    turns,
    events: [
      roleplayEvent('probe-1', 'PROBING_STARTED', 8),
      roleplayEvent('housing-1', 'HOUSING_INFO_DISCOVERED', 5),
    ],
    finalState: finalState(),
    ...overrides,
  })
}

test('basic context preserves metadata and returns cloned accepted data and summaries', () => {
  const context = build()

  assert.equal(context.scenarioId, scenario.id)
  assert.equal(context.personaId, persona.id)
  assert.equal(context.scenarioName, scenario.name)
  assert.equal(context.customerStage, 'inquiry')
  assert.equal(context.difficulty, 'medium')
  assert.deepEqual(context.targetSkills, ['probing', 'home'])
  assert.equal(context.turns.length, 3)
  assert.equal(context.events.length, 2)
  assert.notEqual(context.turns, turns)
  assert.equal(context.summary.isTranscriptSufficient, true)
  assert.equal(context.home.completedCount, 2)
  assert.equal(context.eventSummary.totalEvents, 2)
})

test('invalid, empty, unfinished, and invalid-sequence turns are ignored without renumbering', () => {
  const malformedTurns = [
    turns[0],
    { ...turns[1], sequence: 0 },
    { ...turns[1], sequence: 3, text: '   ' },
    { ...turns[1], sequence: 4, finalized: false },
    { ...turns[2], sequence: 10, role: 'invalid' as NormalizedTurn['role'] },
    { ...turns[2], sequence: 12 },
  ]
  const context = build({ turns: malformedTurns, events: [] })

  assert.deepEqual(context.turns.map(turn => turn.sequence), [2, 12])
  assert.equal(context.turns[0].text, turns[0].text.trim())
})

test('transcript sufficiency rules and reason ordering are deterministic', () => {
  assert.equal(build().summary.isTranscriptSufficient, true)

  const empty = build({ turns: [], events: [] }).summary
  assert.deepEqual(empty.insufficiencyReasons, [
    'NO_VALID_TURNS',
    'NO_CUSTOMER_TURNS',
    'INSUFFICIENT_SALES_TURNS',
    'TRANSCRIPT_TOO_SHORT',
  ])

  const noCustomer = build({ turns: [turns[0], turns[2]], events: [] }).summary
  assert.deepEqual(noCustomer.insufficiencyReasons, ['NO_CUSTOMER_TURNS'])

  const oneSales = build({ turns: [turns[0], turns[1]], events: [] }).summary
  assert.deepEqual(oneSales.insufficiencyReasons, ['INSUFFICIENT_SALES_TURNS'])

  const shortTurns = [
    { ...turns[0], text: 'Halo.' },
    { ...turns[1], text: 'Pagi.' },
    { ...turns[2], text: 'Boleh bertanya?' },
  ]
  assert.deepEqual(build({ turns: shortTurns, events: [] }).summary.insufficiencyReasons, ['TRANSCRIPT_TOO_SHORT'])
})

test('HOME summary recalculates counts and missing categories from booleans', () => {
  const context = build()

  assert.deepEqual(context.home, {
    housingDiscovered: true,
    occupationDiscovered: true,
    moneyDiscovered: false,
    eligibilityDiscovered: false,
    completedCount: 2,
    completionRatio: 0.5,
    missingCategories: ['money', 'eligibility'],
  })
  assert.equal(context.finalState.home.completedCount, 2)
  assert.equal(context.finalState.home.completionRatio, 0.5)
})

test('event validation ignores duplicate IDs and malformed or ungrounded events', () => {
  const valid = roleplayEvent('same-id', 'PROBING_STARTED', 8, { topic: 'first' })
  const events = [
    valid,
    roleplayEvent('same-id', 'CLOSING_ATTEMPTED', 8, { topic: 'duplicate' }),
    roleplayEvent('invalid-type', 'NOT_REAL' as RoleplayEvent['eventType'], 8),
    roleplayEvent('missing-turn', 'PROBING_STARTED', 99),
    roleplayEvent('invalid-severity', 'PROBING_STARTED', 8, { severity: 'BAD' as RoleplayEvent['severity'] }),
    roleplayEvent('invalid-extractor', 'PROBING_STARTED', 8, { extractor: 'bad' as RoleplayEvent['extractor'] }),
    roleplayEvent('invalid-confidence', 'PROBING_STARTED', 8, { confidence: Number.NaN }),
  ]
  const context = build({ events })

  assert.equal(context.events.length, 1)
  assert.equal(context.events[0].id, 'same-id')
  assert.equal(context.events[0].topic, 'first')
})

test('event counts use sorted keys and aggregate supported event metrics', () => {
  const events = [
    roleplayEvent('closing-1', 'CLOSING_ATTEMPTED', 8),
    roleplayEvent('objection-1', 'OBJECTION_RAISED', 5),
    roleplayEvent('buying-1', 'BUYING_SIGNAL_DETECTED', 5),
    roleplayEvent('objection-2', 'OBJECTION_RESOLVED', 8),
    roleplayEvent('closing-2', 'CLOSING_ATTEMPTED', 8),
    roleplayEvent('next-1', 'NEXT_STEP_AGREED', 5),
  ]
  const summary = build({ events }).eventSummary

  assert.deepEqual(Object.keys(summary.eventCounts), [
    'BUYING_SIGNAL_DETECTED',
    'CLOSING_ATTEMPTED',
    'NEXT_STEP_AGREED',
    'OBJECTION_RAISED',
    'OBJECTION_RESOLVED',
  ])
  assert.equal(summary.buyingSignalCount, 1)
  assert.equal(summary.objectionRaisedCount, 1)
  assert.equal(summary.objectionResolvedCount, 1)
  assert.equal(summary.closingAttemptCount, 2)
  assert.equal(summary.nextStepAgreementCount, 1)
})

test('compliance events merge with state flags without payload leakage or duplicates', () => {
  const events = [
    roleplayEvent('pressure-1', 'PRESSURE_TACTIC', 8, { payload: { secret: 'arbitrary payload value' } }),
    roleplayEvent('guarantee-1', 'GUARANTEE_LANGUAGE', 8),
  ]
  const context = build({ events })

  assert.deepEqual(context.eventSummary.complianceEventTypes, ['PRESSURE_TACTIC', 'GUARANTEE_LANGUAGE'])
  assert.deepEqual(context.complianceFlags, ['PRESSURE_TACTIC', 'GUARANTEE_LANGUAGE'])
  assert.equal('payload' in context.events[0], false)
  assert.equal(JSON.stringify(context).includes('arbitrary payload value'), false)
})

test('objections and buying signals use normalized observed state values only', () => {
  const events = [
    roleplayEvent('raised-1', 'OBJECTION_RAISED', 5),
    roleplayEvent('raised-2', 'OBJECTION_RAISED', 5),
    roleplayEvent('resolved-1', 'OBJECTION_RESOLVED', 8),
    roleplayEvent('buying-1', 'BUYING_SIGNAL_DETECTED', 5),
  ]
  const context = build({ events })

  assert.equal(context.eventSummary.objectionRaisedCount, 2)
  assert.equal(context.eventSummary.objectionResolvedCount, 1)
  assert.equal(context.eventSummary.buyingSignalCount, 1)
  assert.deepEqual(context.unresolvedObjections, ['Price', 'Location'])
  assert.deepEqual(context.buyingSignals, ['Survey', 'Document check'])
  assert.equal(context.buyingSignals.includes(persona.buyingSignals[0]), false)
})

test('clearly malformed state metrics are clamped to 0-100', () => {
  const state = {
    ...finalState(),
    trust: 140,
    patience: -20,
    readiness: Number.NaN,
    perceivedRelevance: 101,
    pressureLevel: Number.POSITIVE_INFINITY,
    qualificationCompleteness: -5,
  }
  const context = build({ finalState: state })

  assert.equal(context.finalState.trust, 100)
  assert.equal(context.finalState.patience, 0)
  assert.equal(context.finalState.readiness, 0)
  assert.equal(context.finalState.perceivedRelevance, 100)
  assert.equal(context.finalState.pressureLevel, 0)
  assert.equal(context.finalState.qualificationCompleteness, 0)
})

test('builder does not mutate inputs and repeated calls are deterministic', () => {
  const events = [roleplayEvent('probe-1', 'PROBING_STARTED', 8)]
  const state = finalState()
  const snapshots = [persona, scenario, turns, events, state].map(value => JSON.stringify(value))

  const first = build({ events, finalState: state })
  const second = build({ events, finalState: state })

  assert.deepEqual(first, second)
  assert.deepEqual([persona, scenario, turns, events, state].map(value => JSON.stringify(value)), snapshots)
})

test('serialized context excludes hidden values, configured objections, and event payload values', () => {
  const events = [roleplayEvent('hidden-1', 'HIDDEN_INFORMATION_REVEALED', 8, {
    payload: { value: persona.hiddenInformation[0].value },
  })]
  const serialized = JSON.stringify(build({ events }))

  assert.equal(serialized.includes(persona.hiddenInformation[0].value), false)
  assert.equal(serialized.includes(persona.objections[0].statement!), false)
  assert.equal(serialized.includes('configured survey phrase'), false)
})
