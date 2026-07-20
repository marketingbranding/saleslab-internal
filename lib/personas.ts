import type { SalesScenario } from '@/lib/gemini'
import type { Difficulty, Persona } from '@/lib/sos/types'

export type PersonaStatus = 'approved' | 'archived'
export type PersonaSubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface Branch {
  id: string
  name: string
  normalizedName: string
  status: 'active' | 'archived'
  createdBy?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface UserMembership {
  userId: string
  email: string
  displayName: string
  branchId: string
  branchName: string
  selectedAt?: unknown
  updatedAt?: unknown
  updatedBy?: string
}

export interface PersonaCreator {
  creatorUid: string
  creatorName: string
  creatorEmail: string
  creatorBranchId: string
  creatorBranchName: string
}

export interface PersonaData extends Partial<PersonaCreator> {
  id: string
  name: string
  gender: 'Pria' | 'Wanita'
  age: number
  occupation: string
  familyStatus: string
  incomeRange: string
  backgroundStory: string
  currentSituation: string
  goals: string
  painPoints: string
  motivations: string
  personality: string
  emotionalLevel: number
  aggressiveness: number
  patience: number
  trustLevel: number
  curiosityLevel: number
  speechStyle: string
  tone: string
  formality: string
  speakingSpeed: string
  commonPhrases: string
  commonObjections: string
  triggerConditions: string
  escalationBehavior: string
  hiddenInstructions: string
  personaKnowledge: string
  personaUnknowns: string
  status?: PersonaStatus
  version?: number
  sourceSubmissionId?: string
  createdBy?: string
  createdAt?: unknown
  updatedAt?: unknown
  approvedAt?: unknown
  approvedBy?: string
}

export type PersonaPublicData = Omit<PersonaData,
  | 'hiddenInstructions'
  | 'personaKnowledge'
  | 'personaUnknowns'
  | 'status'
  | 'version'
  | 'sourceSubmissionId'
  | 'createdBy'
  | 'createdAt'
  | 'updatedAt'
  | 'approvedAt'
  | 'approvedBy'
  | keyof PersonaCreator
>

export interface PersonaSubmission extends PersonaCreator {
  id: string
  persona: PersonaPublicData
  status: PersonaSubmissionStatus
  targetPersonaId?: string
  previousSubmissionId?: string
  submittedAt?: unknown
  updatedAt?: unknown
  reviewedAt?: unknown
  reviewedByUid?: string
  reviewedByName?: string
  rejectionReason?: string
}

export const DEFAULT_PERSONA: PersonaData = {
  id: '',
  name: '',
  gender: 'Pria',
  age: 35,
  occupation: '',
  familyStatus: '',
  incomeRange: '',
  backgroundStory: '',
  currentSituation: '',
  goals: '',
  painPoints: '',
  motivations: '',
  personality: 'Neutral',
  emotionalLevel: 5,
  aggressiveness: 5,
  patience: 5,
  trustLevel: 5,
  curiosityLevel: 5,
  speechStyle: 'To the point',
  tone: 'Neutral',
  formality: 'Neutral',
  speakingSpeed: 'Normal',
  commonPhrases: '',
  commonObjections: '',
  triggerConditions: '',
  escalationBehavior: '',
  hiddenInstructions: '',
  personaKnowledge: '',
  personaUnknowns: '',
}

export function toPersonaPublicData(persona: PersonaData): PersonaPublicData {
  return {
    id: persona.id,
    name: persona.name.trim(),
    gender: persona.gender,
    age: persona.age,
    occupation: persona.occupation,
    familyStatus: persona.familyStatus,
    incomeRange: persona.incomeRange,
    backgroundStory: persona.backgroundStory,
    currentSituation: persona.currentSituation,
    goals: persona.goals,
    painPoints: persona.painPoints,
    motivations: persona.motivations,
    personality: persona.personality,
    emotionalLevel: persona.emotionalLevel,
    aggressiveness: persona.aggressiveness,
    patience: persona.patience,
    trustLevel: persona.trustLevel,
    curiosityLevel: persona.curiosityLevel,
    speechStyle: persona.speechStyle,
    tone: persona.tone,
    formality: persona.formality,
    speakingSpeed: persona.speakingSpeed,
    commonPhrases: persona.commonPhrases,
    commonObjections: persona.commonObjections,
    triggerConditions: persona.triggerConditions,
    escalationBehavior: persona.escalationBehavior,
  }
}

export function submissionToPersonaData(submission: PersonaSubmission): PersonaData {
  return {
    ...DEFAULT_PERSONA,
    ...submission.persona,
    id: submission.targetPersonaId || submission.persona.id,
    creatorUid: submission.creatorUid,
    creatorName: submission.creatorName,
    creatorEmail: submission.creatorEmail,
    creatorBranchId: submission.creatorBranchId,
    creatorBranchName: submission.creatorBranchName,
    sourceSubmissionId: submission.id,
  }
}

export function normalizePersonaData(id: string, value: Partial<PersonaData>): PersonaData {
  return {
    ...DEFAULT_PERSONA,
    ...value,
    id,
    status: value.status || 'approved',
    version: value.version || 1,
  }
}

function mapDifficulty(difficulty: SalesScenario['difficulty']): Difficulty {
  if (difficulty === 'Easy') return 'easy'
  if (difficulty === 'Hard') return 'hard'
  return 'medium'
}

function scale(value: number, fallback = 5) {
  const safe = Number.isFinite(value) ? value : fallback
  return Math.max(0, Math.min(100, Math.round(safe * 10)))
}

function lines(value: string) {
  return value.split(/\r?\n|;/).map(item => item.trim()).filter(Boolean)
}

export function mapPersonaDataToSos(persona: PersonaData, scenario: SalesScenario): Persona {
  return {
    id: persona.id,
    name: scenario.name || persona.name,
    ageRange: persona.age ? String(persona.age) : undefined,
    gender: scenario.gender === 'Pria' ? 'male' : 'female',
    occupation: persona.occupation || undefined,
    maritalStatus: persona.familyStatus || undefined,
    incomeRange: persona.incomeRange || undefined,
    familyContext: persona.backgroundStory || undefined,
    primaryGoal: persona.goals || scenario.target,
    primaryFear: persona.painPoints || persona.currentSituation || undefined,
    communicationStyle: [scenario.responseStyle, persona.tone, persona.formality].filter(Boolean).join(', '),
    patience: scale(scenario.patience),
    aggressiveness: scale(scenario.aggressiveness),
    skepticism: Math.max(0, 100 - scale(persona.trustLevel)),
    trustStart: scale(persona.trustLevel),
    urgency: scale(persona.emotionalLevel),
    subsidyKnowledge: scale(persona.curiosityLevel),
    hiddenInformation: persona.personaKnowledge.trim() ? [{
      key: 'persona_knowledge',
      value: persona.personaKnowledge.trim(),
      revealWhen: ['relevant discovery questions'],
      importance: 'moderate',
    }] : [],
    objections: lines(persona.commonObjections).map((statement, index) => ({
      key: `custom_objection_${index + 1}`,
      category: 'custom',
      statement,
    })),
    buyingSignals: lines(persona.motivations),
    walkAwayConditions: lines(persona.escalationBehavior),
    difficulty: mapDifficulty(scenario.difficulty),
    legacy: {
      backgroundStory: persona.backgroundStory,
      currentSituation: persona.currentSituation,
      commonPhrases: persona.commonPhrases,
      triggerConditions: persona.triggerConditions,
      hiddenInstructions: persona.hiddenInstructions,
      personaUnknowns: persona.personaUnknowns,
    },
  }
}
