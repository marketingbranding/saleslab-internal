import test from 'node:test'
import assert from 'node:assert/strict'
import type { SalesScenario } from '@/lib/gemini'
import { DEFAULT_PERSONA, mapPersonaDataToSos, normalizePersonaData, toPersonaPublicData } from '@/lib/personas'

const scenario: SalesScenario = {
  id: 'scenario-persona-test',
  personaId: 'persona-test',
  title: 'Uji Persona',
  description: 'Skenario pengujian persona approved.',
  target: 'Mendapatkan komitmen follow-up.',
  consumerProfile: 'Konsumen berhati-hati.',
  difficulty: 'Hard',
  icon: 'User',
  name: 'Ibu Test',
  gender: 'Wanita',
  aggressiveness: 3,
  patience: 7,
  responseStyle: 'Banyak Tanya',
  firstSpeaker: 'AI',
}

test('submission payload strips admin-only persona fields', () => {
  const payload = toPersonaPublicData({
    ...DEFAULT_PERSONA,
    id: 'persona-test',
    name: 'Ibu Test',
    hiddenInstructions: 'internal instruction',
    personaKnowledge: 'private knowledge',
    personaUnknowns: 'unknown facts',
    creatorEmail: 'admin@example.com',
    status: 'approved',
  })

  assert.equal(payload.name, 'Ibu Test')
  assert.equal('hiddenInstructions' in payload, false)
  assert.equal('personaKnowledge' in payload, false)
  assert.equal('personaUnknowns' in payload, false)
  assert.equal('creatorEmail' in payload, false)
  assert.equal('status' in payload, false)
})

test('legacy persona documents receive safe workflow defaults', () => {
  const persona = normalizePersonaData('legacy-persona', { name: 'Persona Lama' })

  assert.equal(persona.id, 'legacy-persona')
  assert.equal(persona.name, 'Persona Lama')
  assert.equal(persona.status, 'approved')
  assert.equal(persona.version, 1)
  assert.equal(persona.patience, 5)
})

test('approved persona maps to SOS runtime behavior', () => {
  const persona = mapPersonaDataToSos({
    ...DEFAULT_PERSONA,
    id: 'persona-test',
    name: 'Ibu Test',
    gender: 'Wanita',
    patience: 7,
    aggressiveness: 3,
    trustLevel: 4,
    commonObjections: 'Harga terlalu tinggi; Lokasi terlalu jauh',
    motivations: 'Ingin rumah untuk keluarga',
  }, scenario)

  assert.equal(persona.id, 'persona-test')
  assert.equal(persona.gender, 'female')
  assert.equal(persona.patience, 70)
  assert.equal(persona.aggressiveness, 30)
  assert.equal(persona.skepticism, 60)
  assert.equal(persona.objections.length, 2)
  assert.deepEqual(persona.buyingSignals, ['Ingin rumah untuk keluarga'])
  assert.equal(persona.difficulty, 'hard')
})
