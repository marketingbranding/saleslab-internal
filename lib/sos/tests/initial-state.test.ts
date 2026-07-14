import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveInitialReadiness,
  deriveInitialRoleplayState,
  deriveInitialTrust,
  mapPersonaPatienceToPercent,
} from '../initial-state'
import { mapLegacyPersona } from '../legacy-mappers'
import type { SalesScenario } from '@/lib/gemini'
import type { CustomerStage, Difficulty, Persona, Scenario } from '../types'

const persona: Persona = {
  id: 'persona-test',
  name: 'Ibu Rina',
  gender: 'female',
  occupation: 'Pedagang',
  incomeRange: 'Rp4-5 juta',
  housingStatus: 'Kontrak',
  patience: 5,
  aggressiveness: 4,
  skepticism: 7,
  urgency: 6,
  trustStart: 45,
  hiddenInformation: [{
    key: 'income_instability',
    value: 'Pendapatan tidak tetap.',
    revealWhen: ['trust>=60'],
    importance: 'critical',
  }],
  objections: [],
  buyingSignals: ['bertanya survey'],
  walkAwayConditions: [],
  difficulty: 'hard',
}

const scenario: Scenario = {
  id: 'scenario-test',
  name: 'Inquiry KPR Subsidi',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: ['discover HOME data'],
  targetSkills: ['probing'],
  customerStartsFirst: true,
  difficulty: 'hard',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

function withDifficulty(difficulty: Difficulty): Scenario {
  return { ...scenario, difficulty }
}

function withStage(stage: CustomerStage): Scenario {
  return { ...scenario, stage, difficulty: 'medium' }
}

test('derived state preserves IDs and starts conversational stage at opening', () => {
  const state = deriveInitialRoleplayState({ persona, scenario })

  assert.equal(state.scenarioId, scenario.id)
  assert.equal(state.personaId, persona.id)
  assert.equal(state.stage, 'opening')
  assert.equal(state.customerStage, 'inquiry')
})

test('patience maps full 1-10 range to 0-100 consistently', () => {
  assert.equal(mapPersonaPatienceToPercent(1), 0)
  assert.equal(mapPersonaPatienceToPercent(5), 44)
  assert.equal(mapPersonaPatienceToPercent(10), 100)
  assert.equal(mapPersonaPatienceToPercent(Number.NaN), 50)
  assert.equal(mapPersonaPatienceToPercent(-5), 0)
  assert.equal(mapPersonaPatienceToPercent(99), 100)
})

test('legacy mapped persona patience is already 0-100 and is not normalized twice', () => {
  const legacyScenario: SalesScenario = {
    id: 'legacy-low-patience',
    title: 'Legacy Scenario',
    description: 'Legacy scale fixture.',
    target: 'Schedule a survey.',
    consumerProfile: 'Skeptical customer.',
    difficulty: 'Hard',
    icon: 'Phone',
    name: 'Ibu Legacy',
    gender: 'Wanita',
    aggressiveness: 7,
    patience: 1,
    responseStyle: 'Ragu-ragu',
    firstSpeaker: 'AI',
  }
  const mappedPersona = mapLegacyPersona(legacyScenario)
  const state = deriveInitialRoleplayState({ persona: mappedPersona, scenario })

  assert.equal(mappedPersona.patience, 10)
  assert.equal(state.patience, 10)
})

test('trust uses persona trustStart with skepticism and difficulty adjustments', () => {
  assert.equal(deriveInitialTrust(persona, scenario), 30)
  assert.equal(deriveInitialTrust({ ...persona, trustStart: 2 }, withDifficulty('expert')), 0)
  assert.equal(deriveInitialTrust({ ...persona, trustStart: 99, skepticism: 1 }, withDifficulty('easy')), 100)
})

test('readiness reflects urgency, customer stage, and difficulty', () => {
  const low = deriveInitialReadiness({ ...persona, urgency: 1 }, { ...scenario, stage: 'awareness', difficulty: 'hard' })
  const high = deriveInitialReadiness({ ...persona, urgency: 10 }, { ...scenario, stage: 'booking_intent', difficulty: 'easy' })

  assert.equal(low, 5)
  assert.equal(high, 80)
  assert.ok(high > low)
})

test('difficulty matrix applies deterministic relative trust and readiness adjustments', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert']
  const trusts = difficulties.map(difficulty => deriveInitialTrust(persona, withDifficulty(difficulty)))
  const readiness = difficulties.map(difficulty => deriveInitialReadiness(persona, withDifficulty(difficulty)))

  assert.deepEqual(trusts, [40, 35, 30, 25])
  assert.deepEqual(readiness, [30, 25, 20, 15])
})

test('scenario customer stage is retained and changes readiness without changing conversation stage', () => {
  const stages: CustomerStage[] = ['awareness', 'inquiry', 'qualified', 'survey_scheduled', 'booking_intent', 'customer_withdrawn']
  const states = stages.map(stage => deriveInitialRoleplayState({
    persona: { ...persona, urgency: 1 },
    scenario: withStage(stage),
  }))

  assert.deepEqual(states.map(state => state.customerStage), stages)
  assert.deepEqual(states.map(state => state.stage), stages.map(() => 'opening'))
  assert.deepEqual(states.map(state => state.readiness), [10, 15, 25, 40, 55, 10])
})

test('invalid runtime customer stage falls back to inquiry', () => {
  const invalidScenario = { ...scenario, stage: 'invalid-stage' as CustomerStage }
  const state = deriveInitialRoleplayState({ persona, scenario: invalidScenario })

  assert.equal(state.customerStage, 'inquiry')
})

test('initial observed runtime fields remain empty despite configured persona data', () => {
  const state = deriveInitialRoleplayState({ persona, scenario })

  assert.deepEqual(state.home, {
    housingDiscovered: false,
    occupationDiscovered: false,
    moneyDiscovered: false,
    eligibilityDiscovered: false,
    completedCount: 0,
    completionRatio: 0,
  })
  assert.deepEqual(state.metrics, {
    objectionCount: 0,
    buyingSignalCount: 0,
    closingAttemptCount: 0,
    nextStepAgreementCount: 0,
  })
  assert.deepEqual(state.revealedInformation, [])
  assert.deepEqual(state.buyingSignals, [])
  assert.deepEqual(state.unresolvedConcerns, [])
  assert.deepEqual(state.complianceFlags, [])
  assert.equal(state.compliance.guaranteeLanguageCount, 0)
  assert.equal(state.compliance.documentManipulationCount, 0)
  assert.equal(state.compliance.pressureTacticCount, 0)
  assert.equal(state.compliance.criticalViolationDetected, false)
})

test('malformed numeric inputs produce bounded deterministic output', () => {
  const malformedPersona: Persona = {
    ...persona,
    patience: Number.NaN,
    trustStart: Number.POSITIVE_INFINITY,
    skepticism: 99,
    urgency: Number.NEGATIVE_INFINITY,
  }
  const first = deriveInitialRoleplayState({ persona: malformedPersona, scenario })
  const second = deriveInitialRoleplayState({ persona: malformedPersona, scenario })

  assert.equal(first.patience, 50)
  assert.ok(first.trust >= 0 && first.trust <= 100)
  assert.ok(first.readiness >= 0 && first.readiness <= 100)
  assert.equal(first.pressureLevel, 0)
  assert.deepEqual(first, second)
})

test('derivation does not mutate persona or scenario inputs', () => {
  const personaSnapshot = JSON.stringify(persona)
  const scenarioSnapshot = JSON.stringify(scenario)

  deriveInitialRoleplayState({ persona, scenario })

  assert.equal(JSON.stringify(persona), personaSnapshot)
  assert.equal(JSON.stringify(scenario), scenarioSnapshot)
})
