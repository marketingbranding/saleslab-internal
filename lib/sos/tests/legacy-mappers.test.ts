import test from 'node:test'
import assert from 'node:assert/strict'
import type { SalesScenario } from '@/lib/gemini'
import { mapLegacyPersona, mapSalesScenario } from '../legacy-mappers'

const legacyScenario: SalesScenario = {
  id: 'kpr-test',
  title: 'BI Checking Bermasalah',
  description: 'Customer takut tidak lolos BI checking.',
  target: 'Ajak customer kumpulkan dokumen untuk pre-check.',
  consumerProfile: 'Skeptis karena pernah terlambat membayar cicilan motor.',
  difficulty: 'Hard',
  icon: 'ShieldAlert',
  name: 'Pak Budi',
  gender: 'Pria',
  aggressiveness: 7,
  patience: 4,
  responseStyle: 'Ragu-ragu',
  firstSpeaker: 'AI',
  hiddenRules: 'Jangan ungkap cicilan motor kecuali ditanya spesifik.',
  successCriteria: ['Bangun rapport', 'Gali riwayat kredit'],
}

test('mapSalesScenario preserves legacy scenario identity and goal fields', () => {
  const scenario = mapSalesScenario(legacyScenario)

  assert.equal(scenario.id, legacyScenario.id)
  assert.equal(scenario.name, legacyScenario.title)
  assert.equal(scenario.channel, 'voice')
  assert.equal(scenario.personaId, `legacy-persona-${legacyScenario.id}`)
  assert.deepEqual(scenario.salesGoals, legacyScenario.successCriteria)
  assert.equal(scenario.expectedClosing, legacyScenario.target)
  assert.equal(scenario.difficulty, 'hard')
  assert.equal(scenario.customerStartsFirst, true)
})

test('mapLegacyPersona converts embedded legacy persona fields into a Persona', () => {
  const persona = mapLegacyPersona(legacyScenario)

  assert.equal(persona.id, `legacy-persona-${legacyScenario.id}`)
  assert.equal(persona.name, legacyScenario.name)
  assert.equal(persona.gender, 'male')
  assert.equal(persona.patience, 40)
  assert.equal(persona.aggressiveness, 70)
  assert.equal(persona.skepticism, 75)
  assert.equal(persona.trustStart, 25)
  assert.equal(persona.hiddenInformation.length, 0)
  assert.equal(persona.legacy?.hiddenRules, legacyScenario.hiddenRules)
  assert.equal(persona.difficulty, 'hard')
})
