import type { DataAccessError } from '../errors/data-access-error'
import type { PersonaRecord } from '../types/records'

export interface PersonaRepository {
  listApproved(): Promise<PersonaRecord[]>
  subscribeApproved(
    callback: (items: PersonaRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getById(id: string): Promise<PersonaRecord | null>
}
