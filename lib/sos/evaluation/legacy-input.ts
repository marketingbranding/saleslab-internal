import type { SalesScenario } from '@/lib/gemini'
import { extractDeterministicEvents } from '../event-extractor'
import { deriveInitialRoleplayState } from '../initial-state'
import { mapLegacyPersona, mapSalesScenario } from '../legacy-mappers'
import { reduceRoleplayEvents } from '../state-reducer'
import type { NormalizedTurn, Persona, RoleplayEvent, RoleplayState, Scenario } from '../types'
import { buildEvaluationContext, type EvaluationContext } from './context'

export interface LegacyEvaluationInput {
  scenario: unknown
  transcript: unknown
}

export interface ReconstructedEvaluationInput {
  persona: Persona
  scenario: Scenario
  turns: NormalizedTurn[]
  events: RoleplayEvent[]
  finalState: RoleplayState
  context: EvaluationContext
}

export class LegacyEvaluationInputError extends Error {
  constructor() {
    super('Invalid legacy evaluation input')
    this.name = 'LegacyEvaluationInputError'
  }
}

const LEGACY_TIMESTAMP = '1970-01-01T00:00:00.000Z'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function numberValue(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(1, Math.min(10, number)) : fallback
}

function coerceLegacyScenario(value: unknown): SalesScenario {
  if (!isRecord(value)) throw new LegacyEvaluationInputError()

  const difficulty = value.difficulty === 'Easy' || value.difficulty === 'Hard'
    ? value.difficulty
    : 'Medium'
  const gender = value.gender === 'Wanita' ? 'Wanita' : 'Pria'
  const responseStyle = ['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(String(value.responseStyle))
    ? value.responseStyle as SalesScenario['responseStyle']
    : 'Ragu-ragu'
  const firstSpeaker = value.firstSpeaker === 'Sales' ? 'Sales' : 'AI'

  return {
    id: stringValue(value.id, 'legacy-evaluation'),
    title: stringValue(value.title, 'Skenario Roleplay'),
    description: stringValue(value.description, 'Skenario evaluasi roleplay sales.'),
    target: stringValue(value.target, 'Lakukan percakapan sales yang relevan dan tentukan langkah berikutnya.'),
    consumerProfile: stringValue(value.consumerProfile, 'Calon pelanggan KPR Subsidi.'),
    difficulty,
    icon: stringValue(value.icon, 'Target'),
    name: stringValue(value.name, 'Pelanggan'),
    gender,
    aggressiveness: numberValue(value.aggressiveness, 5),
    patience: numberValue(value.patience, 5),
    responseStyle,
    firstSpeaker,
    openingMessage: typeof value.openingMessage === 'string' ? value.openingMessage : undefined,
    successCriteria: Array.isArray(value.successCriteria)
      ? value.successCriteria.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      : undefined,
    baseXp: Number.isFinite(value.baseXp) ? Number(value.baseXp) : undefined,
    status: value.status === 'draft' || value.status === 'archived' ? value.status : 'published',
  }
}

function normalizeLegacyTranscript(value: unknown): NormalizedTurn[] {
  if (!Array.isArray(value)) throw new LegacyEvaluationInputError()
  const turns: NormalizedTurn[] = []

  for (const item of value) {
    if (!isRecord(item) || typeof item.text !== 'string') continue
    const text = item.text.trim()
    if (!text) continue
    const role = item.role === 'user' || item.role === 'sales'
      ? 'sales'
      : item.role === 'model' || item.role === 'customer'
        ? 'customer'
        : undefined
    if (!role) continue

    turns.push({
      sequence: turns.length + 1,
      role,
      text,
      timestamp: LEGACY_TIMESTAMP,
      source: 'legacy',
      finalized: true,
    })
  }
  return turns
}

function reconstructEvents(turns: NormalizedTurn[]): RoleplayEvent[] {
  const events: RoleplayEvent[] = []
  for (const turn of turns) {
    const extraction = extractDeterministicEvents(turn, {
      sessionId: 'evaluation-reconstruction',
      previousTurns: turns.filter(previousTurn => previousTurn.sequence < turn.sequence),
      existingEvents: events,
    })
    events.push(...extraction.events)
  }
  return events
}

export function reconstructLegacyEvaluationInput(
  input: LegacyEvaluationInput
): ReconstructedEvaluationInput {
  const legacyScenario = coerceLegacyScenario(input.scenario)
  const turns = normalizeLegacyTranscript(input.transcript)
  if (turns.length === 0) throw new LegacyEvaluationInputError()

  const scenario = mapSalesScenario(legacyScenario)
  const persona = mapLegacyPersona(legacyScenario)
  const events = reconstructEvents(turns)
  const initialState = deriveInitialRoleplayState({ persona, scenario })
  const finalState = reduceRoleplayEvents(initialState, events)
  const context = buildEvaluationContext({ persona, scenario, turns, events, finalState })

  return { persona, scenario, turns, events, finalState, context }
}
