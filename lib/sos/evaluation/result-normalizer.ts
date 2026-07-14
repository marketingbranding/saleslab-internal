import type { EvaluationEvidence } from '../types'
import type { EvaluationContext } from './context'
import { EVALUATION_DIMENSION_KEYS, validateEvaluationEvidenceBatch } from './evidence'
import { applyTrialScoreAdjustments, gradeFromScore } from './score-adjustments'

export const TRIAL_DIMENSIONS = [
  { key: 'approaching', label: 'Approaching' },
  { key: 'probing', label: 'Probing' },
  { key: 'home_qualification', label: 'Kualifikasi HOME' },
  { key: 'solution_presentation', label: 'Presentasi Solusi' },
  { key: 'objection_handling', label: 'Penanganan Keberatan' },
  { key: 'closing', label: 'Closing' },
  { key: 'communication', label: 'Komunikasi' },
  { key: 'compliance', label: 'Kepatuhan' },
] as const

export interface TrialSkillScore {
  skill: string
  score: number
  evidence: string[]
}

export interface TrialEvaluationResponse {
  overallScore: number
  grade: string
  summary: string
  strengths: string[]
  weaknesses: string[]
  keyObjectionsHandled: string[]
  missedOpportunities: string[]
  verdict: string
  actionableTips: string[]
  skillScores: TrialSkillScore[]
  suggestedResponses: string[]
  recommendedNextScenario: string | null
  actionPlan: string[]
  evaluationV2: {
    version: 'trial-v1.1'
    transcriptSufficient: boolean
    insufficiencyReasons: string[]
    dimensions: Array<{ key: string; label: string; score: number }>
    evidence: EvaluationEvidence[]
    evidenceDiagnostics: {
      accepted: number
      rejected: number
      issueCodes: string[]
    }
    home: {
      completedCount: number
      completionRatio: number
      missingCategories: string[]
    }
    complianceFlags: string[]
    scoreAdjustment: {
      originalScore: number
      adjustedScore: number
      effectiveMaxScore: number
      capped: boolean
      controllingRuleId: string | null
      appliedRules: Array<{
        ruleId: string
        maxScore: number
        severity: string
        reasonCode: string
        sourceTurnSequences: number[]
      }>
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
}

function scoreValue(value: unknown): number {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
}

function dimensionKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/_+/g, '_')
  const aliases: Record<string, string> = {
    home: 'home_qualification',
    qualification: 'home_qualification',
    solution: 'solution_presentation',
    presentation: 'solution_presentation',
    objection: 'objection_handling',
  }
  return aliases[normalized] ?? normalized
}

function modelDimensionScores(raw: Record<string, unknown>): Map<string, number> {
  const scores = new Map<string, number>()
  if (!Array.isArray(raw.skillScores)) return scores
  for (const item of raw.skillScores) {
    if (!isRecord(item)) continue
    const key = dimensionKey(item.dimensionKey ?? item.dimension_key)
    if (!EVALUATION_DIMENSION_KEYS.includes(key as typeof EVALUATION_DIMENSION_KEYS[number])) continue
    if (!scores.has(key)) scores.set(key, scoreValue(item.score))
  }
  return scores
}

export function normalizeTrialEvaluationResult(
  rawInput: unknown,
  context: EvaluationContext
): TrialEvaluationResponse {
  const raw = isRecord(rawInput) ? rawInput : {}
  const modelOverallScore = scoreValue(raw.overallScore ?? raw.overall_score)
  const scoreAdjustment = applyTrialScoreAdjustments(modelOverallScore, context)
  const overallScore = scoreAdjustment.adjustedScore
  const candidates = Array.isArray(raw.evidence) ? raw.evidence : []
  const evidenceResult = validateEvaluationEvidenceBatch(candidates, {
    turns: context.turns,
    requireSalesTurn: true,
  })
  const scores = modelDimensionScores(raw)

  const dimensions = TRIAL_DIMENSIONS.map(dimension => ({
    key: dimension.key,
    label: dimension.label,
    score: scores.get(dimension.key) ?? 0,
  }))
  const skillScores = dimensions.map(dimension => ({
    skill: dimension.label,
    score: dimension.score,
    evidence: evidenceResult.validEvidence
      .filter(evidence => evidence.dimensionKey === dimension.key)
      .slice(0, 3)
      .map(evidence => `Turn ${evidence.turnSequence}: ${evidence.behaviorObserved}`),
  }))
  const issueCodes = [...new Set(evidenceResult.issues.map(issue => issue.code))]
  const summaryFallback = context.summary.isTranscriptSufficient
    ? 'Analisis roleplay selesai.'
    : 'Analisis terbatas karena bukti percakapan belum memadai.'

  return {
    overallScore,
    grade: gradeFromScore(overallScore),
    summary: stringValue(raw.summary ?? raw.verdict, summaryFallback),
    strengths: stringArray(raw.strengths),
    weaknesses: stringArray(raw.weaknesses),
    keyObjectionsHandled: stringArray(raw.keyObjectionsHandled ?? raw.key_objections_handled),
    missedOpportunities: stringArray(raw.missedOpportunities ?? raw.missed_opportunities),
    verdict: stringValue(raw.verdict ?? raw.summary, 'Laporan evaluasi tersedia.'),
    actionableTips: stringArray(raw.actionableTips ?? raw.actionable_tips ?? raw.action_plan),
    skillScores,
    suggestedResponses: stringArray(raw.suggestedResponses ?? raw.suggested_responses),
    recommendedNextScenario: stringValue(
      raw.recommendedNextScenario ?? raw.recommended_next_scenario,
      ''
    ) || null,
    actionPlan: stringArray(raw.actionPlan ?? raw.action_plan),
    evaluationV2: {
      version: 'trial-v1.1',
      transcriptSufficient: context.summary.isTranscriptSufficient,
      insufficiencyReasons: [...context.summary.insufficiencyReasons],
      dimensions,
      evidence: evidenceResult.validEvidence,
      evidenceDiagnostics: {
        accepted: evidenceResult.validEvidence.length,
        rejected: evidenceResult.rejectedEvidence.length,
        issueCodes,
      },
      home: {
        completedCount: context.home.completedCount,
        completionRatio: context.home.completionRatio,
        missingCategories: [...context.home.missingCategories],
      },
      complianceFlags: [...context.complianceFlags],
      scoreAdjustment: {
        originalScore: scoreAdjustment.originalScore,
        adjustedScore: scoreAdjustment.adjustedScore,
        effectiveMaxScore: scoreAdjustment.effectiveMaxScore,
        capped: scoreAdjustment.capped,
        controllingRuleId: scoreAdjustment.controllingAdjustment?.ruleId ?? null,
        appliedRules: scoreAdjustment.appliedAdjustments.map(adjustment => ({
          ruleId: adjustment.ruleId,
          maxScore: adjustment.maxScore,
          severity: adjustment.severity,
          reasonCode: adjustment.reasonCode,
          sourceTurnSequences: [...adjustment.sourceTurnSequences],
        })),
      },
    },
  }
}
