import test from 'node:test'
import assert from 'node:assert/strict'
import { selectKnowledge } from '../knowledge-selector'
import { SOS_STATIC_KNOWLEDGE } from '../knowledge'
import { createInitialRoleplayState } from '../state-reducer'
import type { KnowledgeEntry, Persona, Scenario } from '../types'

const persona: Persona = {
  id: 'persona-selector',
  name: 'Ibu Rina',
  gender: 'female',
  patience: 5,
  aggressiveness: 4,
  skepticism: 5,
  trustStart: 45,
  hiddenInformation: [{
    key: 'private_income_detail',
    value: 'Secret monthly income value.',
    revealWhen: ['trust>=60'],
    importance: 'critical',
  }],
  objections: [],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'scenario-selector',
  name: 'Initial Inquiry',
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

function select(overrides: Partial<Parameters<typeof selectKnowledge>[0]> = {}) {
  return selectKnowledge({
    knowledge: SOS_STATIC_KNOWLEDGE,
    persona,
    scenario,
    ...overrides,
  })
}

function testKnowledge(count: number): KnowledgeEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    title: `Entry ${index}`,
    category: index % 2 === 0 ? 'sos' : 'spin',
    summary: `Summary ${index}`,
    tags: index % 2 === 0 ? ['sos'] : ['spin', 'discovery'],
  }))
}

test('empty knowledge returns empty selection and reasons', () => {
  assert.deepEqual(select({ knowledge: [] }), { selected: [], reasons: [] })
})

test('default maximum returns at most four entries', () => {
  const result = select({ knowledge: testKnowledge(8) })
  assert.ok(result.selected.length <= 4)
})

test('custom maximum is respected and malformed limits use safe bounds', () => {
  const knowledge = testKnowledge(12)

  assert.equal(select({ knowledge, maxEntries: 2 }).selected.length, 2)
  assert.ok(select({ knowledge, maxEntries: 0 }).selected.length <= 4)
  assert.ok(select({ knowledge, maxEntries: -2 }).selected.length <= 4)
  assert.ok(select({ knowledge, maxEntries: Number.NaN }).selected.length <= 4)
  assert.equal(select({ knowledge, maxEntries: 99 }).selected.length, 10)
})

test('baseline SOS customer-success entry is selected when available', () => {
  const result = select()
  assert.ok(result.selected.some(entry => entry.id === 'sos-customer-success'))
})

test('probing target prioritizes SPIN discovery knowledge', () => {
  const result = select({ scenario: { ...scenario, targetSkills: ['probing'] } })
  const reason = result.reasons.find(item => item.knowledgeId === 'spin-probing-flow')

  assert.ok(reason)
  assert.ok(reason.matchedSignals.includes('target-skill:probing'))
})

test('HOME target prioritizes qualification knowledge', () => {
  const result = select({ scenario: { ...scenario, targetSkills: ['home'] } })
  const reason = result.reasons.find(item => item.knowledgeId === 'home-qualification-checklist')

  assert.ok(reason)
  assert.ok(reason.matchedSignals.includes('target-skill:home'))
})

test('solution target prioritizes FAB knowledge', () => {
  const result = select({ scenario: { ...scenario, targetSkills: ['solution'] } })
  const reason = result.reasons.find(item => item.knowledgeId === 'fab-solution-presentation')

  assert.ok(reason)
  assert.ok(reason.matchedSignals.includes('target-skill:solution'))
})

test('closing target prioritizes stage-appropriate SOS knowledge', () => {
  const result = select({ scenario: { ...scenario, targetSkills: ['closing'] } })
  const reason = result.reasons.find(item => item.knowledgeId === 'sos-stage-appropriate-progress')

  assert.ok(reason)
  assert.ok(reason.matchedSignals.includes('target-skill:closing'))
})

test('scenario stage changes discovery versus FAB and closing relevance', () => {
  const inquiry = select({ scenario: { ...scenario, stage: 'inquiry' } })
  const booking = select({ scenario: { ...scenario, stage: 'booking_intent' } })

  assert.ok(inquiry.reasons.find(reason => reason.knowledgeId === 'spin-probing-flow')?.matchedSignals.includes('scenario-stage:inquiry'))
  assert.ok(inquiry.reasons.find(reason => reason.knowledgeId === 'home-qualification-checklist')?.matchedSignals.includes('scenario-stage:inquiry'))
  assert.ok(booking.reasons.find(reason => reason.knowledgeId === 'fab-solution-presentation')?.matchedSignals.includes('scenario-stage:booking_intent'))
  assert.ok(booking.reasons.find(reason => reason.knowledgeId === 'sos-stage-appropriate-progress')?.matchedSignals.includes('scenario-stage:booking_intent'))
})

test('expected closing adds next-step relevance', () => {
  const result = select({ scenario: { ...scenario, expectedClosing: 'Schedule a survey visit' } })
  const reason = result.reasons.find(item => item.knowledgeId === 'sos-stage-appropriate-progress')

  assert.ok(reason?.matchedSignals.includes('expected-closing:next-step'))
})

test('forbidden premature closing prioritizes stage-appropriate progress', () => {
  const result = select({ scenario: { ...scenario, forbiddenClosing: 'force booking before qualification' } })
  const reason = result.reasons.find(item => item.knowledgeId === 'sos-stage-appropriate-progress')

  assert.ok(reason?.matchedSignals.includes('forbidden-closing:premature'))
})

test('persona money objection prioritizes HOME while trust objection prioritizes SOS or SPIN', () => {
  const moneyPersona: Persona = {
    ...persona,
    objections: [{ key: 'cicilan', category: 'money', statement: 'Monthly installments concern.' }],
  }
  const trustPersona: Persona = {
    ...persona,
    objections: [{ key: 'uncertain', category: 'trust', statement: 'Private objection wording.' }],
  }
  const money = select({ persona: moneyPersona })
  const trust = select({ persona: trustPersona })

  assert.ok(money.reasons.find(reason => reason.knowledgeId === 'home-qualification-checklist')?.matchedSignals.includes('persona-objection:money'))
  assert.ok(trust.reasons.some(reason =>
    ['sos-customer-success', 'spin-probing-flow'].includes(reason.knowledgeId) &&
    reason.matchedSignals.includes('persona-objection:trust')
  ))
})

test('initial low trust/readiness and high readiness use conservative state signals', () => {
  const lowState = { ...createInitialRoleplayState(), trust: 30, readiness: 20 }
  const highState = { ...createInitialRoleplayState(), trust: 70, readiness: 70 }
  const low = select({ state: lowState })
  const high = select({ state: highState, scenario: { ...scenario, stage: 'booking_intent' } })

  assert.ok(low.reasons.some(reason => reason.matchedSignals.includes('state:low-trust')))
  assert.ok(low.reasons.some(reason => reason.matchedSignals.includes('state:low-readiness')))
  assert.ok(high.reasons.find(reason => reason.knowledgeId === 'fab-solution-presentation')?.matchedSignals.includes('state:high-readiness'))
})

test('unknown skills and objections do not create arbitrary signal matches', () => {
  const result = select({
    scenario: { ...scenario, targetSkills: ['unknown-skill'] },
    persona: { ...persona, objections: [{ key: 'unknown-objection', category: 'unknown-category' }] },
  })

  assert.equal(result.reasons.some(reason => reason.matchedSignals.some(signal => signal.includes('unknown'))), false)
})

test('aliases in the same target skill group do not inflate score', () => {
  const single = select({ scenario: { ...scenario, targetSkills: ['probing'] } })
  const aliases = select({ scenario: { ...scenario, targetSkills: ['probing', 'spin', 'discovery'] } })
  const singleReason = single.reasons.find(reason => reason.knowledgeId === 'spin-probing-flow')
  const aliasesReason = aliases.reasons.find(reason => reason.knowledgeId === 'spin-probing-flow')

  assert.equal(aliasesReason?.score, singleReason?.score)
  assert.equal(aliasesReason?.matchedSignals.filter(signal => signal === 'target-skill:probing').length, 1)
})

test('duplicate knowledge IDs keep first configured entry and empty IDs are ignored', () => {
  const first: KnowledgeEntry = { id: 'duplicate', title: 'First', category: 'sos', summary: 'First summary', tags: ['sos'] }
  const second: KnowledgeEntry = { id: 'duplicate', title: 'Second', category: 'spin', summary: 'Second summary', tags: ['spin'] }
  const empty: KnowledgeEntry = { id: '', title: 'Empty', category: 'sos', summary: 'Empty ID', tags: ['sos'] }
  const result = select({ knowledge: [first, second, empty] })

  assert.deepEqual(result.selected, [first])
})

test('selection is deterministic and does not mutate inputs', () => {
  const knowledge = [...SOS_STATIC_KNOWLEDGE]
  const state = createInitialRoleplayState()
  const knowledgeSnapshot = JSON.stringify(knowledge)
  const personaSnapshot = JSON.stringify(persona)
  const scenarioSnapshot = JSON.stringify(scenario)
  const stateSnapshot = JSON.stringify(state)

  const first = select({ knowledge, state })
  const second = select({ knowledge, state })

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(knowledge), knowledgeSnapshot)
  assert.equal(JSON.stringify(persona), personaSnapshot)
  assert.equal(JSON.stringify(scenario), scenarioSnapshot)
  assert.equal(JSON.stringify(state), stateSnapshot)
})

test('every selected entry has privacy-safe compact reasons', () => {
  const privateObjection = 'This complete objection statement must not appear in reasons.'
  const result = select({
    persona: {
      ...persona,
      objections: [{ key: 'cicilan', category: 'money', statement: privateObjection }],
    },
  })

  assert.equal(result.selected.length, result.reasons.length)
  for (const [index, reason] of result.reasons.entries()) {
    assert.equal(reason.knowledgeId, result.selected[index].id)
    assert.equal(typeof reason.score, 'number')
    assert.ok(Array.isArray(reason.matchedSignals))
    const serialized = JSON.stringify(reason)
    assert.equal(serialized.includes('Secret monthly income value.'), false)
    assert.equal(serialized.includes(privateObjection), false)
  }
})
