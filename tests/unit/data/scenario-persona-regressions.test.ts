import assert from 'node:assert/strict'
import test from 'node:test'
import type { SalesScenario } from '../../../lib/gemini'
import { mapLegacyPersona as mapLegacyScenarioPersona } from '../../../lib/sos/legacy-mappers'
import { mapApprovedPersonaDocuments } from '../../../lib/data/firestore/firestore-persona-repository'
import {
  createScenarioDefaults,
  duplicateScenario,
  isScenarioVisible,
  mapLegacyScenario,
  normalizePersona,
  normalizeScenario,
  resolveScenarioPersona,
  type ScenarioEditorRecord,
} from '../../../lib/data'

const legacyScenario: SalesScenario = {
  id: 'legacy-negotiation',
  title: 'Legacy Negotiation',
  description: 'Legacy roleplay data',
  target: 'Reach an agreement',
  consumerProfile: 'Careful buyer',
  difficulty: 'Medium',
  icon: 'User',
  name: 'Pak Budi',
  gender: 'Pria',
  aggressiveness: 6,
  patience: 4,
  responseStyle: 'Banyak Tanya',
  firstSpeaker: 'AI',
}

test('legacy scenario loads with embedded persona compatibility', () => {
  const normalized = mapLegacyScenario(legacyScenario)
  const persona = mapLegacyScenarioPersona(normalized)

  assert.equal(normalized.id, legacyScenario.id)
  assert.equal(normalized.target, legacyScenario.target)
  assert.equal(persona.id, `legacy-persona-${legacyScenario.id}`)
  assert.equal(persona.name, legacyScenario.name)
})

test('persona-linked scenario resolves an approved public persona', () => {
  const persona = normalizePersona('persona-approved', {
    name: 'Ibu Sari',
    status: 'approved',
    hiddenInstructions: 'must not be exposed',
  })
  const scenario = normalizeScenario('linked-scenario', {
    ...createScenarioDefaults(),
    personaId: persona.id,
  })

  assert.equal(resolveScenarioPersona(scenario, [persona]), persona)
  assert.equal('hiddenInstructions' in persona, false)
})

test('scenario without personaId continues through legacy persona mapping', () => {
  const scenario = mapLegacyScenario(legacyScenario)

  assert.equal(resolveScenarioPersona(scenario, []), null)
  assert.equal(mapLegacyScenarioPersona(scenario).name, 'Pak Budi')
})

test('archived scenario is hidden and published scenario is visible', () => {
  const archived = normalizeScenario('archived', { ...legacyScenario, status: 'archived' })
  const published = normalizeScenario('published', { ...legacyScenario, status: 'published' })

  assert.equal(isScenarioVisible(archived), false)
  assert.equal(isScenarioVisible(published), true)
})

test('duplicating a scenario creates a new valid ID', () => {
  const original = normalizeScenario(legacyScenario.id, legacyScenario) as ScenarioEditorRecord
  const duplicate = duplicateScenario(original)

  assert.notEqual(duplicate.id, original.id)
  assert.match(duplicate.id, /^[a-zA-Z0-9_-]{1,128}$/)
  assert.equal(duplicate.title, `${original.title} (Salinan)`)
})

test('normal-user persona normalization never exposes secret fields', () => {
  const [persona] = mapApprovedPersonaDocuments([{
    id: 'legacy-persona',
    data: () => ({
      name: 'Legacy Persona',
      hiddenInstructions: 'secret instructions',
      personaKnowledge: 'secret knowledge',
      personaUnknowns: 'secret unknowns',
    }),
  }])

  assert.ok(persona)
  assert.equal('hiddenInstructions' in persona, false)
  assert.equal('personaKnowledge' in persona, false)
  assert.equal('personaUnknowns' in persona, false)
  assert.equal(mapApprovedPersonaDocuments([{ id: 'archived', data: () => ({ status: 'archived' }) }]).length, 0)
})
