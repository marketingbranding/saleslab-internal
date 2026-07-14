import { createInitialRoleplayState } from './state-reducer'
import type { CustomerStage, Difficulty, Persona, RoleplayState, Scenario } from './types'

export interface DeriveInitialRoleplayStateInput {
  persona: Persona
  scenario: Scenario
}

const difficultyAdjustment: Record<Difficulty, { trust: number; readiness: number }> = {
  easy: { trust: 5, readiness: 5 },
  medium: { trust: 0, readiness: 0 },
  hard: { trust: -5, readiness: -5 },
  expert: { trust: -10, readiness: -10 },
}

const stageReadinessAdjustment: Record<CustomerStage, number> = {
  awareness: 0,
  lead: 3,
  inquiry: 5,
  qualified: 15,
  survey_scheduled: 30,
  surveyed: 35,
  booking_intent: 45,
  booked: 60,
  document_collection: 65,
  bank_submission: 70,
  sp3k: 80,
  akad_scheduled: 90,
  akad_completed: 100,
  handover: 100,
  referral: 80,
  customer_withdrawn: 0,
}

const validCustomerStages = new Set<CustomerStage>(Object.keys(stageReadinessAdjustment) as CustomerStage[])

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampPercent(value: number | undefined, fallback: number): number {
  const safeValue = Number.isFinite(value) ? Number(value) : fallback
  return Math.round(clamp(safeValue, 0, 100))
}

// Structured persona values use 1-10. Legacy mappers mark their already-normalized
// 0-100 values with persona.legacy, so deriveInitialRoleplayState bypasses this helper for them.
function normalizeTenPointScale(value: number | undefined, fallback: number): number {
  const safeValue = Number.isFinite(value) ? Number(value) : fallback
  return clamp(safeValue, 1, 10)
}

export function mapPersonaPatienceToPercent(patience: number | undefined): number {
  const normalized = normalizeTenPointScale(patience, 5.5)
  return Math.round(((normalized - 1) / 9) * 100)
}

function isLegacyMappedPersona(persona: Persona): boolean {
  return Boolean(persona.legacy)
}

function skepticismAdjustment(persona: Persona): number {
  const normalized = isLegacyMappedPersona(persona)
    ? clampPercent(persona.skepticism, 50) / 10
    : normalizeTenPointScale(persona.skepticism, 5)

  if (normalized >= 9) return -15
  if (normalized >= 7) return -10
  if (normalized >= 4) return -5
  return 0
}

function urgencyAdjustment(urgency: number | undefined): number {
  if (urgency === undefined || !Number.isFinite(urgency)) return 0
  const normalized = normalizeTenPointScale(urgency, 1)
  if (normalized >= 9) return 20
  if (normalized >= 7) return 15
  if (normalized >= 5) return 10
  if (normalized >= 3) return 5
  return 0
}

function safeDifficulty(difficulty: Scenario['difficulty']): Difficulty {
  return difficulty in difficultyAdjustment ? difficulty : 'medium'
}

function safeCustomerStage(stage: Scenario['stage']): CustomerStage {
  return validCustomerStages.has(stage) ? stage : 'inquiry'
}

export function deriveInitialTrust(persona: Persona, scenario: Scenario): number {
  const difficulty = safeDifficulty(scenario.difficulty)
  const baseTrust = clampPercent(persona.trustStart, 25)
  return clampPercent(
    baseTrust + skepticismAdjustment(persona) + difficultyAdjustment[difficulty].trust,
    25
  )
}

export function deriveInitialReadiness(persona: Persona, scenario: Scenario): number {
  const difficulty = safeDifficulty(scenario.difficulty)
  const customerStage = safeCustomerStage(scenario.stage)
  return clampPercent(
    10 +
      urgencyAdjustment(persona.urgency) +
      stageReadinessAdjustment[customerStage] +
      difficultyAdjustment[difficulty].readiness,
    10
  )
}

export function deriveInitialRoleplayState({
  persona,
  scenario,
}: DeriveInitialRoleplayStateInput): RoleplayState {
  const customerStage = safeCustomerStage(scenario.stage)
  const patience = isLegacyMappedPersona(persona)
    ? clampPercent(persona.patience, 50)
    : mapPersonaPatienceToPercent(persona.patience)

  const baseState = createInitialRoleplayState({
    scenarioId: scenario.id,
    personaId: persona.id,
    initialTrust: deriveInitialTrust(persona, scenario),
    initialReadiness: deriveInitialReadiness(persona, scenario),
  })

  return {
    ...baseState,
    patience,
    customerStage,
    pressureLevel: 0,
    perceivedRelevance: 0,
    qualificationCompleteness: 0,
  }
}
