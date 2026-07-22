import type { DataAccessError } from '../errors/data-access-error'
import type { PersonaSecretRecord } from '../types/records'

export interface PersonaSecretRepository {
  subscribeAll(
    callback: (items: Record<string, PersonaSecretRecord>) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  migrateLegacyPublicSecrets(actorId: string): Promise<void>
}
