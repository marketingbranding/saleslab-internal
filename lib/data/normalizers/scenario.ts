import type { SalesScenario } from '@/lib/gemini'
import type { PersonaRecord, ScenarioRecord } from '../types/records'

export const DEFAULT_SCENARIO_SUCCESS_CRITERIA = [
  'Understand the customer concern',
  'Build rapport and trust',
  'Present relevant solutions',
  'Handle objections professionally',
] as const

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function bounded(value: unknown, fallback = 5) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 10 ? Number(value) : fallback
}

export function createScenarioId(prefix = 'scenario') {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${suffix}`.slice(0, 128)
}

export function baseXpForDifficulty(difficulty: SalesScenario['difficulty']) {
  return difficulty === 'Easy' ? 50 : difficulty === 'Hard' ? 120 : 80
}

export function createScenarioDefaults(overrides: Partial<SalesScenario> = {}): SalesScenario {
  const difficulty = overrides.difficulty === 'Easy' || overrides.difficulty === 'Hard'
    ? overrides.difficulty
    : 'Medium'
  return {
    id: overrides.id || createScenarioId(),
    title: overrides.title || '',
    description: overrides.description || '',
    target: overrides.target || '',
    consumerProfile: overrides.consumerProfile || '',
    difficulty,
    icon: overrides.icon || 'UserPlus',
    name: overrides.name || '',
    gender: overrides.gender === 'Wanita' ? 'Wanita' : 'Pria',
    aggressiveness: bounded(overrides.aggressiveness),
    patience: bounded(overrides.patience),
    responseStyle: ['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(String(overrides.responseStyle))
      ? overrides.responseStyle as SalesScenario['responseStyle']
      : 'Banyak Tanya',
    firstSpeaker: overrides.firstSpeaker === 'Sales' ? 'Sales' : 'AI',
    ...(typeof overrides.openingMessage === 'string' ? { openingMessage: overrides.openingMessage } : {}),
    ...(Object.prototype.hasOwnProperty.call(overrides, 'hiddenRules') ? { hiddenRules: overrides.hiddenRules || '' } : {}),
    ...(overrides.successCriteria ? { successCriteria: [...overrides.successCriteria] } : {}),
    ...(typeof overrides.baseXp === 'number' ? { baseXp: overrides.baseXp } : {}),
    ...(overrides.status ? { status: overrides.status } : {}),
    ...(overrides.personaId ? { personaId: overrides.personaId } : {}),
  }
}

export function normalizeScenario(id: string, input: unknown): ScenarioRecord {
  const value = objectValue(input)
  const title = text(value.title, id)
  const description = text(value.description, title)
  const difficulty = value.difficulty === 'Easy' || value.difficulty === 'Hard' || value.difficulty === 'Medium'
    ? value.difficulty
    : 'Medium'
  const status = value.status === 'draft' || value.status === 'published' || value.status === 'archived'
    ? value.status
    : undefined
  const successCriteria = Array.isArray(value.successCriteria)
    ? value.successCriteria.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : undefined

  return {
    id,
    title,
    description,
    target: text(value.target, description),
    consumerProfile: text(value.consumerProfile, description),
    difficulty,
    icon: text(value.icon, 'UserPlus'),
    name: text(value.name, 'Konsumen'),
    gender: value.gender === 'Wanita' ? 'Wanita' : 'Pria',
    aggressiveness: bounded(value.aggressiveness),
    patience: bounded(value.patience),
    responseStyle: ['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(String(value.responseStyle))
      ? value.responseStyle as SalesScenario['responseStyle']
      : 'Banyak Tanya',
    firstSpeaker: value.firstSpeaker === 'Sales' ? 'Sales' : 'AI',
    ...(typeof value.personaId === 'string' && value.personaId ? { personaId: value.personaId } : {}),
    ...(typeof value.openingMessage === 'string' ? { openingMessage: value.openingMessage } : {}),
    ...(successCriteria ? { successCriteria } : {}),
    ...(typeof value.baseXp === 'number' && Number.isFinite(value.baseXp) ? { baseXp: value.baseXp } : {}),
    ...(status ? { status } : {}),
    ...(typeof value.userId === 'string' ? { userId: value.userId } : {}),
    ...(value.createdAt instanceof Date ? { createdAt: value.createdAt } : {}),
    ...(value.updatedAt instanceof Date ? { updatedAt: value.updatedAt } : {}),
  }
}

export function mapLegacyScenario(scenario: SalesScenario): ScenarioRecord {
  return normalizeScenario(scenario.id, scenario)
}

export function mergeScenarioCatalog(builtIns: readonly ScenarioRecord[], persisted: readonly ScenarioRecord[]) {
  const scenarios = new Map(builtIns.map(item => [item.id, item]))
  persisted.forEach(item => scenarios.set(item.id, item))
  return [...scenarios.values()]
}

export function isScenarioVisible(scenario: ScenarioRecord) {
  return scenario.status !== 'archived'
}

export function duplicateScenario(source: ScenarioRecord, id = createScenarioId('scenario-copy')): ScenarioRecord {
  const { createdAt: _createdAt, updatedAt: _updatedAt, userId: _userId, ...scenario } = source
  return { ...scenario, id, title: `${source.title} (Salinan)` }
}

export function resolveScenarioPersona(scenario: Pick<ScenarioRecord, 'personaId'>, personas: readonly PersonaRecord[]) {
  return scenario.personaId ? personas.find(persona => persona.id === scenario.personaId) || null : null
}
