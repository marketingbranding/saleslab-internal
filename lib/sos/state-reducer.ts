import type { ConversationStage, EventSeverity, RoleplayEvent, RoleplayState } from './types'

export interface CreateRoleplayStateInput {
  scenarioId?: string
  personaId?: string
  initialTrust?: number
  initialReadiness?: number
}

const stageRank: Record<ConversationStage, number> = {
  opening: 0,
  discovery: 1,
  solution: 2,
  objection: 2,
  closing: 3,
  committed: 4,
}

const severityRank: Record<EventSeverity, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function moveStage(current: ConversationStage, next: ConversationStage): ConversationStage {
  return stageRank[next] >= stageRank[current] ? next : current
}

function maxSeverity(current: EventSeverity | undefined, next: EventSeverity): EventSeverity {
  if (!current) return next
  return severityRank[next] > severityRank[current] ? next : current
}

function recalculateHome(home: RoleplayState['home']): RoleplayState['home'] {
  const completedCount = Number(home.housingDiscovered) +
    Number(home.occupationDiscovered) +
    Number(home.moneyDiscovered) +
    Number(home.eligibilityDiscovered)

  return {
    ...home,
    completedCount,
    completionRatio: completedCount / 4,
  }
}

export function createInitialRoleplayState(input: CreateRoleplayStateInput = {}): RoleplayState {
  return {
    scenarioId: input.scenarioId,
    personaId: input.personaId,
    stage: 'opening',
    home: {
      housingDiscovered: false,
      occupationDiscovered: false,
      moneyDiscovered: false,
      eligibilityDiscovered: false,
      completedCount: 0,
      completionRatio: 0,
    },
    metrics: {
      objectionCount: 0,
      buyingSignalCount: 0,
      closingAttemptCount: 0,
      nextStepAgreementCount: 0,
    },
    trust: clampPercent(input.initialTrust ?? 25),
    patience: 100,
    readiness: clampPercent(input.initialReadiness ?? 10),
    perceivedRelevance: 0,
    pressureLevel: 0,
    qualificationCompleteness: 0,
    customerStage: 'inquiry',
    objectionStatus: {},
    revealedInformation: [],
    unresolvedConcerns: [],
    buyingSignals: [],
    complianceFlags: [],
    compliance: {
      guaranteeLanguageCount: 0,
      documentManipulationCount: 0,
      pressureTacticCount: 0,
      criticalViolationDetected: false,
    },
    processedEventIds: [],
  }
}

export function reduceRoleplayEvent(state: RoleplayState, event: RoleplayEvent): RoleplayState {
  if (state.processedEventIds.includes(event.id)) return state

  let stage = state.stage
  let home = state.home
  let trustDelta = 0
  let readinessDelta = 0
  let readinessMinimum: number | undefined
  const metrics = { ...state.metrics }
  const compliance = { ...state.compliance }
  const complianceFlags = [...state.complianceFlags]
  const buyingSignals = [...state.buyingSignals]
  const unresolvedConcerns = [...state.unresolvedConcerns]

  switch (event.eventType) {
    case 'APPROACHING_STARTED':
      stage = moveStage(stage, 'opening')
      trustDelta += 2
      break
    case 'PROBING_STARTED':
      stage = moveStage(stage, 'discovery')
      trustDelta += 2
      readinessDelta += 1
      break
    case 'HOUSING_INFO_DISCOVERED':
      stage = moveStage(stage, 'discovery')
      if (!home.housingDiscovered) {
        home = recalculateHome({ ...home, housingDiscovered: true })
        readinessDelta += 5
      }
      break
    case 'OCCUPATION_INFO_DISCOVERED':
      stage = moveStage(stage, 'discovery')
      if (!home.occupationDiscovered) {
        home = recalculateHome({ ...home, occupationDiscovered: true })
        readinessDelta += 5
      }
      break
    case 'MONEY_INFO_DISCOVERED':
      stage = moveStage(stage, 'discovery')
      if (!home.moneyDiscovered) {
        home = recalculateHome({ ...home, moneyDiscovered: true })
        readinessDelta += 5
      }
      break
    case 'ELIGIBILITY_INFO_DISCOVERED':
      stage = moveStage(stage, 'discovery')
      if (!home.eligibilityDiscovered) {
        home = recalculateHome({ ...home, eligibilityDiscovered: true })
        readinessDelta += 5
      }
      break
    case 'SOLUTION_PRESENTED':
      stage = moveStage(stage, 'solution')
      trustDelta += 4
      readinessDelta += 8
      break
    case 'OBJECTION_RAISED':
      stage = moveStage(stage, 'objection')
      metrics.objectionCount += 1
      trustDelta -= 2
      readinessDelta -= 5
      unresolvedConcerns.push(event.topic ?? 'other')
      break
    case 'BUYING_SIGNAL_DETECTED':
      metrics.buyingSignalCount += 1
      trustDelta += 3
      readinessDelta += 12
      buyingSignals.push(event.topic ?? event.eventType)
      break
    case 'CLOSING_ATTEMPTED':
      stage = moveStage(stage, 'closing')
      metrics.closingAttemptCount += 1
      readinessDelta += 5
      break
    case 'NEXT_STEP_AGREED':
      stage = moveStage(stage, 'committed')
      metrics.nextStepAgreementCount += 1
      trustDelta += 5
      readinessMinimum = 85
      readinessDelta += 10
      break
    case 'GUARANTEE_LANGUAGE':
      compliance.guaranteeLanguageCount += 1
      compliance.highestSeverity = maxSeverity(compliance.highestSeverity, 'CRITICAL')
      compliance.criticalViolationDetected = true
      complianceFlags.push(event.eventType)
      trustDelta -= 15
      readinessDelta -= 5
      break
    case 'DOCUMENT_MANIPULATION_SUGGESTED':
      compliance.documentManipulationCount += 1
      compliance.highestSeverity = maxSeverity(compliance.highestSeverity, 'CRITICAL')
      compliance.criticalViolationDetected = true
      complianceFlags.push(event.eventType)
      trustDelta -= 25
      readinessDelta -= 10
      break
    case 'PRESSURE_TACTIC':
      compliance.pressureTacticCount += 1
      compliance.highestSeverity = maxSeverity(compliance.highestSeverity, 'HIGH')
      complianceFlags.push(event.eventType)
      trustDelta -= 12
      readinessDelta -= 8
      break
  }

  const readinessBase = readinessMinimum === undefined
    ? state.readiness
    : Math.max(state.readiness, readinessMinimum)
  const readiness = clampPercent(readinessBase + readinessDelta)

  return {
    ...state,
    stage,
    home,
    metrics,
    trust: clampPercent(state.trust + trustDelta),
    readiness,
    qualificationCompleteness: home.completionRatio,
    buyingSignals,
    unresolvedConcerns,
    complianceFlags,
    compliance,
    lastEventType: event.eventType,
    lastEventTurnSequence: event.sourceTurnSequence,
    processedEventIds: [...state.processedEventIds, event.id],
  }
}

export function reduceRoleplayEvents(state: RoleplayState, events: RoleplayEvent[]): RoleplayState {
  return [...events]
    .sort((a, b) =>
      a.sourceTurnSequence - b.sourceTurnSequence ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
    )
    .reduce(reduceRoleplayEvent, state)
}
