import type { DataAccessError } from '../errors/data-access-error'
import type { GlobalSettingsRecord } from '../types/records'

export interface SettingsReader {
  getGlobal(): Promise<GlobalSettingsRecord>
}

export interface SettingsSubscription {
  subscribeGlobal(
    callback: (settings: GlobalSettingsRecord | null) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
}

export interface SettingsWriter {
  updateGlobal(settings: Partial<GlobalSettingsRecord>): Promise<void>
}

export interface SettingsRepository extends SettingsReader, SettingsSubscription, SettingsWriter {}
