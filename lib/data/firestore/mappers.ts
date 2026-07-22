import type { SalesScenario } from '@/lib/gemini'
import { normalizePersonaData, type PersonaData } from '@/lib/personas'
import { toDomainDate } from '../types/dates'
import type { BranchRecord, PersonaRecord, RoleplaySessionRecord, ScenarioRecord, SessionFeedback, TranscriptTurn } from '../types/records'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : fallback
}

export function mapBranchDocument(id: string, value: unknown): BranchRecord {
  const data = record(value)
  const name = stringValue(data.name)
  const status = data.status === 'active' ? 'active' : 'archived'
  const type = data.type === 'KC' || data.type === 'KCP' ? data.type : undefined

  return {
    id,
    name,
    normalizedName: stringValue(data.normalizedName, name.toLowerCase().trim()),
    status,
    ...(type ? { type } : {}),
    ...(typeof data.createdBy === 'string' ? { createdBy: data.createdBy } : {}),
    ...(toDomainDate(data.createdAt) ? { createdAt: toDomainDate(data.createdAt) } : {}),
    ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
  }
}

export function mapScenarioDocument(id: string, value: unknown): ScenarioRecord {
  const data = record(value)
  const title = stringValue(data.title, id)
  const description = stringValue(data.description, title)
  const difficulty = data.difficulty === 'Easy' || data.difficulty === 'Hard' || data.difficulty === 'Medium'
    ? data.difficulty
    : 'Medium'
  const gender = data.gender === 'Wanita' ? 'Wanita' : 'Pria'
  const responseStyle = ['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(String(data.responseStyle))
    ? data.responseStyle as SalesScenario['responseStyle']
    : 'Banyak Tanya'
  const firstSpeaker = data.firstSpeaker === 'Sales' ? 'Sales' : 'AI'
  const successCriteria = Array.isArray(data.successCriteria)
    ? data.successCriteria.filter((item): item is string => typeof item === 'string')
    : undefined
  const status = data.status === 'draft' || data.status === 'published' || data.status === 'archived'
    ? data.status
    : undefined

  return {
    id,
    title,
    description,
    target: stringValue(data.target, description),
    consumerProfile: stringValue(data.consumerProfile, description),
    difficulty,
    icon: stringValue(data.icon, 'UserPlus'),
    name: stringValue(data.name, 'Konsumen'),
    gender,
    aggressiveness: boundedInteger(data.aggressiveness, 5, 1, 10),
    patience: boundedInteger(data.patience, 5, 1, 10),
    responseStyle,
    firstSpeaker,
    ...(typeof data.personaId === 'string' && data.personaId ? { personaId: data.personaId } : {}),
    ...(typeof data.openingMessage === 'string' ? { openingMessage: data.openingMessage } : {}),
    ...(successCriteria ? { successCriteria } : {}),
    ...(typeof data.baseXp === 'number' && Number.isFinite(data.baseXp) ? { baseXp: data.baseXp } : {}),
    ...(status ? { status } : {}),
    ...(typeof data.userId === 'string' ? { userId: data.userId } : {}),
    ...(toDomainDate(data.createdAt) ? { createdAt: toDomainDate(data.createdAt) } : {}),
    ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
  }
}

export function mapPersonaDocument(id: string, value: unknown): PersonaRecord {
  const data = record(value)
  const normalized = normalizePersonaData(id, data as Partial<PersonaData>)
  const {
    hiddenInstructions: _hiddenInstructions,
    personaKnowledge: _personaKnowledge,
    personaUnknowns: _personaUnknowns,
    createdAt,
    updatedAt,
    approvedAt,
    ...publicPersona
  } = normalized

  return {
    ...publicPersona,
    status: data.status === undefined || data.status === 'approved'
      ? 'approved'
      : data.status === 'archived' ? 'archived' : 'archived',
    ...(toDomainDate(createdAt) ? { createdAt: toDomainDate(createdAt) } : {}),
    ...(toDomainDate(updatedAt) ? { updatedAt: toDomainDate(updatedAt) } : {}),
    ...(toDomainDate(approvedAt) ? { approvedAt: toDomainDate(approvedAt) } : {}),
  }
}

export function mapSessionDocument(id: string, value: unknown): RoleplaySessionRecord {
  const data = record(value)
  const transcript: TranscriptTurn[] | undefined = Array.isArray(data.transcript)
    ? data.transcript.flatMap(turn => {
      const item = record(turn)
      return (item.role === 'user' || item.role === 'model') && typeof item.text === 'string'
        ? [{ role: item.role as TranscriptTurn['role'], text: item.text }]
        : []
    })
    : undefined

  const rawFeedback = record(data.feedback)
  const feedback: SessionFeedback | undefined = data.feedback && typeof data.feedback === 'object'
    ? {
      ...rawFeedback,
      overallScore: typeof rawFeedback.overallScore === 'number' ? rawFeedback.overallScore : 0,
      strengths: Array.isArray(rawFeedback.strengths) ? rawFeedback.strengths.filter((item): item is string => typeof item === 'string') : [],
      weaknesses: Array.isArray(rawFeedback.weaknesses) ? rawFeedback.weaknesses.filter((item): item is string => typeof item === 'string') : [],
      keyObjectionsHandled: Array.isArray(rawFeedback.keyObjectionsHandled) ? rawFeedback.keyObjectionsHandled.filter((item): item is string => typeof item === 'string') : [],
      missedOpportunities: Array.isArray(rawFeedback.missedOpportunities) ? rawFeedback.missedOpportunities.filter((item): item is string => typeof item === 'string') : [],
      verdict: stringValue(rawFeedback.verdict),
      actionableTips: Array.isArray(rawFeedback.actionableTips) ? rawFeedback.actionableTips.filter((item): item is string => typeof item === 'string') : [],
    } as SessionFeedback
    : undefined

  return {
    id,
    scenarioId: stringValue(data.scenarioId),
    salespersonName: stringValue(data.salespersonName),
    userId: stringValue(data.userId),
    score: typeof data.score === 'number' && Number.isFinite(data.score) ? data.score : 0,
    ...(transcript ? { transcript } : {}),
    ...(feedback ? { feedback } : {}),
    ...(typeof data.personaId === 'string' ? { personaId: data.personaId } : {}),
    ...(typeof data.personaVersion === 'number' ? { personaVersion: data.personaVersion } : {}),
    ...(data.analysisStatus === 'processing' || data.analysisStatus === 'completed' || data.analysisStatus === 'failed' ? { analysisStatus: data.analysisStatus } : {}),
    ...(typeof data.analysisAttempt === 'number' ? { analysisAttempt: data.analysisAttempt } : {}),
    ...(typeof data.analysisError === 'string' ? { analysisError: data.analysisError } : {}),
    ...(typeof data.analysisProvider === 'string' ? { analysisProvider: data.analysisProvider } : {}),
    ...(data.transcriptQuality === 'partial' || data.transcriptQuality === 'complete' ? { transcriptQuality: data.transcriptQuality } : {}),
    ...(typeof data.inputDigest === 'string' ? { inputDigest: data.inputDigest } : {}),
    ...(toDomainDate(data.createdAt) ? { createdAt: toDomainDate(data.createdAt) } : {}),
    ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
    ...(toDomainDate(data.completedAt) ? { completedAt: toDomainDate(data.completedAt) } : {}),
  }
}

export function scenarioWriteData(scenario: SalesScenario) {
  const { hiddenRules: _hiddenRules, ...publicScenario } = scenario
  return Object.fromEntries(Object.entries(publicScenario).filter(([, value]) => value !== undefined))
}
