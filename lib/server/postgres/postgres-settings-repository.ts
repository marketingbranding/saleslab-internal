import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { SettingsReader, SettingsWriter } from '@/lib/data/contracts/settings-repository'
import * as schema from './schema'
import { appSettings } from './schema'
import { getPostgresDatabase } from './connection'
import { toPostgresDataAccessError } from './error-mapper'
import { mapPostgresSettingsRow } from './row-mappers'

export class PostgresSettingsRepository implements SettingsReader, SettingsWriter {
  constructor(private readonly db: PostgresJsDatabase<typeof schema> = getPostgresDatabase()) {}

  async getGlobal() {
    try {
      const [row] = await this.db.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1)
      return mapPostgresSettingsRow(row)
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async updateGlobal(settings: Parameters<SettingsWriter['updateGlobal']>[0]) {
    try {
      const updates: Partial<typeof appSettings.$inferInsert> = { updatedAt: new Date() }
      if (settings.modelProvider !== undefined) updates.modelProvider = settings.modelProvider
      if (settings.geminiModel !== undefined) updates.geminiModel = settings.geminiModel
      if (settings.ollamaModel !== undefined) updates.ollamaModel = settings.ollamaModel
      if (settings.openRouterModel !== undefined) updates.openRouterModel = settings.openRouterModel
      if (settings.thinkingDelay !== undefined) updates.thinkingDelay = settings.thinkingDelay
      if (settings.frustrationSensitivity !== undefined) updates.frustrationSensitivity = settings.frustrationSensitivity
      if (settings.ollamaUrl !== undefined) updates.ollamaUrl = settings.ollamaUrl
      if (settings.updatedBy !== undefined) updates.updatedBy = settings.updatedBy

      await this.db.transaction(async transaction => {
        await transaction.insert(appSettings).values({ id: 'global' }).onConflictDoNothing()
        await transaction.update(appSettings).set(updates).where(eq(appSettings.id, 'global'))
      })
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }
}
