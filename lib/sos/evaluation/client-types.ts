export interface TrialScoreAdjustmentRuleView {
  ruleId: string
  maxScore: number
  severity: 'warning' | 'serious' | 'critical' | string
  reasonCode: string
  sourceTurnSequences: number[]
}

export interface TrialEvaluationV2View {
  version?: string
  provider?: 'groq' | 'nvidia_nim' | 'gemini' | 'unspecified' | string
  transcriptSufficient?: boolean
  insufficiencyReasons?: string[]
  dimensions?: Array<{
    key: string
    label: string
    score: number
  }>
  evidence?: Array<{
    id: string
    dimensionKey: string
    turnSequence: number
    behaviorObserved: string
    reason: string
    impact: string
    recommendedImprovement: string
  }>
  evidenceDiagnostics?: {
    accepted?: number
    rejected?: number
    issueCodes?: string[]
  }
  home?: {
    completedCount?: number
    completionRatio?: number
    missingCategories?: string[]
  }
  complianceFlags?: string[]
  scoring?: {
    profileId?: string
    modelOverallScore?: number
    weightedScore?: number
    weights?: Array<{
      key: string
      weight: number
      score: number
      contribution: number
    }>
  }
  scoreAdjustment?: {
    originalScore?: number
    adjustedScore?: number
    effectiveMaxScore?: number
    capped?: boolean
    controllingRuleId?: string | null
    appliedRules?: TrialScoreAdjustmentRuleView[]
  }
}

export interface TrialFeedbackData {
  overallScore: number
  grade?: string
  summary?: string
  strengths: string[]
  weaknesses: string[]
  keyObjectionsHandled: string[]
  missedOpportunities: string[]
  verdict: string
  actionableTips: string[]
  skillScores?: Array<{
    skill: string
    score: number
    evidence?: string[]
  }>
  suggestedResponses?: string[]
  recommendedNextScenario?: string | null
  actionPlan?: string[]
  evaluationV2?: TrialEvaluationV2View
}
