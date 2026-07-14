import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvaluationContext } from '../evaluation/context'
import {
  applyTrialScoreAdjustments,
  gradeFromScore,
  TRIAL_SCORE_CAP_RULES,
} from '../evaluation/score-adjustments'
import { createInitialRoleplayState, reduceRoleplayEvents } from '../state-reducer'
import type { Persona, RoleplayEvent, RoleplayEventType, Scenario } from '../types'

const persona: Persona = {
  id: 'score-persona',
  name: 'Private Persona Name',
  gender: 'female',
  patience: 5,
  aggressiveness: 4,
  skepticism: 6,
  trustStart: 40,
  hiddenInformation: [{ key: 'private', value: 'HIDDEN_SCORE_VALUE', revealWhen: [], importance: 'critical' }],
  objections: [],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'score-scenario',
  name: 'Score Scenario',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: [],
  targetSkills: [],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

const turns = [
  { sequence: 1, role: 'sales' as const, text: 'Selamat pagi, Bu.', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy' as const, finalized: true },
  { sequence: 2, role: 'customer' as const, text: 'Saya masih ngontrak dan bekerja sebagai pedagang.', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy' as const, finalized: true },
  { sequence: 3, role: 'sales' as const, text: 'Apakah mau kita jadwalkan survey?', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy' as const, finalized: true },
]

function event(
  id: string,
  eventType: RoleplayEventType,
  sourceTurnSequence: number,
  overrides: Partial<RoleplayEvent> = {}
): RoleplayEvent {
  return {
    id,
    sessionId: 'score-session',
    eventType,
    severity: 'LOW',
    sourceTurnSequence,
    confidence: 0.9,
    extractor: 'deterministic',
    createdAt: `1970-01-01T00:00:0${sourceTurnSequence}.000Z`,
    ...overrides,
  }
}

function context(events: RoleplayEvent[] = [], customTurns = turns) {
  const finalState = reduceRoleplayEvents(createInitialRoleplayState(), events)
  return buildEvaluationContext({ persona, scenario, turns: customTurns, events, finalState })
}

function eventRuleContext(eventType: RoleplayEventType, sequence = 1) {
  return context([
    event(`event-${eventType}-${sequence}`, eventType, sequence),
    event('housing-baseline', 'HOUSING_INFO_DISCOVERED', 2),
  ])
}

test('no applicable rules leaves score unchanged', () => {
  const result = applyTrialScoreAdjustments(88, context([event('housing-1', 'HOUSING_INFO_DISCOVERED', 2)]))

  assert.equal(result.originalScore, 88)
  assert.equal(result.adjustedScore, 88)
  assert.equal(result.effectiveMaxScore, 100)
  assert.equal(result.capped, false)
  assert.deepEqual(result.appliedAdjustments, [])
})

test('event-driven trial caps use configured score and severity', () => {
  const cases: Array<[RoleplayEventType, keyof typeof TRIAL_SCORE_CAP_RULES]> = [
    ['GUARANTEE_LANGUAGE', 'GUARANTEE_LANGUAGE'],
    ['DOCUMENT_MANIPULATION_SUGGESTED', 'DOCUMENT_MANIPULATION'],
    ['DISCRIMINATORY_LANGUAGE', 'DISCRIMINATORY_LANGUAGE'],
    ['PRIVACY_RISK', 'PRIVACY_RISK'],
    ['PRESSURE_TACTIC', 'PRESSURE_TACTIC'],
    ['MATERIAL_COST_OMITTED', 'MATERIAL_COST_OMITTED'],
    ['UNVERIFIED_CLAIM', 'UNVERIFIED_CLAIM'],
  ]

  for (const [eventType, ruleId] of cases) {
    const result = applyTrialScoreAdjustments(95, eventRuleContext(eventType))
    const configured = TRIAL_SCORE_CAP_RULES[ruleId]
    assert.equal(result.adjustedScore, configured.maxScore)
    assert.equal(result.controllingAdjustment?.ruleId, ruleId)
    assert.equal(result.controllingAdjustment?.severity, configured.severity)
  }
})

test('guarantee cap adjusts score to 65 and grade becomes D', () => {
  const result = applyTrialScoreAdjustments(90, eventRuleContext('GUARANTEE_LANGUAGE'))

  assert.equal(result.adjustedScore, 65)
  assert.equal(result.capped, true)
  assert.equal(gradeFromScore(result.adjustedScore), 'D')
})

test('score below an applicable cap remains unchanged while diagnostics retain the rule', () => {
  const result = applyTrialScoreAdjustments(55, eventRuleContext('GUARANTEE_LANGUAGE'))

  assert.equal(result.adjustedScore, 55)
  assert.equal(result.effectiveMaxScore, 65)
  assert.equal(result.capped, false)
  assert.deepEqual(result.appliedAdjustments.map(item => item.ruleId), ['GUARANTEE_LANGUAGE'])
})

test('multiple rules return all adjustments and strictest cap controls deterministically', () => {
  const events = [
    event('guarantee-7', 'GUARANTEE_LANGUAGE', 3),
    event('document-5', 'DOCUMENT_MANIPULATION_SUGGESTED', 1),
    event('guarantee-4', 'GUARANTEE_LANGUAGE', 1),
  ]
  const result = applyTrialScoreAdjustments(92, context(events))

  assert.deepEqual(result.appliedAdjustments.map(item => item.ruleId), [
    'DOCUMENT_MANIPULATION',
    'GUARANTEE_LANGUAGE',
    'NO_MEANINGFUL_DISCOVERY',
  ])
  assert.equal(result.controllingAdjustment?.ruleId, 'DOCUMENT_MANIPULATION')
  assert.equal(result.adjustedScore, 40)
  assert.deepEqual(
    result.appliedAdjustments.find(item => item.ruleId === 'GUARANTEE_LANGUAGE')?.sourceTurnSequences,
    [1, 3]
  )
})

test('duplicate flags and events produce one rule with deduplicated source turns', () => {
  const events = [
    event('guarantee-a', 'GUARANTEE_LANGUAGE', 1),
    event('guarantee-b', 'GUARANTEE_LANGUAGE', 1),
    event('guarantee-c', 'GUARANTEE_LANGUAGE', 3),
  ]
  const base = context(events)
  const duplicateFlagContext = {
    ...base,
    complianceFlags: [...base.complianceFlags, 'GUARANTEE_LANGUAGE', 'guarantee_language'],
  }
  const result = applyTrialScoreAdjustments(90, duplicateFlagContext)

  assert.equal(result.appliedAdjustments.filter(item => item.ruleId === 'GUARANTEE_LANGUAGE').length, 1)
  assert.deepEqual(result.appliedAdjustments.find(item => item.ruleId === 'GUARANTEE_LANGUAGE')?.sourceTurnSequences, [1, 3])
})

test('closing before zero or one HOME category applies, while two categories before closing do not', () => {
  const noHome = applyTrialScoreAdjustments(90, context([
    event('closing-1', 'CLOSING_ATTEMPTED', 1),
  ]))
  const oneHome = applyTrialScoreAdjustments(90, context([
    event('housing-2', 'HOUSING_INFO_DISCOVERED', 2),
    event('closing-3', 'CLOSING_ATTEMPTED', 3),
  ]))
  const twoHome = applyTrialScoreAdjustments(90, context([
    event('housing-2', 'HOUSING_INFO_DISCOVERED', 2),
    event('occupation-2', 'OCCUPATION_INFO_DISCOVERED', 2),
    event('closing-3', 'CLOSING_ATTEMPTED', 3),
  ]))

  assert.ok(noHome.appliedAdjustments.some(item => item.ruleId === 'CLOSING_BEFORE_DISCOVERY'))
  assert.ok(oneHome.appliedAdjustments.some(item => item.ruleId === 'CLOSING_BEFORE_DISCOVERY'))
  assert.equal(twoHome.appliedAdjustments.some(item => item.ruleId === 'CLOSING_BEFORE_DISCOVERY'), false)
})

test('later HOME discovery does not retroactively validate an early close', () => {
  const result = applyTrialScoreAdjustments(90, context([
    event('closing-1', 'CLOSING_ATTEMPTED', 1),
    event('housing-2', 'HOUSING_INFO_DISCOVERED', 2),
    event('occupation-2', 'OCCUPATION_INFO_DISCOVERED', 2),
  ]))

  assert.ok(result.appliedAdjustments.some(item => item.ruleId === 'CLOSING_BEFORE_DISCOVERY'))
  assert.deepEqual(
    result.appliedAdjustments.find(item => item.ruleId === 'CLOSING_BEFORE_DISCOVERY')?.sourceTurnSequences,
    [1]
  )
})

test('no meaningful discovery requires two sales turns and zero HOME categories', () => {
  const noDiscovery = applyTrialScoreAdjustments(90, context())
  const oneSalesTurn = turns.filter(turn => turn.sequence !== 3)
  const insufficient = applyTrialScoreAdjustments(90, context([], oneSalesTurn))
  const oneCategory = applyTrialScoreAdjustments(90, context([
    event('housing-2', 'HOUSING_INFO_DISCOVERED', 2),
  ]))

  assert.ok(noDiscovery.appliedAdjustments.some(item => item.ruleId === 'NO_MEANINGFUL_DISCOVERY'))
  assert.equal(insufficient.appliedAdjustments.some(item => item.ruleId === 'NO_MEANINGFUL_DISCOVERY'), false)
  assert.equal(oneCategory.appliedAdjustments.some(item => item.ruleId === 'NO_MEANINGFUL_DISCOVERY'), false)
})

test('grade boundaries use adjusted legacy thresholds', () => {
  const cases: Array<[number, string]> = [
    [90, 'A'], [89, 'B'], [80, 'B'], [79, 'C'], [70, 'C'],
    [69, 'D'], [60, 'D'], [59, 'E'], [0, 'E'],
  ]
  for (const [score, grade] of cases) assert.equal(gradeFromScore(score), grade)
})

test('adjustment diagnostics are privacy-safe, immutable, and deterministic', () => {
  const privateContext = context([
    event('privacy-1', 'PRIVACY_RISK', 1, {
      topic: 'PRIVATE_TOPIC_VALUE',
      payload: { value: 'PRIVATE_PAYLOAD_VALUE' },
    }),
  ])
  const snapshot = JSON.stringify(privateContext)
  const first = applyTrialScoreAdjustments(90, privateContext)
  const second = applyTrialScoreAdjustments(90, privateContext)
  const serialized = JSON.stringify(first)

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(privateContext), snapshot)
  assert.equal(serialized.includes('PRIVATE_TOPIC_VALUE'), false)
  assert.equal(serialized.includes('PRIVATE_PAYLOAD_VALUE'), false)
  assert.equal(serialized.includes('HIDDEN_SCORE_VALUE'), false)
  assert.equal(serialized.includes('Private Persona Name'), false)
  assert.equal(serialized.includes(turns[0].text), false)
})

test('malformed original score normalizes to zero before adjustments', () => {
  const result = applyTrialScoreAdjustments(Number.NaN, eventRuleContext('GUARANTEE_LANGUAGE'))
  assert.equal(result.originalScore, 0)
  assert.equal(result.adjustedScore, 0)
  assert.equal(result.capped, false)
})
