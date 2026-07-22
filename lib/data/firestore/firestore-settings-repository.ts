import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SettingsRepository } from '../contracts/settings-repository'
import { DEFAULT_GLOBAL_SETTINGS, isModelProvider } from '../defaults/global-settings'
import type { GlobalSettingsRecord } from '../types/records'
import { toDomainDate } from '../types/dates'
import { toDataAccessError } from './error-mapper'
import { createCommandId, sendMasterDataCommand } from '../client/master-data-command'

function mapSettings(value: Record<string, unknown>): GlobalSettingsRecord {
  return {
    modelProvider: isModelProvider(value.modelProvider) ? value.modelProvider : DEFAULT_GLOBAL_SETTINGS.modelProvider,
    thinkingDelay: typeof value.thinkingDelay === 'number' ? value.thinkingDelay : DEFAULT_GLOBAL_SETTINGS.thinkingDelay,
    frustrationSensitivity: typeof value.frustrationSensitivity === 'number' ? value.frustrationSensitivity : DEFAULT_GLOBAL_SETTINGS.frustrationSensitivity,
    ...(typeof value.geminiModel === 'string' ? { geminiModel: value.geminiModel } : {}),
    ...(typeof value.ollamaModel === 'string' ? { ollamaModel: value.ollamaModel } : {}),
    ...(typeof value.openRouterModel === 'string' ? { openRouterModel: value.openRouterModel } : {}),
    ...(typeof value.ollamaUrl === 'string' ? { ollamaUrl: value.ollamaUrl } : {}),
    ...(typeof value.updatedBy === 'string' ? { updatedBy: value.updatedBy } : {}),
    ...(toDomainDate(value.updatedAt) ? { updatedAt: toDomainDate(value.updatedAt) } : {}),
  }
}

export class FirestoreSettingsRepository implements SettingsRepository {
  async getGlobal() {
    try {
      const snapshot = await getDoc(doc(db, 'settings', 'global'))
      return snapshot.exists() ? mapSettings(snapshot.data()) : { ...DEFAULT_GLOBAL_SETTINGS }
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribeGlobal(callback: Parameters<SettingsRepository['subscribeGlobal']>[0], onError?: Parameters<SettingsRepository['subscribeGlobal']>[1]) {
    return onSnapshot(doc(db, 'settings', 'global'), snapshot => {
      callback(snapshot.exists() ? mapSettings(snapshot.data()) : null)
    }, error => onError?.(toDataAccessError(error)))
  }

  async updateGlobal(settings: Partial<GlobalSettingsRecord>) {
    await sendMasterDataCommand({
      schemaVersion: 1,
      commandId: createCommandId(),
      type: 'settings.update',
      payload: { settings },
    })
  }
}
