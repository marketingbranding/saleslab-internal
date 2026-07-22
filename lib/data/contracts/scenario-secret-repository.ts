import type { DataAccessError } from '../errors/data-access-error'
import type { ScenarioSecretRecord } from '../types/records'

export interface ScenarioSecretRepository {
  subscribeAll(
    callback: (items: Record<string, ScenarioSecretRecord>) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  migrateLegacyPublicSecrets(actorId: string): Promise<void>
}
