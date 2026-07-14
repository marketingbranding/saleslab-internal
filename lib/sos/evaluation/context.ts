import type {
  EventSeverity,
  NormalizedTurn,
  Persona,
  RoleplayEvent,
  RoleplayEventType,
  RoleplayState,
  Scenario,
  TurnSource,
} from '../types'

export interface EvaluationContextSummary {
  totalTurns: number
  salesTurns: number
  customerTurns: number
  transcriptCharacters: number
  isTranscriptSufficient: boolean
  insufficiencyReasons: string[]
}

export interface EvaluationHomeSummary {
  housingDiscovered: boolean
  occupationDiscovered: boolean
  moneyDiscovered: boolean
  eligibilityDiscovered: boolean
  completedCount: number
  completionRatio: number
  missingCategories: Array<'housing' | 'occupation' | 'money' | 'eligibility'>
}

export interface EvaluationEventSummary {
  totalEvents: number
  eventCounts: Record<string, number>
  complianceEventTypes: string[]
  buyingSignalCount: number
  objectionRaisedCount: number
  objectionResolvedCount: number
  closingAttemptCount: number
  nextStepAgreementCount: number
}

export interface EvaluationContext {
  scenarioId: string
  personaId?: string
  scenarioName: string
  customerStage: string
  difficulty: string
  targetSkills: string[]
  expectedClosing?: string
  forbiddenClosing?: string
  turns: NormalizedTurn[]
  events: RoleplayEvent[]
  finalState: RoleplayState
  summary: EvaluationContextSummary
  home: EvaluationHomeSummary
  eventSummary: EvaluationEventSummary
  unresolvedObjections: string[]
  buyingSignals: string[]
  complianceFlags: string[]
}

export interface BuildEvaluationContextInput {
  persona: Persona
  scenario: Scenario
  turns: NormalizedTurn[]
  events: RoleplayEvent[]
  finalState: RoleplayState
}

const validEventTypes = new Set<RoleplayEventType>([
  'APPROACHING_STARTED',
  'RAPPORT_ESTABLISHED',
  'PROBING_STARTED',
  'SITUATION_DISCOVERED',
  'PROBLEM_DISCOVERED',
  'IMPLICATION_EXPLORED',
  'NEED_PAYOFF_EXPLORED',
  'SOLUTION_PRESENTED',
  'OBJECTION_RAISED',
  'OBJECTION_CLARIFIED',
  'OBJECTION_RESOLVED',
  'NEGOTIATION_STARTED',
  'CONCESSION_OFFERED',
  'CLOSING_ATTEMPTED',
  'NEXT_STEP_AGREED',
  'FOLLOW_UP_REQUIRED',
  'HOUSING_INFO_DISCOVERED',
  'OCCUPATION_INFO_DISCOVERED',
  'MONEY_INFO_DISCOVERED',
  'ELIGIBILITY_INFO_DISCOVERED',
  'CRITICAL_INFO_MISSED',
  'TRUST_INCREASED',
  'TRUST_DECREASED',
  'PATIENCE_DECREASED',
  'BUYING_SIGNAL_DETECTED',
  'CUSTOMER_CONFUSED',
  'CUSTOMER_WITHDREW',
  'HIDDEN_INFORMATION_REVEALED',
  'GUARANTEE_LANGUAGE',
  'UNVERIFIED_CLAIM',
  'DOCUMENT_MANIPULATION_SUGGESTED',
  'MATERIAL_COST_OMITTED',
  'PRESSURE_TACTIC',
  'PRIVACY_RISK',
  'DISCRIMINATORY_LANGUAGE',
])

const complianceEventTypes = new Set<RoleplayEventType>([
  'GUARANTEE_LANGUAGE',
  'UNVERIFIED_CLAIM',
  'DOCUMENT_MANIPULATION_SUGGESTED',
  'MATERIAL_COST_OMITTED',
  'PRESSURE_TACTIC',
  'PRIVACY_RISK',
  'DISCRIMINATORY_LANGUAGE',
])

const validSeverities = new Set<EventSeverity>(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])
const validExtractors = new Set<RoleplayEvent['extractor']>(['deterministic', 'llm_post_turn', 'evaluator'])
const validTurnSources = new Set<TurnSource>([
  'legacy',
  'gemini_live_input',
  'gemini_live_model',
  'openrouter',
  'ollama',
  'gemini',
  'manual',
  'fallback',
])

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 1
}

function clampPercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    if (typeof value !== 'string') continue
    const normalized = value.trim()
    const comparison = normalized.toLowerCase()
    if (!normalized || seen.has(comparison)) continue
    seen.add(comparison)
    result.push(normalized)
  }
  return result
}

function sanitizeTurns(turns: NormalizedTurn[]): NormalizedTurn[] {
  return turns.flatMap(turn => {
    if (!isPositiveInteger(turn.sequence)) return []
    if (turn.role !== 'sales' && turn.role !== 'customer') return []
    if (typeof turn.text !== 'string' || !turn.text.trim()) return []
    if (turn.finalized !== true) return []

    const sanitized: NormalizedTurn = {
      sequence: turn.sequence,
      role: turn.role,
      text: turn.text.trim(),
      timestamp: typeof turn.timestamp === 'string' ? turn.timestamp : '',
      source: validTurnSources.has(turn.source) ? turn.source : 'legacy',
      finalized: true,
    }
    if (typeof turn.confidence === 'number' && Number.isFinite(turn.confidence)) {
      sanitized.confidence = turn.confidence
    }
    if (typeof turn.dedupeKey === 'string') sanitized.dedupeKey = turn.dedupeKey
    if (Array.isArray(turn.rawRefs)) sanitized.rawRefs = turn.rawRefs.filter(ref => typeof ref === 'string')
    return [sanitized]
  })
}

function sanitizeEvents(events: RoleplayEvent[], acceptedSequences: Set<number>): RoleplayEvent[] {
  const seenIds = new Set<string>()
  const result: RoleplayEvent[] = []

  for (const event of events) {
    const id = typeof event.id === 'string' ? event.id.trim() : ''
    if (!id || seenIds.has(id)) continue
    if (!validEventTypes.has(event.eventType)) continue
    if (!isPositiveInteger(event.sourceTurnSequence) || !acceptedSequences.has(event.sourceTurnSequence)) continue
    if (typeof event.confidence !== 'number' || !Number.isFinite(event.confidence)) continue
    if (!validSeverities.has(event.severity)) continue
    if (!validExtractors.has(event.extractor)) continue

    seenIds.add(id)
    result.push({
      id,
      sessionId: typeof event.sessionId === 'string' ? event.sessionId : '',
      eventType: event.eventType,
      severity: event.severity,
      topic: typeof event.topic === 'string' ? event.topic.trim() : undefined,
      sourceTurnSequence: event.sourceTurnSequence,
      confidence: event.confidence,
      extractor: event.extractor,
      createdAt: typeof event.createdAt === 'string' ? event.createdAt : '',
    })
  }
  return result
}

function buildHomeSummary(state: RoleplayState): EvaluationHomeSummary {
  const housingDiscovered = state.home?.housingDiscovered === true
  const occupationDiscovered = state.home?.occupationDiscovered === true
  const moneyDiscovered = state.home?.moneyDiscovered === true
  const eligibilityDiscovered = state.home?.eligibilityDiscovered === true
  const completedCount = Number(housingDiscovered) +
    Number(occupationDiscovered) +
    Number(moneyDiscovered) +
    Number(eligibilityDiscovered)
  const missingCategories: EvaluationHomeSummary['missingCategories'] = []
  if (!housingDiscovered) missingCategories.push('housing')
  if (!occupationDiscovered) missingCategories.push('occupation')
  if (!moneyDiscovered) missingCategories.push('money')
  if (!eligibilityDiscovered) missingCategories.push('eligibility')

  return {
    housingDiscovered,
    occupationDiscovered,
    moneyDiscovered,
    eligibilityDiscovered,
    completedCount,
    completionRatio: completedCount / 4,
    missingCategories,
  }
}

function cloneState(state: RoleplayState, home: EvaluationHomeSummary): RoleplayState {
  return {
    ...state,
    home: {
      housingDiscovered: home.housingDiscovered,
      occupationDiscovered: home.occupationDiscovered,
      moneyDiscovered: home.moneyDiscovered,
      eligibilityDiscovered: home.eligibilityDiscovered,
      completedCount: home.completedCount,
      completionRatio: home.completionRatio,
    },
    metrics: {
      objectionCount: safeCount(state.metrics?.objectionCount),
      buyingSignalCount: safeCount(state.metrics?.buyingSignalCount),
      closingAttemptCount: safeCount(state.metrics?.closingAttemptCount),
      nextStepAgreementCount: safeCount(state.metrics?.nextStepAgreementCount),
    },
    trust: clampPercent(state.trust),
    patience: clampPercent(state.patience),
    readiness: clampPercent(state.readiness),
    perceivedRelevance: clampPercent(state.perceivedRelevance),
    pressureLevel: clampPercent(state.pressureLevel),
    qualificationCompleteness: clampPercent(state.qualificationCompleteness),
    objectionStatus: { ...(state.objectionStatus ?? {}) },
    revealedInformation: normalizeStringList(state.revealedInformation),
    unresolvedConcerns: normalizeStringList(state.unresolvedConcerns),
    buyingSignals: normalizeStringList(state.buyingSignals),
    complianceFlags: normalizeStringList(state.complianceFlags),
    compliance: {
      guaranteeLanguageCount: safeCount(state.compliance?.guaranteeLanguageCount),
      documentManipulationCount: safeCount(state.compliance?.documentManipulationCount),
      pressureTacticCount: safeCount(state.compliance?.pressureTacticCount),
      highestSeverity: validSeverities.has(state.compliance?.highestSeverity as EventSeverity)
        ? state.compliance.highestSeverity
        : undefined,
      criticalViolationDetected: state.compliance?.criticalViolationDetected === true,
    },
    processedEventIds: normalizeStringList(state.processedEventIds),
  }
}

function buildTranscriptSummary(turns: NormalizedTurn[]): EvaluationContextSummary {
  const salesTurns = turns.filter(turn => turn.role === 'sales').length
  const customerTurns = turns.filter(turn => turn.role === 'customer').length
  const transcriptCharacters = turns.reduce((total, turn) => total + turn.text.length, 0)
  const insufficiencyReasons: string[] = []
  if (turns.length === 0) insufficiencyReasons.push('NO_VALID_TURNS')
  if (customerTurns === 0) insufficiencyReasons.push('NO_CUSTOMER_TURNS')
  if (salesTurns < 2) insufficiencyReasons.push('INSUFFICIENT_SALES_TURNS')
  if (transcriptCharacters < 80) insufficiencyReasons.push('TRANSCRIPT_TOO_SHORT')

  return {
    totalTurns: turns.length,
    salesTurns,
    customerTurns,
    transcriptCharacters,
    isTranscriptSufficient: insufficiencyReasons.length === 0,
    insufficiencyReasons,
  }
}

function buildEventSummary(events: RoleplayEvent[]): EvaluationEventSummary {
  const counts = new Map<string, number>()
  for (const event of events) counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1)
  const eventCounts: Record<string, number> = {}
  for (const eventType of [...counts.keys()].sort()) eventCounts[eventType] = counts.get(eventType)!

  const observedComplianceTypes: string[] = []
  const seenComplianceTypes = new Set<string>()
  for (const event of events) {
    if (!complianceEventTypes.has(event.eventType) || seenComplianceTypes.has(event.eventType)) continue
    seenComplianceTypes.add(event.eventType)
    observedComplianceTypes.push(event.eventType)
  }

  return {
    totalEvents: events.length,
    eventCounts,
    complianceEventTypes: observedComplianceTypes,
    buyingSignalCount: counts.get('BUYING_SIGNAL_DETECTED') ?? 0,
    objectionRaisedCount: counts.get('OBJECTION_RAISED') ?? 0,
    objectionResolvedCount: counts.get('OBJECTION_RESOLVED') ?? 0,
    closingAttemptCount: counts.get('CLOSING_ATTEMPTED') ?? 0,
    nextStepAgreementCount: counts.get('NEXT_STEP_AGREED') ?? 0,
  }
}

export function buildEvaluationContext({
  persona,
  scenario,
  turns,
  events,
  finalState,
}: BuildEvaluationContextInput): EvaluationContext {
  const acceptedTurns = sanitizeTurns(turns)
  const acceptedSequences = new Set(acceptedTurns.map(turn => turn.sequence))
  const acceptedEvents = sanitizeEvents(events, acceptedSequences)
  const home = buildHomeSummary(finalState)
  const clonedState = cloneState(finalState, home)
  const summary = buildTranscriptSummary(acceptedTurns)
  const eventSummary = buildEventSummary(acceptedEvents)
  const unresolvedObjections = normalizeStringList(finalState.unresolvedConcerns)
  const buyingSignals = normalizeStringList(finalState.buyingSignals)
  const complianceFlags = normalizeStringList([
    ...eventSummary.complianceEventTypes,
    ...normalizeStringList(finalState.complianceFlags),
  ])

  return {
    scenarioId: scenario.id,
    personaId: persona.id || scenario.personaId,
    scenarioName: scenario.name,
    customerStage: scenario.stage,
    difficulty: scenario.difficulty,
    targetSkills: normalizeStringList(scenario.targetSkills),
    expectedClosing: scenario.expectedClosing,
    forbiddenClosing: scenario.forbiddenClosing,
    turns: acceptedTurns,
    events: acceptedEvents,
    finalState: clonedState,
    summary,
    home,
    eventSummary,
    unresolvedObjections,
    buyingSignals,
    complianceFlags,
  }
}
