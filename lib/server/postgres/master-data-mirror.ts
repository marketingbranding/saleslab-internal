import { and, eq, lte } from 'drizzle-orm'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import type { MasterDataMirror, PrimaryCommandResult } from '@/lib/server/data/master-data-sync'
import { getPostgresDatabase } from './connection'
import { toPostgresDataAccessError } from './error-mapper'
import { appSettings, branches, dataSyncReceipts, users } from './schema'
import { mapBranchRecordToPostgresValues, mapSettingsRecordToPostgresValues } from './row-mappers'

export class PostgresMasterDataMirror implements MasterDataMirror {
  private readonly db = getPostgresDatabase()

  async apply(result: PrimaryCommandResult, actorUid: string) {
    try {
      await this.db.transaction(async transaction => {
        const [receipt] = await transaction.select().from(dataSyncReceipts).where(eq(dataSyncReceipts.operationId, result.operationId)).limit(1)
        if (receipt) {
          if (receipt.commandFingerprint !== result.commandFingerprint) throw new DataAccessError('Receipt sinkronisasi tidak konsisten.', 'conflict')
          return
        }

        const actorIds = new Set([actorUid])
        result.projections.forEach(projection => {
          if (projection.kind === 'branch.upsert' && projection.record.createdBy) actorIds.add(projection.record.createdBy)
          if (projection.kind === 'settings.upsert' && projection.record.updatedBy) actorIds.add(projection.record.updatedBy)
        })
        for (const firebaseUid of actorIds) {
          await transaction.insert(users).values({ firebaseUid }).onConflictDoNothing()
        }

        for (const projection of result.projections) {
          if (projection.kind === 'branch.remove') {
            await transaction.delete(branches).where(result.force
              ? eq(branches.id, projection.id)
              : and(eq(branches.id, projection.id), lte(branches.sourceRevision, projection.sourceRevision)))
            continue
          }
          if (projection.kind === 'branch.upsert') {
            const values = mapBranchRecordToPostgresValues(projection.record)
            await transaction.insert(branches).values({
              ...values,
              sourceRevision: projection.sourceRevision,
              sourceHash: projection.sourceHash,
            }).onConflictDoUpdate({
              target: branches.id,
              set: {
                name: values.name,
                normalizedName: values.normalizedName,
                type: values.type,
                status: values.status,
                updatedAt: values.updatedAt,
                sourceRevision: projection.sourceRevision,
                sourceHash: projection.sourceHash,
              },
              ...(!result.force ? { setWhere: lte(branches.sourceRevision, projection.sourceRevision) } : {}),
            })
            continue
          }
          const values = mapSettingsRecordToPostgresValues(projection.record)
          await transaction.insert(appSettings).values({
            ...values,
            sourceRevision: projection.sourceRevision,
            sourceHash: projection.sourceHash,
          }).onConflictDoUpdate({
            target: appSettings.id,
            set: {
              modelProvider: values.modelProvider,
              geminiModel: values.geminiModel,
              ollamaModel: values.ollamaModel,
              openRouterModel: values.openRouterModel,
              thinkingDelay: values.thinkingDelay,
              frustrationSensitivity: values.frustrationSensitivity,
              ollamaUrl: values.ollamaUrl,
              updatedBy: values.updatedBy,
              updatedAt: values.updatedAt,
              sourceRevision: projection.sourceRevision,
              sourceHash: projection.sourceHash,
            },
            ...(!result.force ? { setWhere: lte(appSettings.sourceRevision, projection.sourceRevision) } : {}),
          })
        }

        await transaction.insert(dataSyncReceipts).values({
          operationId: result.operationId,
          commandFingerprint: result.commandFingerprint,
          entityType: result.entityType,
          entityId: result.entityId,
          sourceRevision: Math.max(1, result.sourceRevision),
          sourceHash: result.sourceHash,
        })
      })
    } catch (error) {
      if ((error as { code?: unknown })?.code === '23505') {
        const [receipt] = await this.db.select().from(dataSyncReceipts).where(eq(dataSyncReceipts.operationId, result.operationId)).limit(1)
        if (receipt?.commandFingerprint === result.commandFingerprint) return
      }
      throw toPostgresDataAccessError(error)
    }
  }
}

export function createPostgresMasterDataMirror() {
  return new PostgresMasterDataMirror()
}
