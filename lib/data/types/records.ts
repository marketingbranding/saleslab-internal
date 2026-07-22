import type { SalesScenario } from '@/lib/gemini'
import type { PersonaData, PersonaPublicData, PersonaStatus, PersonaSubmissionStatus } from '@/lib/personas'
import type { TrialFeedbackData } from '@/lib/sos/evaluation/client-types'

export interface ScenarioRecord extends Omit<SalesScenario, 'hiddenRules'> {
  userId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ScenarioSecretRecord {
  scenarioId: string
  hiddenRules: string
  updatedAt?: Date
  updatedBy?: string
}

export interface ScenarioEditorRecord extends ScenarioRecord {
  hiddenRules?: string
}

export interface BranchRecord {
  id: string
  name: string
  type?: 'KC' | 'KCP'
  normalizedName: string
  status: 'active' | 'archived'
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface MembershipRecord {
  userId: string
  email: string
  displayName: string
  branchId: string
  branchName: string
  selectedAt?: Date
  updatedAt?: Date
  updatedBy?: string
}

export type PersonaRecord = Omit<PersonaData,
  | 'hiddenInstructions'
  | 'personaKnowledge'
  | 'personaUnknowns'
  | 'createdAt'
  | 'updatedAt'
  | 'approvedAt'
> & {
  status?: PersonaStatus
  createdAt?: Date
  updatedAt?: Date
  approvedAt?: Date
}

export interface PersonaSecretRecord {
  personaId: string
  hiddenInstructions: string
  personaKnowledge: string
  personaUnknowns: string
  updatedAt?: Date
  updatedBy?: string
}

export interface PersonaSubmissionRecord {
  id: string
  persona: PersonaPublicData
  status: PersonaSubmissionStatus
  creatorUid: string
  creatorName: string
  creatorEmail: string
  creatorBranchId: string
  creatorBranchName: string
  targetPersonaId?: string
  previousSubmissionId?: string
  submittedAt?: Date
  updatedAt?: Date
  reviewedAt?: Date
  reviewedByUid?: string
  reviewedByName?: string
  rejectionReason?: string
}

export interface TranscriptTurn {
  role: 'user' | 'model'
  text: string
}

export type SalesPathRating = 'Good' | 'Fair' | 'Poor' | 'Not Done'

export interface SessionFeedback extends TrialFeedbackData {
  salesPathEvaluation?: Record<string, SalesPathRating>
}

export interface RoleplaySessionRecord {
  id: string
  scenarioId: string
  salespersonName: string
  userId: string
  score: number
  transcript?: TranscriptTurn[]
  feedback?: SessionFeedback
  personaId?: string
  personaVersion?: number
  analysisStatus?: 'processing' | 'completed' | 'failed'
  analysisAttempt?: number
  analysisError?: string
  analysisProvider?: string
  transcriptQuality?: 'partial' | 'complete'
  inputDigest?: string
  createdAt?: Date
  updatedAt?: Date
  completedAt?: Date
}

export type ModelProvider = 'gemini' | 'ollama' | 'openrouter'

export interface GlobalSettingsRecord {
  modelProvider: ModelProvider
  geminiModel?: string
  ollamaModel?: string
  openRouterModel?: string
  thinkingDelay: number
  frustrationSensitivity: number
  ollamaUrl?: string
  updatedBy?: string
  updatedAt?: Date
}

export interface AdminGrantRecord {
  userId: string
  uid?: string
  label?: string
  email?: string | null
  bootstrappedAt?: Date
  bootstrappedBy?: string
  addedAt?: Date
}
