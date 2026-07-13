export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type Gender = 'male' | 'female' | 'unspecified'

export type CustomerStage =
  | 'awareness'
  | 'lead'
  | 'inquiry'
  | 'qualified'
  | 'survey_scheduled'
  | 'surveyed'
  | 'booking_intent'
  | 'booked'
  | 'document_collection'
  | 'bank_submission'
  | 'sp3k'
  | 'akad_scheduled'
  | 'akad_completed'
  | 'handover'
  | 'referral'
  | 'customer_withdrawn'

export type ProspectQualification = 'hot' | 'warm' | 'cold' | 'unknown'

export type RoleplayChannel = 'voice' | 'text'

export type TurnRole = 'sales' | 'customer'

export type TurnSource =
  | 'legacy'
  | 'gemini_live_input'
  | 'gemini_live_model'
  | 'openrouter'
  | 'ollama'
  | 'gemini'
  | 'manual'
  | 'fallback'

export type RoleplayEventType =
  | 'APPROACHING_STARTED'
  | 'RAPPORT_ESTABLISHED'
  | 'PROBING_STARTED'
  | 'SITUATION_DISCOVERED'
  | 'PROBLEM_DISCOVERED'
  | 'IMPLICATION_EXPLORED'
  | 'NEED_PAYOFF_EXPLORED'
  | 'SOLUTION_PRESENTED'
  | 'OBJECTION_RAISED'
  | 'OBJECTION_CLARIFIED'
  | 'OBJECTION_RESOLVED'
  | 'NEGOTIATION_STARTED'
  | 'CONCESSION_OFFERED'
  | 'CLOSING_ATTEMPTED'
  | 'NEXT_STEP_AGREED'
  | 'FOLLOW_UP_REQUIRED'
  | 'HOUSING_INFO_DISCOVERED'
  | 'OCCUPATION_INFO_DISCOVERED'
  | 'MONEY_INFO_DISCOVERED'
  | 'ELIGIBILITY_INFO_DISCOVERED'
  | 'CRITICAL_INFO_MISSED'
  | 'TRUST_INCREASED'
  | 'TRUST_DECREASED'
  | 'PATIENCE_DECREASED'
  | 'BUYING_SIGNAL_DETECTED'
  | 'CUSTOMER_CONFUSED'
  | 'CUSTOMER_WITHDREW'
  | 'HIDDEN_INFORMATION_REVEALED'
  | 'GUARANTEE_LANGUAGE'
  | 'UNVERIFIED_CLAIM'
  | 'DOCUMENT_MANIPULATION_SUGGESTED'
  | 'MATERIAL_COST_OMITTED'
  | 'PRESSURE_TACTIC'
  | 'PRIVACY_RISK'
  | 'DISCRIMINATORY_LANGUAGE'

export type EventSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export type EvaluationRating = 'Excellent' | 'Strong' | 'Competent' | 'Needs Improvement' | 'Not Ready'

export interface HiddenInformation {
  key: string
  value: string
  revealWhen: string[]
  neverRevealWhen?: string[]
  importance: 'low' | 'moderate' | 'critical'
}

export interface PersonaObjection {
  key: string
  category: string
  statement?: string
  rootCauses?: string[]
}

export interface Persona {
  id: string
  name: string
  ageRange?: string
  gender: Gender
  occupation?: string
  employmentType?: string
  maritalStatus?: string
  incomeRange?: string
  housingStatus?: string
  familyContext?: string
  primaryGoal?: string
  primaryFear?: string
  communicationStyle?: string
  patience: number
  aggressiveness: number
  skepticism: number
  financialLiteracy?: number
  subsidyKnowledge?: number
  urgency?: number
  trustStart: number
  decisionAuthority?: string
  hiddenInformation: HiddenInformation[]
  objections: PersonaObjection[]
  buyingSignals: string[]
  walkAwayConditions: string[]
  difficulty: Difficulty
  legacy?: Record<string, unknown>
}

export interface Scenario {
  id: string
  name: string
  stage: CustomerStage
  channel: RoleplayChannel
  personaId?: string
  salesGoals: string[]
  expectedClosing?: string
  forbiddenClosing?: string
  targetSkills: string[]
  initialCustomerMessage?: string
  customerStartsFirst: boolean
  difficulty: Difficulty
  maxDurationMinutes?: number
  successConditions: string[]
  failureConditions: string[]
  evaluationProfile: string
  description?: string
  legacy?: Record<string, unknown>
}

export interface RoleplayState {
  trust: number
  patience: number
  readiness: number
  perceivedRelevance: number
  pressureLevel: number
  qualificationCompleteness: number
  customerStage: CustomerStage
  objectionStatus: Record<string, 'raised' | 'clarified' | 'responded' | 'resolved'>
  revealedInformation: string[]
  unresolvedConcerns: string[]
  buyingSignals: string[]
  complianceFlags: string[]
}

export interface NormalizedTurn {
  sequence: number
  role: TurnRole
  text: string
  timestamp: string
  source: TurnSource
  finalized: boolean
  confidence?: number
  dedupeKey?: string
  rawRefs?: string[]
}

export interface RoleplayEvent {
  id: string
  sessionId: string
  eventType: RoleplayEventType
  severity: EventSeverity
  topic?: string
  sourceTurnSequence: number
  confidence: number
  extractor: 'deterministic' | 'llm_post_turn' | 'evaluator'
  payload?: Record<string, unknown>
  createdAt: string
}

export interface RoleplaySession {
  id: string
  userId: string
  scenarioId: string
  personaId?: string
  channel: RoleplayChannel
  promptVersion?: string
  startedAt: string
  endedAt?: string
  status: 'draft' | 'active' | 'completed' | 'failed' | 'incomplete'
  rawTranscript?: unknown[]
  normalizedTranscript: NormalizedTurn[]
  events: RoleplayEvent[]
  stateSnapshots: RoleplayState[]
  evaluationResult?: EvaluationResult
}

export interface EvaluationDimension {
  key: string
  label: string
  weight: number
}

export interface EvaluationProfile {
  id: string
  name: string
  dimensions: EvaluationDimension[]
  hardCaps: Array<{
    id: string
    maxScore: number
    reason: string
    eventTypes: RoleplayEventType[]
  }>
}

export interface EvaluationEvidence {
  id: string
  dimensionKey: string
  turnSequence: number
  behaviorObserved: string
  reason: string
  impact: string
  recommendedImprovement: string
}

export interface EvaluationResult {
  overallScore: number
  rating: EvaluationRating
  customerStage: CustomerStage
  qualification: ProspectQualification
  buyingProbability: number
  dimensionScores: Record<string, number>
  strengths: string[]
  priorityImprovements: string[]
  missedQuestions: string[]
  unresolvedObjections: string[]
  complianceFlags: string[]
  bestMoment?: EvaluationEvidence
  criticalMoment?: EvaluationEvidence
  recommendedNextStep: string
  practiceAssignment: string
  evidence: EvaluationEvidence[]
}

export interface KnowledgeEntry {
  id: string
  title: string
  category: 'sos' | 'spin' | 'home' | 'fab' | 'objection' | 'closing' | 'evaluation'
  summary: string
  tags: string[]
}
