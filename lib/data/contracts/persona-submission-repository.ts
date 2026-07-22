import type { DataAccessError } from '../errors/data-access-error'
import type { PersonaSubmissionRecord } from '../types/records'

export interface PersonaSubmissionRepository {
  subscribeForUser(
    userId: string,
    callback: (submissions: PersonaSubmissionRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  subscribeAll(
    callback: (submissions: PersonaSubmissionRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
}
