import { createHash } from 'node:crypto'
import type { MasterDataCommand, MasterDataCommandResult } from '@/lib/data/master-data-commands'
import type { BranchRecord, GlobalSettingsRecord } from '@/lib/data/types/records'
import type { DataBackend } from './backend'
import { DataAccessError } from '@/lib/data/errors/data-access-error'

export type MasterDataProjection =
  | { kind: 'branch.upsert'; record: BranchRecord; sourceRevision: number; sourceHash: string }
  | { kind: 'branch.remove'; id: string; sourceRevision: number; sourceHash: string }
  | { kind: 'settings.upsert'; record: GlobalSettingsRecord; sourceRevision: number; sourceHash: string }

export interface PrimaryCommandResult {
  operationId: string
  commandFingerprint: string
  entityType: 'branch' | 'settings'
  entityId: string
  sourceRevision: number
  sourceHash: string
  projections: MasterDataProjection[]
  replayed: boolean
  force?: boolean
}

export interface AuthoritativeMasterDataStore {
  apply(command: MasterDataCommand, actorUid: string, commandFingerprint: string): Promise<PrimaryCommandResult>
  recordMirrorResult(result: PrimaryCommandResult, status: 'skipped' | 'completed' | 'retry-pending' | 'superseded', errorCode?: string): Promise<void>
  recordMismatch(result: PrimaryCommandResult, errorCode: string): Promise<void>
}

export interface MasterDataMirror {
  apply(result: PrimaryCommandResult, actorUid: string): Promise<void>
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

export function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

export function commandFingerprint(command: MasterDataCommand) {
  return stableHash({ schemaVersion: command.schemaVersion, type: command.type, payload: command.payload })
}

export function branchSourceHash(branch: Pick<BranchRecord, 'id' | 'name' | 'normalizedName' | 'type' | 'status'>) {
  return stableHash({ id: branch.id, name: branch.name, normalizedName: branch.normalizedName, type: branch.type || null, status: branch.status })
}

export function settingsSourceHash(settings: GlobalSettingsRecord) {
  return stableHash({
    modelProvider: settings.modelProvider,
    geminiModel: settings.geminiModel || null,
    ollamaModel: settings.ollamaModel || null,
    openRouterModel: settings.openRouterModel || null,
    thinkingDelay: settings.thinkingDelay,
    frustrationSensitivity: settings.frustrationSensitivity,
    ollamaUrl: settings.ollamaUrl || null,
  })
}

function mirrorErrorCode(error: unknown) {
  if (error instanceof DataAccessError) return `PG_${error.category.toUpperCase().replace('-', '_')}`
  return 'PG_UNKNOWN'
}

export async function executeMasterDataCommand(input: {
  backend: DataBackend
  command: MasterDataCommand
  actorUid: string
  authoritative: AuthoritativeMasterDataStore
  loadMirror: () => Promise<MasterDataMirror>
}): Promise<MasterDataCommandResult> {
  if (input.backend === 'postgres') throw new DataAccessError('Mode PostgreSQL belum diaktifkan untuk aplikasi.', 'validation')

  const primary = await input.authoritative.apply(input.command, input.actorUid, commandFingerprint(input.command))
  if (primary.projections.length === 0) {
    await input.authoritative.recordMirrorResult(primary, 'superseded').catch(() => undefined)
    return {
      outcome: 'committed',
      operationId: primary.operationId,
      entityType: primary.entityType,
      entityId: primary.entityId,
      sourceRevision: primary.sourceRevision,
      mirror: 'superseded',
      replayed: primary.replayed,
      affected: 0,
    }
  }
  if (input.backend === 'firestore') {
    await input.authoritative.recordMirrorResult(primary, 'skipped').catch(() => undefined)
    return {
      outcome: 'committed',
      operationId: primary.operationId,
      entityType: primary.entityType,
      entityId: primary.entityId,
      sourceRevision: primary.sourceRevision,
      mirror: 'skipped',
      replayed: primary.replayed,
      affected: primary.projections.length,
    }
  }

  try {
    const mirror = await input.loadMirror()
    await mirror.apply(primary, input.actorUid)
    await input.authoritative.recordMirrorResult(primary, 'completed').catch(() => undefined)
    return {
      outcome: 'committed',
      operationId: primary.operationId,
      entityType: primary.entityType,
      entityId: primary.entityId,
      sourceRevision: primary.sourceRevision,
      mirror: 'completed',
      replayed: primary.replayed,
      affected: primary.projections.length,
    }
  } catch (error) {
    const errorCode = mirrorErrorCode(error)
    await Promise.allSettled([
      input.authoritative.recordMismatch(primary, errorCode),
      input.authoritative.recordMirrorResult(primary, 'retry-pending', errorCode),
    ])
    return {
      outcome: 'primary-committed',
      operationId: primary.operationId,
      entityType: primary.entityType,
      entityId: primary.entityId,
      sourceRevision: primary.sourceRevision,
      mirror: 'retry-pending',
      replayed: primary.replayed,
      affected: primary.projections.length,
    }
  }
}
