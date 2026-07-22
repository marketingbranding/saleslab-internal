import type { DataAccessError } from '../errors/data-access-error'
import type { GlobalSettingsRecord } from '../types/records'

export interface SettingsRepository {
  getGlobal(): Promise<GlobalSettingsRecord>
  subscribeGlobal(
    callback: (settings: GlobalSettingsRecord | null) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  updateGlobal(settings: Partial<GlobalSettingsRecord>): Promise<void>
}
