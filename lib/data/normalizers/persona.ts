import { DEFAULT_PERSONA, normalizePersonaData, type PersonaData } from '@/lib/personas'
import { toDomainDate } from '../types/dates'
import type { PersonaRecord, PersonaSecretRecord } from '../types/records'

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export function normalizePersona(id: string, input: unknown): PersonaRecord {
  const value = objectValue(input)
  const normalized = normalizePersonaData(id, value as Partial<PersonaData>)
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
    status: value.status === undefined || value.status === 'approved' ? 'approved' : 'archived',
    ...(toDomainDate(createdAt) ? { createdAt: toDomainDate(createdAt) } : {}),
    ...(toDomainDate(updatedAt) ? { updatedAt: toDomainDate(updatedAt) } : {}),
    ...(toDomainDate(approvedAt) ? { approvedAt: toDomainDate(approvedAt) } : {}),
  }
}

export function mapLegacyPersona(id: string, input: unknown): PersonaRecord {
  return normalizePersona(id, input)
}

export function toEditablePersona(persona: PersonaRecord, secrets?: Partial<PersonaSecretRecord>): PersonaData {
  return {
    ...DEFAULT_PERSONA,
    ...persona,
    hiddenInstructions: secrets?.hiddenInstructions || '',
    personaKnowledge: secrets?.personaKnowledge || '',
    personaUnknowns: secrets?.personaUnknowns || '',
  }
}
