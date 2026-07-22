import type { PersonaRecord, PersonaSecretRecord } from '../types/records'
import type { PersonaData } from '@/lib/personas'

export interface PersonaAdminRepository {
  save(input: {
    persona: PersonaRecord
    secrets: Omit<PersonaSecretRecord, 'personaId' | 'updatedAt' | 'updatedBy'>
    actorId: string
  }): Promise<void>
  archive(id: string): Promise<void>
  approveSubmission(input: {
    submissionId: string
    personaId: string
    reviewedPersona: PersonaData
    approverId: string
    approverName: string
  }): Promise<void>
}
