import { DEFAULT_GLOBAL_SETTINGS, isModelProvider } from '@/lib/data/defaults/global-settings'
import type { BranchRecord, GlobalSettingsRecord } from '@/lib/data/types/records'
import type { appSettings, branches } from './schema'

export type PostgresBranchRow = typeof branches.$inferSelect
export type PostgresBranchInsert = typeof branches.$inferInsert
export type PostgresSettingsRow = typeof appSettings.$inferSelect
export type PostgresSettingsInsert = typeof appSettings.$inferInsert

function copyDate(value: Date | null | undefined) {
  return value ? new Date(value.getTime()) : undefined
}

export function mapPostgresBranchRow(row: PostgresBranchRow): BranchRecord {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalizedName,
    status: row.status === 'active' ? 'active' : 'archived',
    ...(row.type === 'KC' || row.type === 'KCP' ? { type: row.type } : {}),
    ...(row.createdBy ? { createdBy: row.createdBy } : {}),
    ...(copyDate(row.createdAt) ? { createdAt: copyDate(row.createdAt) } : {}),
    ...(copyDate(row.updatedAt) ? { updatedAt: copyDate(row.updatedAt) } : {}),
  }
}

export function mapBranchRecordToPostgresValues(branch: BranchRecord, now = new Date()): PostgresBranchInsert {
  return {
    id: branch.id,
    name: branch.name,
    normalizedName: branch.normalizedName,
    type: branch.type,
    status: branch.status,
    createdBy: branch.createdBy,
    createdAt: branch.createdAt ? new Date(branch.createdAt.getTime()) : new Date(now.getTime()),
    updatedAt: new Date(now.getTime()),
  }
}

export function mapPostgresSettingsRow(row: PostgresSettingsRow | undefined): GlobalSettingsRecord {
  if (!row) return { ...DEFAULT_GLOBAL_SETTINGS }
  return {
    modelProvider: isModelProvider(row.modelProvider) ? row.modelProvider : DEFAULT_GLOBAL_SETTINGS.modelProvider,
    thinkingDelay: row.thinkingDelay,
    frustrationSensitivity: row.frustrationSensitivity,
    ...(row.geminiModel ? { geminiModel: row.geminiModel } : {}),
    ...(row.ollamaModel ? { ollamaModel: row.ollamaModel } : {}),
    ...(row.openRouterModel ? { openRouterModel: row.openRouterModel } : {}),
    ...(row.ollamaUrl ? { ollamaUrl: row.ollamaUrl } : {}),
    ...(row.updatedBy ? { updatedBy: row.updatedBy } : {}),
    ...(copyDate(row.updatedAt) ? { updatedAt: copyDate(row.updatedAt) } : {}),
  }
}

export function mapSettingsRecordToPostgresValues(settings: GlobalSettingsRecord, now = new Date()): PostgresSettingsInsert {
  return {
    id: 'global',
    modelProvider: settings.modelProvider,
    geminiModel: settings.geminiModel,
    ollamaModel: settings.ollamaModel,
    openRouterModel: settings.openRouterModel,
    thinkingDelay: settings.thinkingDelay,
    frustrationSensitivity: settings.frustrationSensitivity,
    ollamaUrl: settings.ollamaUrl,
    updatedBy: settings.updatedBy,
    updatedAt: settings.updatedAt ? new Date(settings.updatedAt.getTime()) : new Date(now.getTime()),
  }
}
