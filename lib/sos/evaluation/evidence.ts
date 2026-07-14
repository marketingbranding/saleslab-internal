import type { EvaluationEvidence, NormalizedTurn } from '../types'

export const EVALUATION_DIMENSION_KEYS = [
  'approaching',
  'probing',
  'home_qualification',
  'solution_presentation',
  'objection_handling',
  'closing',
  'communication',
  'compliance',
] as const

export type EvaluationDimensionKey = typeof EVALUATION_DIMENSION_KEYS[number]

export type EvidenceIssueCode =
  | 'INVALID_INPUT'
  | 'MISSING_DIMENSION_KEY'
  | 'UNSUPPORTED_DIMENSION_KEY'
  | 'INVALID_TURN_SEQUENCE'
  | 'TURN_NOT_FOUND'
  | 'EMPTY_BEHAVIOR'
  | 'EMPTY_REASON'
  | 'EMPTY_IMPACT'
  | 'EMPTY_RECOMMENDATION'
  | 'DUPLICATE_EVIDENCE'
  | 'SALES_TURN_REQUIRED'

export interface EvidenceValidationIssue {
  code: EvidenceIssueCode
  evidenceId?: string
  inputIndex?: number
  field?: keyof EvaluationEvidence
  message: string
}

export interface EvidenceValidationContext {
  turns: NormalizedTurn[]
  allowedDimensionKeys?: string[]
  requireSalesTurn?: boolean
}

export interface EvidenceValidationResult {
  valid: boolean
  evidence?: EvaluationEvidence
  issues: EvidenceValidationIssue[]
}

export interface EvidenceBatchValidationResult {
  validEvidence: EvaluationEvidence[]
  rejectedEvidence: Array<{
    inputIndex: number
    issues: EvidenceValidationIssue[]
  }>
  issues: EvidenceValidationIssue[]
}

const MAX_ID_CHARACTERS = 128
const MAX_BEHAVIOR_CHARACTERS = 500
const MAX_REASON_CHARACTERS = 500
const MAX_IMPACT_CHARACTERS = 500
const MAX_RECOMMENDATION_CHARACTERS = 700

const dimensionAliases: Record<string, EvaluationDimensionKey> = {
  home: 'home_qualification',
  qualification: 'home_qualification',
  solution: 'solution_presentation',
  presentation: 'solution_presentation',
  objection: 'objection_handling',
}

const issueMessages: Record<EvidenceIssueCode, string> = {
  INVALID_INPUT: 'Evidence input must be an object.',
  MISSING_DIMENSION_KEY: 'Evidence dimension key is required.',
  UNSUPPORTED_DIMENSION_KEY: 'Evidence dimension key is not supported.',
  INVALID_TURN_SEQUENCE: 'Evidence turn sequence must be a positive integer.',
  TURN_NOT_FOUND: 'Referenced transcript turn was not found.',
  EMPTY_BEHAVIOR: 'Observed behavior is required.',
  EMPTY_REASON: 'Evidence reason is required.',
  EMPTY_IMPACT: 'Evidence impact is required.',
  EMPTY_RECOMMENDATION: 'Recommended improvement is required.',
  DUPLICATE_EVIDENCE: 'Duplicate evidence was rejected.',
  SALES_TURN_REQUIRED: 'Evidence must reference a sales turn.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: unknown, maxCharacters: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxCharacters)
}

function normalizeDimensionKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return dimensionAliases[normalized] ?? normalized
}

function normalizeTurnSequence(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return Number.NaN
  if (typeof value === 'string' && value.trim() === '') return Number.NaN
  const sequence = Number(value)
  return Number.isFinite(sequence) && Number.isInteger(sequence) && sequence >= 1
    ? sequence
    : Number.NaN
}

function structuralEvidenceId(dimensionKey: string, turnSequence: number, ordinal: number): string {
  const safeDimension = dimensionKey || 'unknown'
  const safeTurn = Number.isInteger(turnSequence) && turnSequence >= 1 ? String(turnSequence) : 'invalid'
  return `evidence:${safeDimension}:turn-${safeTurn}:${ordinal + 1}`
}

function normalizeProvidedId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_ID_CHARACTERS) : ''
}

function allowedDimensions(context: EvidenceValidationContext): Set<string> {
  if (context.allowedDimensionKeys) {
    return new Set(
      context.allowedDimensionKeys
        .map(normalizeDimensionKey)
        .filter(Boolean)
    )
  }
  return new Set(EVALUATION_DIMENSION_KEYS)
}

function issue(
  code: EvidenceIssueCode,
  evidenceId?: string,
  field?: keyof EvaluationEvidence
): EvidenceValidationIssue {
  return { code, evidenceId, field, message: issueMessages[code] }
}

export function normalizeEvaluationEvidence(
  input: unknown,
  fallbackIndex = 0
): EvaluationEvidence | undefined {
  if (!isRecord(input)) return undefined

  const dimensionKey = normalizeDimensionKey(input.dimensionKey ?? input.dimension_key)
  const turnSequence = normalizeTurnSequence(input.turnSequence ?? input.turn_sequence)
  const providedId = normalizeProvidedId(input.id)

  return {
    id: providedId || structuralEvidenceId(dimensionKey, turnSequence, fallbackIndex),
    dimensionKey,
    turnSequence,
    behaviorObserved: normalizeText(
      input.behaviorObserved ?? input.behavior_observed,
      MAX_BEHAVIOR_CHARACTERS
    ),
    reason: normalizeText(input.reason, MAX_REASON_CHARACTERS),
    impact: normalizeText(input.impact, MAX_IMPACT_CHARACTERS),
    recommendedImprovement: normalizeText(
      input.recommendedImprovement ?? input.recommended_improvement,
      MAX_RECOMMENDATION_CHARACTERS
    ),
  }
}

function validateInternal(
  input: unknown,
  context: EvidenceValidationContext,
  fallbackIndex: number
): EvidenceValidationResult {
  const evidence = normalizeEvaluationEvidence(input, fallbackIndex)
  if (!evidence) return { valid: false, issues: [issue('INVALID_INPUT')] }

  const issues: EvidenceValidationIssue[] = []

  if (!evidence.dimensionKey) {
    issues.push(issue('MISSING_DIMENSION_KEY', evidence.id, 'dimensionKey'))
  } else if (!allowedDimensions(context).has(evidence.dimensionKey)) {
    issues.push(issue('UNSUPPORTED_DIMENSION_KEY', evidence.id, 'dimensionKey'))
  }

  const validTurnSequence = Number.isFinite(evidence.turnSequence) &&
    Number.isInteger(evidence.turnSequence) &&
    evidence.turnSequence >= 1
  if (!validTurnSequence) {
    issues.push(issue('INVALID_TURN_SEQUENCE', evidence.id, 'turnSequence'))
  }

  if (!evidence.behaviorObserved) issues.push(issue('EMPTY_BEHAVIOR', evidence.id, 'behaviorObserved'))
  if (!evidence.reason) issues.push(issue('EMPTY_REASON', evidence.id, 'reason'))
  if (!evidence.impact) issues.push(issue('EMPTY_IMPACT', evidence.id, 'impact'))
  if (!evidence.recommendedImprovement) {
    issues.push(issue('EMPTY_RECOMMENDATION', evidence.id, 'recommendedImprovement'))
  }

  if (validTurnSequence) {
    const referencedTurn = context.turns.find(turn => turn.sequence === evidence.turnSequence)
    if (!referencedTurn) {
      issues.push(issue('TURN_NOT_FOUND', evidence.id, 'turnSequence'))
    } else if ((context.requireSalesTurn ?? true) && referencedTurn.role !== 'sales') {
      issues.push(issue('SALES_TURN_REQUIRED', evidence.id, 'turnSequence'))
    }
  }

  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, evidence, issues: [] }
}

export function validateEvaluationEvidence(
  input: unknown,
  context: EvidenceValidationContext
): EvidenceValidationResult {
  return validateInternal(input, context, 0)
}

function duplicateKey(evidence: EvaluationEvidence): string {
  return [
    evidence.dimensionKey,
    evidence.turnSequence,
    evidence.behaviorObserved.toLowerCase(),
  ].join(':')
}

function uniqueStructuralId(
  evidence: EvaluationEvidence,
  inputIndex: number,
  usedIds: Set<string>
): string {
  let ordinal = inputIndex
  let candidate = structuralEvidenceId(evidence.dimensionKey, evidence.turnSequence, ordinal)
  while (usedIds.has(candidate)) {
    ordinal += 1
    candidate = structuralEvidenceId(evidence.dimensionKey, evidence.turnSequence, ordinal)
  }
  return candidate
}

export function validateEvaluationEvidenceBatch(
  inputs: unknown[],
  context: EvidenceValidationContext
): EvidenceBatchValidationResult {
  const validEvidence: EvaluationEvidence[] = []
  const rejectedEvidence: EvidenceBatchValidationResult['rejectedEvidence'] = []
  const issues: EvidenceValidationIssue[] = []
  const seenEvidence = new Set<string>()
  const usedIds = new Set<string>()

  inputs.forEach((input, inputIndex) => {
    const result = validateInternal(input, context, inputIndex)
    if (!result.valid || !result.evidence) {
      const indexedIssues = result.issues.map(validationIssue => ({ ...validationIssue, inputIndex }))
      rejectedEvidence.push({ inputIndex, issues: indexedIssues })
      issues.push(...indexedIssues)
      return
    }

    const evidenceKey = duplicateKey(result.evidence)
    if (seenEvidence.has(evidenceKey)) {
      const duplicateIssue = {
        ...issue('DUPLICATE_EVIDENCE', result.evidence.id),
        inputIndex,
      }
      rejectedEvidence.push({ inputIndex, issues: [duplicateIssue] })
      issues.push(duplicateIssue)
      return
    }

    seenEvidence.add(evidenceKey)
    const finalEvidence = usedIds.has(result.evidence.id)
      ? { ...result.evidence, id: uniqueStructuralId(result.evidence, inputIndex, usedIds) }
      : result.evidence
    usedIds.add(finalEvidence.id)
    validEvidence.push(finalEvidence)
  })

  return { validEvidence, rejectedEvidence, issues }
}
