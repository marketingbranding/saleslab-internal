import type { RoleplayEventType } from '../types'
import type { EvaluationContext } from './context'

export type ScoreAdjustmentRuleId =
  | 'DOCUMENT_MANIPULATION'
  | 'DISCRIMINATORY_LANGUAGE'
  | 'GUARANTEE_LANGUAGE'
  | 'PRIVACY_RISK'
  | 'PRESSURE_TACTIC'
  | 'MATERIAL_COST_OMITTED'
  | 'UNVERIFIED_CLAIM'
  | 'CLOSING_BEFORE_DISCOVERY'
  | 'NO_MEANINGFUL_DISCOVERY'

export type ScoreAdjustmentSeverity = 'warning' | 'serious' | 'critical'

export interface AppliedScoreAdjustment {
  ruleId: ScoreAdjustmentRuleId
  maxScore: number
  severity: ScoreAdjustmentSeverity
  reasonCode: string
  relatedEventTypes: string[]
  sourceTurnSequences: number[]
}

export interface ScoreAdjustmentResult {
  originalScore: number
  adjustedScore: number
  effectiveMaxScore: number
  capped: boolean
  appliedAdjustments: AppliedScoreAdjustment[]
  controllingAdjustment?: AppliedScoreAdjustment
}

interface TrialScoreCapRule {
  maxScore: number
  severity: ScoreAdjustmentSeverity
  reasonCode: string
  eventType?: RoleplayEventType
}

export const TRIAL_SCORE_CAP_RULES: Record<ScoreAdjustmentRuleId, TrialScoreCapRule> = {
  DOCUMENT_MANIPULATION: {
    maxScore: 40,
    severity: 'critical',
    reasonCode: 'DOCUMENT_MANIPULATION_EVENT',
    eventType: 'DOCUMENT_MANIPULATION_SUGGESTED',
  },
  DISCRIMINATORY_LANGUAGE: {
    maxScore: 40,
    severity: 'critical',
    reasonCode: 'DISCRIMINATORY_LANGUAGE_EVENT',
    eventType: 'DISCRIMINATORY_LANGUAGE',
  },
  GUARANTEE_LANGUAGE: {
    maxScore: 65,
    severity: 'serious',
    reasonCode: 'GUARANTEE_LANGUAGE_EVENT',
    eventType: 'GUARANTEE_LANGUAGE',
  },
  PRIVACY_RISK: {
    maxScore: 60,
    severity: 'serious',
    reasonCode: 'PRIVACY_RISK_EVENT',
    eventType: 'PRIVACY_RISK',
  },
  PRESSURE_TACTIC: {
    maxScore: 65,
    severity: 'serious',
    reasonCode: 'PRESSURE_TACTIC_EVENT',
    eventType: 'PRESSURE_TACTIC',
  },
  MATERIAL_COST_OMITTED: {
    maxScore: 70,
    severity: 'serious',
    reasonCode: 'MATERIAL_COST_OMITTED_EVENT',
    eventType: 'MATERIAL_COST_OMITTED',
  },
  UNVERIFIED_CLAIM: {
    maxScore: 75,
    severity: 'warning',
    reasonCode: 'UNVERIFIED_CLAIM_EVENT',
    eventType: 'UNVERIFIED_CLAIM',
  },
  CLOSING_BEFORE_DISCOVERY: {
    maxScore: 70,
    severity: 'warning',
    reasonCode: 'CLOSING_BEFORE_MINIMUM_DISCOVERY',
  },
  NO_MEANINGFUL_DISCOVERY: {
    maxScore: 65,
    severity: 'warning',
    reasonCode: 'NO_HOME_DISCOVERY',
  },
}

const ruleOrder = Object.keys(TRIAL_SCORE_CAP_RULES) as ScoreAdjustmentRuleId[]
const severityOrder: Record<ScoreAdjustmentSeverity, number> = {
  critical: 0,
  serious: 1,
  warning: 2,
}
const homeEventCategories: Partial<Record<RoleplayEventType, string>> = {
  HOUSING_INFO_DISCOVERED: 'housing',
  OCCUPATION_INFO_DISCOVERED: 'occupation',
  MONEY_INFO_DISCOVERED: 'money',
  ELIGIBILITY_INFO_DISCOVERED: 'eligibility',
}

function normalizeScore(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
}

export function gradeFromScore(score: number): string {
  const normalized = normalizeScore(score)
  if (normalized >= 90) return 'A'
  if (normalized >= 80) return 'B'
  if (normalized >= 70) return 'C'
  if (normalized >= 60) return 'D'
  return 'E'
}

function sourceTurnsForEvent(context: EvaluationContext, eventType: RoleplayEventType): number[] {
  return [...new Set(
    context.events
      .filter(event => event.eventType === eventType)
      .map(event => event.sourceTurnSequence)
      .filter(sequence => Number.isInteger(sequence) && sequence >= 1)
  )].sort((a, b) => a - b).slice(0, 5)
}

function contextContainsEvent(context: EvaluationContext, eventType: RoleplayEventType): boolean {
  const normalizedFlags = new Set(context.complianceFlags.map(flag => flag.trim().toUpperCase()))
  return context.eventSummary.complianceEventTypes.includes(eventType) ||
    normalizedFlags.has(eventType) ||
    context.events.some(event => event.eventType === eventType)
}

function eventAdjustment(
  ruleId: ScoreAdjustmentRuleId,
  context: EvaluationContext
): AppliedScoreAdjustment | undefined {
  const rule = TRIAL_SCORE_CAP_RULES[ruleId]
  if (!rule.eventType || !contextContainsEvent(context, rule.eventType)) return undefined
  return {
    ruleId,
    maxScore: rule.maxScore,
    severity: rule.severity,
    reasonCode: rule.reasonCode,
    relatedEventTypes: [rule.eventType],
    sourceTurnSequences: sourceTurnsForEvent(context, rule.eventType),
  }
}

function closingBeforeDiscoveryAdjustment(context: EvaluationContext): AppliedScoreAdjustment | undefined {
  const closingTurns = context.events
    .filter(event => event.eventType === 'CLOSING_ATTEMPTED')
    .map(event => event.sourceTurnSequence)
    .filter(sequence => Number.isInteger(sequence) && sequence >= 1)
    .sort((a, b) => a - b)
  const firstClosingTurn = closingTurns[0]
  if (!firstClosingTurn) return undefined

  const categoriesBeforeClosing = new Set(
    context.events
      .filter(event => event.sourceTurnSequence < firstClosingTurn)
      .map(event => homeEventCategories[event.eventType])
      .filter((category): category is string => Boolean(category))
  )
  if (categoriesBeforeClosing.size >= 2) return undefined

  const rule = TRIAL_SCORE_CAP_RULES.CLOSING_BEFORE_DISCOVERY
  return {
    ruleId: 'CLOSING_BEFORE_DISCOVERY',
    maxScore: rule.maxScore,
    severity: rule.severity,
    reasonCode: rule.reasonCode,
    relatedEventTypes: ['CLOSING_ATTEMPTED'],
    sourceTurnSequences: [firstClosingTurn],
  }
}

function noMeaningfulDiscoveryAdjustment(context: EvaluationContext): AppliedScoreAdjustment | undefined {
  if (context.home.completedCount !== 0 || context.summary.salesTurns < 2) return undefined
  const rule = TRIAL_SCORE_CAP_RULES.NO_MEANINGFUL_DISCOVERY
  return {
    ruleId: 'NO_MEANINGFUL_DISCOVERY',
    maxScore: rule.maxScore,
    severity: rule.severity,
    reasonCode: rule.reasonCode,
    relatedEventTypes: [],
    sourceTurnSequences: [],
  }
}

export function applyTrialScoreAdjustments(
  originalScore: number,
  context: EvaluationContext
): ScoreAdjustmentResult {
  const normalizedOriginalScore = normalizeScore(originalScore)
  const adjustments: AppliedScoreAdjustment[] = []

  for (const ruleId of ruleOrder) {
    const adjustment = eventAdjustment(ruleId, context)
    if (adjustment) adjustments.push(adjustment)
  }
  const closingAdjustment = closingBeforeDiscoveryAdjustment(context)
  if (closingAdjustment) adjustments.push(closingAdjustment)
  const discoveryAdjustment = noMeaningfulDiscoveryAdjustment(context)
  if (discoveryAdjustment) adjustments.push(discoveryAdjustment)

  adjustments.sort((a, b) =>
    a.maxScore - b.maxScore ||
    severityOrder[a.severity] - severityOrder[b.severity] ||
    ruleOrder.indexOf(a.ruleId) - ruleOrder.indexOf(b.ruleId) ||
    a.ruleId.localeCompare(b.ruleId)
  )

  const controllingAdjustment = adjustments[0]
  const effectiveMaxScore = controllingAdjustment?.maxScore ?? 100
  const adjustedScore = Math.min(normalizedOriginalScore, effectiveMaxScore)

  return {
    originalScore: normalizedOriginalScore,
    adjustedScore,
    effectiveMaxScore,
    capped: adjustedScore < normalizedOriginalScore,
    appliedAdjustments: adjustments,
    controllingAdjustment,
  }
}
