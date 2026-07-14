import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyVoicePromptBudget,
  estimateKnowledgeCharacters,
  estimateVoicePromptCharacters,
  VOICE_PROMPT_BUDGET,
} from '../prompt-budget'
import { compileVoiceRoleplayPrompt } from '../prompt-compiler'
import type { KnowledgeEntry, Persona, Scenario } from '../types'

const persona: Persona = {
  id: 'persona-budget',
  name: 'Ibu Rina',
  gender: 'female',
  primaryGoal: 'Memiliki rumah pertama.',
  primaryFear: 'Pengajuan bank ditolak.',
  communicationStyle: 'Sopan dan berhati-hati',
  patience: 60,
  aggressiveness: 20,
  skepticism: 70,
  trustStart: 30,
  hiddenInformation: [{
    key: 'private_value',
    value: 'Hidden financial value must never appear in diagnostics.',
    revealWhen: ['trust>=60'],
    importance: 'critical',
  }],
  objections: [{
    key: 'private_objection',
    category: 'money',
    statement: 'Full private objection statement.',
  }],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'scenario-budget',
  name: 'Initial Inquiry',
  description: 'A normal KPR Subsidi inquiry.',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: [],
  targetSkills: ['probing'],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

function knowledge(id: string, summary = 'Short guidance.', category: KnowledgeEntry['category'] = 'sos'): KnowledgeEntry {
  return {
    id,
    title: `Title ${id}`,
    category,
    summary,
    tags: [category],
  }
}

function apply(overrides: Partial<Parameters<typeof applyVoicePromptBudget>[0]> = {}) {
  return applyVoicePromptBudget({
    persona,
    scenario,
    knowledge: [],
    ...overrides,
  })
}

test('empty knowledge estimates required prompt safely', () => {
  const result = apply()

  assert.deepEqual(result.knowledge, [])
  assert.deepEqual(result.removedKnowledgeIds, [])
  assert.equal(result.estimatedCharacters, compileVoiceRoleplayPrompt({ persona, scenario, knowledge: [] }).length)
  assert.equal(result.estimatedKnowledgeCharacters, 0)
  assert.equal(result.withinBudget, true)
})

test('normal knowledge remains unchanged when within budget', () => {
  const entries = [knowledge('a'), knowledge('b', 'Another short guide.', 'home')]
  const result = apply({ knowledge: entries })

  assert.deepEqual(result.knowledge, entries)
  assert.deepEqual(result.removedKnowledgeIds, [])
  assert.deepEqual(result.warnings, [])
  assert.equal(result.withinBudget, true)
})

test('entry-count trimming keeps earlier entries and reports removals in input order', () => {
  const entries = [knowledge('a'), knowledge('b'), knowledge('c'), knowledge('d')]
  const result = apply({ knowledge: entries, profile: { maxKnowledgeEntries: 2 } })

  assert.deepEqual(result.knowledge.map(entry => entry.id), ['a', 'b'])
  assert.deepEqual(result.removedKnowledgeIds, ['c', 'd'])
  assert.deepEqual(result.warnings.map(warning => warning.code), ['KNOWLEDGE_ENTRY_LIMIT'])
})

test('knowledge-character trimming removes entries from the end', () => {
  const entries = [knowledge('a', 'a'.repeat(50)), knowledge('b', 'b'.repeat(50)), knowledge('c', 'c'.repeat(50))]
  const result = apply({
    knowledge: entries,
    profile: { maxKnowledgeEntries: 4, maxKnowledgeCharacters: 90 },
  })

  assert.ok(result.knowledge.length < entries.length)
  assert.ok(result.estimatedKnowledgeCharacters <= 90)
  assert.ok(result.warnings.some(warning => warning.code === 'KNOWLEDGE_CHARACTER_LIMIT'))
  assert.deepEqual(result.removedKnowledgeIds, entries.slice(result.knowledge.length).map(entry => entry.id))
})

test('full prompt trimming removes optional knowledge until the prompt fits', () => {
  const requiredCharacters = estimateVoicePromptCharacters({ persona, scenario, knowledge: [] })
  const entries = [knowledge('a', 'a'.repeat(180)), knowledge('b', 'b'.repeat(180))]
  const maxCharacters = Math.max(1000, requiredCharacters + 100)
  const result = apply({
    knowledge: entries,
    profile: {
      maxCharacters,
      reservedCharacters: 1,
      maxKnowledgeCharacters: maxCharacters,
      maxKnowledgeEntries: 4,
    },
  })

  assert.ok(result.knowledge.length < entries.length)
  assert.equal(result.withinBudget, true)
  assert.ok(result.warnings.some(warning => warning.code === 'PROMPT_CHARACTER_LIMIT'))
})

test('required context oversized removes all knowledge and remains outside budget', () => {
  const oversizedPersona = { ...persona, primaryGoal: 'x'.repeat(5000) }
  const result = apply({
    persona: oversizedPersona,
    knowledge: [knowledge('optional')],
    profile: {
      maxCharacters: 1000,
      reservedCharacters: 1,
      maxKnowledgeCharacters: 1000,
    },
  })

  assert.deepEqual(result.knowledge, [])
  assert.equal(result.withinBudget, false)
  assert.ok(result.warnings.some(warning => warning.code === 'PROMPT_CHARACTER_LIMIT'))
  assert.ok(result.warnings.some(warning => warning.code === 'REQUIRED_CONTEXT_OVERSIZED'))
})

test('knowledge is deduplicated by ID and empty IDs are ignored', () => {
  const first = knowledge('duplicate', 'First configured summary.')
  const duplicate = knowledge('duplicate', 'Second configured summary.')
  const empty = knowledge('', 'Ignored summary.')
  const result = apply({ knowledge: [first, duplicate, empty] })

  assert.deepEqual(result.knowledge, [first])
  assert.deepEqual(result.removedKnowledgeIds, [])
})

test('baseline knowledge remains when it appears before entries removed from the end', () => {
  const baseline = knowledge('sos-customer-success')
  const result = apply({
    knowledge: [baseline, knowledge('b'), knowledge('c')],
    profile: { maxKnowledgeEntries: 1 },
  })

  assert.deepEqual(result.knowledge, [baseline])
})

test('malformed profile overrides normalize safely and deterministically', () => {
  const entries = Array.from({ length: 25 }, (_, index) => knowledge(`entry-${index}`, 'Tiny.'))
  const malformed = apply({
    knowledge: entries,
    profile: {
      maxCharacters: Number.NaN,
      reservedCharacters: Number.POSITIVE_INFINITY,
      maxKnowledgeCharacters: -10,
      maxKnowledgeEntries: 2.9,
    },
  })
  const zero = apply({
    knowledge: entries,
    profile: { maxCharacters: 0, reservedCharacters: 0, maxKnowledgeCharacters: 0, maxKnowledgeEntries: 0 },
  })
  const clamped = apply({
    knowledge: entries,
    profile: { maxCharacters: 1000, reservedCharacters: 9000, maxKnowledgeCharacters: 9000, maxKnowledgeEntries: 99 },
  })

  assert.equal(malformed.knowledge.length, 2)
  assert.ok(zero.knowledge.length <= VOICE_PROMPT_BUDGET.maxKnowledgeEntries)
  assert.ok(clamped.knowledge.length <= 20)
  assert.ok(clamped.estimatedKnowledgeCharacters <= 1000)
})

test('inputs are not mutated and identical input is deterministic', () => {
  const entries = [knowledge('a'), knowledge('b')]
  const profile = { maxKnowledgeEntries: 1.8 }
  const personaSnapshot = JSON.stringify(persona)
  const scenarioSnapshot = JSON.stringify(scenario)
  const knowledgeSnapshot = JSON.stringify(entries)
  const profileSnapshot = JSON.stringify(profile)

  const first = apply({ knowledge: entries, profile })
  const second = apply({ knowledge: entries, profile })

  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(persona), personaSnapshot)
  assert.equal(JSON.stringify(scenario), scenarioSnapshot)
  assert.equal(JSON.stringify(entries), knowledgeSnapshot)
  assert.equal(JSON.stringify(profile), profileSnapshot)
})

test('warning codes are unique and final estimate equals compiled prompt length', () => {
  const entries = Array.from({ length: 6 }, (_, index) => knowledge(`large-${index}`, 'x'.repeat(700)))
  const result = apply({
    knowledge: entries,
    profile: { maxKnowledgeEntries: 3, maxKnowledgeCharacters: 800 },
  })
  const warningCodes = result.warnings.map(warning => warning.code)

  assert.equal(new Set(warningCodes).size, warningCodes.length)
  assert.equal(result.estimatedCharacters, compileVoiceRoleplayPrompt({
    persona,
    scenario,
    knowledge: result.knowledge,
  }).length)
  assert.equal(result.estimatedKnowledgeCharacters, estimateKnowledgeCharacters(result.knowledge))
})

test('warnings and removed IDs contain no private prompt or knowledge content', () => {
  const privateSummary = 'Private knowledge summary that must not appear in diagnostics.'
  const result = apply({
    knowledge: [knowledge('safe-id', privateSummary), knowledge('removed-id', privateSummary)],
    profile: { maxKnowledgeEntries: 1 },
  })
  const diagnostics = JSON.stringify({ warnings: result.warnings, removedKnowledgeIds: result.removedKnowledgeIds })

  assert.equal(diagnostics.includes(privateSummary), false)
  assert.equal(diagnostics.includes('Hidden financial value'), false)
  assert.equal(diagnostics.includes('Full private objection statement'), false)
  assert.equal(diagnostics.includes(compileVoiceRoleplayPrompt({ persona, scenario, knowledge: result.knowledge })), false)
})
