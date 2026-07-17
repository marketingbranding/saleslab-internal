import {
  EVALUATION_DIMENSION_KEYS,
  type EvaluationDimensionKey,
} from './evidence'

export const TRIAL_WEIGHTED_SCORING_PROFILE = {
  id: 'trial-weighted-v1',
  weights: {
    approaching: 10,
    probing: 15,
    home_qualification: 20,
    solution_presentation: 15,
    objection_handling: 15,
    closing: 10,
    communication: 10,
    compliance: 5,
  } satisfies Record<EvaluationDimensionKey, number>,
} as const

export interface WeightedDimensionScore {
  key: EvaluationDimensionKey
  score: number
  weight: number
  contribution: number
}

export interface WeightedScoreResult {
  profileId: string
  weightedScore: number
  dimensions: WeightedDimensionScore[]
}

function normalizeScore(value: unknown): number {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
}

export function calculateTrialWeightedScore(
  scores: ReadonlyMap<string, number> | Partial<Record<EvaluationDimensionKey, unknown>>
): WeightedScoreResult {
  const dimensions = EVALUATION_DIMENSION_KEYS.map(key => {
    const rawScore = typeof (scores as ReadonlyMap<string, number>).get === 'function'
      ? (scores as ReadonlyMap<string, number>).get(key)
      : (scores as Partial<Record<EvaluationDimensionKey, unknown>>)[key]
    const score = normalizeScore(rawScore)
    const weight = TRIAL_WEIGHTED_SCORING_PROFILE.weights[key]
    return {
      key,
      score,
      weight,
      contribution: score * weight / 100,
    }
  })

  return {
    profileId: TRIAL_WEIGHTED_SCORING_PROFILE.id,
    weightedScore: Math.max(0, Math.min(100, Math.round(
      dimensions.reduce((total, dimension) => total + dimension.contribution, 0)
    ))),
    dimensions,
  }
}

export function trialWeightTotal(): number {
  return Object.values(TRIAL_WEIGHTED_SCORING_PROFILE.weights)
    .reduce((total, weight) => total + weight, 0)
}
