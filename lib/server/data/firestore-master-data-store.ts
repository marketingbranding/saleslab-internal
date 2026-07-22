import { FieldValue, type DocumentData, type Transaction } from 'firebase-admin/firestore'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import { DEFAULT_GLOBAL_SETTINGS, isModelProvider } from '@/lib/data/defaults/global-settings'
import type { MasterDataCommand } from '@/lib/data/master-data-commands'
import type { BranchRecord, GlobalSettingsRecord } from '@/lib/data/types/records'
import { toDomainDate } from '@/lib/data/types/dates'
import { getAdminDb } from '@/lib/server/firebase-admin'
import {
  branchSourceHash,
  settingsSourceHash,
  stableHash,
  type AuthoritativeMasterDataStore,
  type MasterDataProjection,
  type PrimaryCommandResult,
} from './master-data-sync'

interface ProjectionMeta {
  kind: MasterDataProjection['kind']
  id: string
  sourceRevision: number
  sourceHash: string
}

interface OperationMeta {
  operationId: string
  commandFingerprint: string
  entityType: 'branch' | 'settings'
  entityId: string
  sourceRevision: number
  sourceHash: string
  projectionMeta: ProjectionMeta[]
  replayed: boolean
}

export function readSourceRevision(data: DocumentData | undefined) {
  if (typeof data?.revision === 'number' && Number.isInteger(data.revision)) return data.revision
  return typeof data?.syncRevision === 'number' && Number.isInteger(data.syncRevision) ? data.syncRevision : 0
}

export function branchFromData(id: string, data: DocumentData): BranchRecord {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : id,
    normalizedName: typeof data.normalizedName === 'string' ? data.normalizedName : String(data.name || id).toLowerCase().trim(),
    status: data.status === 'active' ? 'active' : 'archived',
    ...(data.type === 'KC' || data.type === 'KCP' ? { type: data.type } : {}),
    ...(typeof data.createdBy === 'string' ? { createdBy: data.createdBy } : {}),
    ...(toDomainDate(data.createdAt) ? { createdAt: toDomainDate(data.createdAt) } : {}),
    ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
  }
}

export function settingsFromData(data: DocumentData): GlobalSettingsRecord {
  return {
    modelProvider: isModelProvider(data.modelProvider) ? data.modelProvider : DEFAULT_GLOBAL_SETTINGS.modelProvider,
    thinkingDelay: typeof data.thinkingDelay === 'number' ? data.thinkingDelay : DEFAULT_GLOBAL_SETTINGS.thinkingDelay,
    frustrationSensitivity: typeof data.frustrationSensitivity === 'number' ? data.frustrationSensitivity : DEFAULT_GLOBAL_SETTINGS.frustrationSensitivity,
    ...(typeof data.geminiModel === 'string' ? { geminiModel: data.geminiModel } : {}),
    ...(typeof data.ollamaModel === 'string' ? { ollamaModel: data.ollamaModel } : {}),
    ...(typeof data.openRouterModel === 'string' ? { openRouterModel: data.openRouterModel } : {}),
    ...(typeof data.ollamaUrl === 'string' ? { ollamaUrl: data.ollamaUrl } : {}),
    ...(typeof data.updatedBy === 'string' ? { updatedBy: data.updatedBy } : {}),
    ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
  }
}

function operationData(meta: OperationMeta, command: MasterDataCommand, actorUid: string) {
  return {
    schemaVersion: 1,
    commandType: command.type,
    commandFingerprint: meta.commandFingerprint,
    entityType: meta.entityType,
    entityId: meta.entityId,
    sourceRevision: meta.sourceRevision,
    sourceHash: meta.sourceHash,
    projectionMeta: meta.projectionMeta,
    actorUid,
    state: 'firestore-committed',
    mirrorStatus: 'pending',
    attemptCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }
}

export class FirestoreMasterDataStore implements AuthoritativeMasterDataStore {
  private readonly db = getAdminDb()

  async apply(command: MasterDataCommand, actorUid: string, commandFingerprint: string) {
    const operationRef = this.db.collection('dataSyncOperations').doc(command.commandId)
    const meta = await this.db.runTransaction(async transaction => {
      const [adminGrant, existingOperation] = await Promise.all([
        transaction.get(this.db.collection('admins').doc(actorUid)),
        transaction.get(operationRef),
      ])
      if (!adminGrant.exists) throw new DataAccessError('Anda tidak memiliki izin untuk tindakan ini.', 'forbidden')
      if (existingOperation.exists) {
        const data = existingOperation.data() || {}
        if (data.commandFingerprint !== commandFingerprint) throw new DataAccessError('ID perintah sudah digunakan untuk data lain.', 'conflict')
        return {
          operationId: command.commandId,
          commandFingerprint,
          entityType: data.entityType as 'branch' | 'settings',
          entityId: String(data.entityId),
          sourceRevision: Number(data.sourceRevision),
          sourceHash: String(data.sourceHash),
          projectionMeta: Array.isArray(data.projectionMeta) ? data.projectionMeta as ProjectionMeta[] : [],
          replayed: true,
        }
      }

      const created = await this.applyNewCommand(transaction, command, actorUid, commandFingerprint)
      transaction.set(operationRef, operationData(created, command, actorUid))
      return created
    })
    return this.hydrate(meta)
  }

  private async applyNewCommand(transaction: Transaction, command: MasterDataCommand, actorUid: string, fingerprint: string): Promise<OperationMeta> {
    switch (command.type) {
      case 'branch.save': {
        const branch = command.payload.branch
        const reference = this.db.collection('branches').doc(branch.id)
        const [current, duplicate] = await Promise.all([
          transaction.get(reference),
          transaction.get(this.db.collection('branches').where('normalizedName', '==', branch.normalizedName).limit(1)),
        ])
        if (duplicate.docs.some(item => item.id !== branch.id)) throw new DataAccessError('Nama cabang sudah digunakan.', 'conflict')
        const claimRef = this.branchNameClaim(branch.normalizedName)
        const revisionRef = this.entityRevision('branch', branch.id)
        const oldClaimRef = current.data()?.normalizedName && current.data()?.normalizedName !== branch.normalizedName
          ? this.branchNameClaim(String(current.data()?.normalizedName))
          : null
        const [claim, revisionSnapshot, oldClaim] = await Promise.all([
          transaction.get(claimRef),
          transaction.get(revisionRef),
          oldClaimRef ? transaction.get(oldClaimRef) : Promise.resolve(null),
        ])
        if (claim.exists && claim.data()?.branchId !== branch.id) throw new DataAccessError('Nama cabang sudah digunakan.', 'conflict')
        const sourceRevision = readSourceRevision(revisionSnapshot.data()) + 1
        const record: BranchRecord = { ...branch, createdBy: current.data()?.createdBy || actorUid }
        const sourceHash = branchSourceHash(record)
        transaction.set(reference, {
          id: branch.id,
          name: branch.name,
          normalizedName: branch.normalizedName,
          ...(branch.type ? { type: branch.type } : {}),
          status: branch.status,
          createdBy: record.createdBy,
          createdAt: current.data()?.createdAt || FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          syncRevision: sourceRevision,
          syncHash: sourceHash,
        })
        transaction.set(revisionRef, { entityType: 'branch', entityId: branch.id, revision: sourceRevision, updatedAt: FieldValue.serverTimestamp() })
        transaction.set(claimRef, { branchId: branch.id, normalizedNameHash: stableHash(branch.normalizedName), updatedAt: FieldValue.serverTimestamp() })
        if (oldClaimRef && oldClaim?.data()?.branchId === branch.id) transaction.delete(oldClaimRef)
        return this.meta(command, fingerprint, 'branch', branch.id, [{ kind: 'branch.upsert', id: branch.id, sourceRevision, sourceHash }])
      }
      case 'branch.seed': {
        const snapshot = await transaction.get(this.db.collection('branches'))
        const existingNames = new Set(snapshot.docs.map(item => String(item.data().normalizedName || '')))
        const existingIds = new Set(snapshot.docs.map(item => item.id))
        const missing = command.payload.defaults.filter(item => !existingIds.has(item.id) && !existingNames.has(item.normalizedName))
        if (missing.length > 166) throw new DataAccessError('Terlalu banyak cabang untuk satu proses.', 'validation')
        const claimAndRevision = await Promise.all(missing.map(async item => ({
          item,
          claimRef: this.branchNameClaim(item.normalizedName),
          revisionRef: this.entityRevision('branch', item.id),
          claim: await transaction.get(this.branchNameClaim(item.normalizedName)),
          revisionSnapshot: await transaction.get(this.entityRevision('branch', item.id)),
        })))
        claimAndRevision.forEach(({ item, claim }) => {
          if (claim.exists && claim.data()?.branchId !== item.id) throw new DataAccessError('Nama cabang sudah digunakan.', 'conflict')
        })
        const projectionMeta = claimAndRevision.map(({ item, claimRef, revisionRef, revisionSnapshot }) => {
          const sourceRevision = readSourceRevision(revisionSnapshot.data()) + 1
          const record: BranchRecord = { ...item, status: 'active', createdBy: actorUid }
          const sourceHash = branchSourceHash(record)
          transaction.set(this.db.collection('branches').doc(item.id), {
            ...item,
            status: 'active',
            createdBy: actorUid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            syncRevision: sourceRevision,
            syncHash: sourceHash,
          })
          transaction.set(revisionRef, { entityType: 'branch', entityId: item.id, revision: sourceRevision, updatedAt: FieldValue.serverTimestamp() })
          transaction.set(claimRef, { branchId: item.id, normalizedNameHash: stableHash(item.normalizedName), updatedAt: FieldValue.serverTimestamp() })
          return { kind: 'branch.upsert' as const, id: item.id, sourceRevision, sourceHash }
        })
        transaction.set(this.db.collection('settings').doc('branchCatalog'), {
          version: 1,
          seededAt: FieldValue.serverTimestamp(),
          seededBy: actorUid,
        })
        return this.meta(command, fingerprint, 'branch', 'branchCatalog', projectionMeta)
      }
      case 'branch.rename': {
        const reference = this.db.collection('branches').doc(command.payload.branchId)
        const [current, duplicate, memberships] = await Promise.all([
          transaction.get(reference),
          transaction.get(this.db.collection('branches').where('normalizedName', '==', command.payload.normalizedName).limit(1)),
          transaction.get(this.db.collection('userMemberships').where('branchId', '==', command.payload.branchId)),
        ])
        if (!current.exists) throw new DataAccessError('Cabang tidak ditemukan.', 'not-found')
        if (duplicate.docs.some(item => item.id !== command.payload.branchId)) throw new DataAccessError('Nama cabang sudah digunakan.', 'conflict')
        const claimRef = this.branchNameClaim(command.payload.normalizedName)
        const oldClaimRef = this.branchNameClaim(String(current.data()?.normalizedName || ''))
        const revisionRef = this.entityRevision('branch', command.payload.branchId)
        const [claim, oldClaim, revisionSnapshot] = await Promise.all([
          transaction.get(claimRef),
          transaction.get(oldClaimRef),
          transaction.get(revisionRef),
        ])
        if (claim.exists && claim.data()?.branchId !== command.payload.branchId) throw new DataAccessError('Nama cabang sudah digunakan.', 'conflict')
        if (memberships.size > 493) throw new DataAccessError('Cabang memiliki terlalu banyak user untuk diperbarui dalam satu proses.', 'validation')
        const sourceRevision = readSourceRevision(revisionSnapshot.data()) + 1
        const record = branchFromData(current.id, {
          ...current.data(),
          name: command.payload.name,
          normalizedName: command.payload.normalizedName,
          type: command.payload.type,
        })
        const sourceHash = branchSourceHash(record)
        transaction.update(reference, {
          name: command.payload.name,
          normalizedName: command.payload.normalizedName,
          type: command.payload.type,
          updatedAt: FieldValue.serverTimestamp(),
          syncRevision: sourceRevision,
          syncHash: sourceHash,
        })
        memberships.docs.forEach(item => transaction.update(item.ref, {
          branchName: command.payload.name,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actorUid,
        }))
        transaction.set(revisionRef, { entityType: 'branch', entityId: command.payload.branchId, revision: sourceRevision, updatedAt: FieldValue.serverTimestamp() })
        transaction.set(claimRef, { branchId: command.payload.branchId, normalizedNameHash: stableHash(command.payload.normalizedName), updatedAt: FieldValue.serverTimestamp() })
        if (oldClaimRef.path !== claimRef.path && oldClaim.data()?.branchId === command.payload.branchId) transaction.delete(oldClaimRef)
        return this.meta(command, fingerprint, 'branch', command.payload.branchId, [{ kind: 'branch.upsert', id: command.payload.branchId, sourceRevision, sourceHash }])
      }
      case 'branch.remove': {
        const reference = this.db.collection('branches').doc(command.payload.branchId)
        const [current, memberships] = await Promise.all([
          transaction.get(reference),
          transaction.get(this.db.collection('userMemberships').where('branchId', '==', command.payload.branchId).limit(1)),
        ])
        if (!current.exists) throw new DataAccessError('Cabang tidak ditemukan.', 'not-found')
        if (!memberships.empty) throw new DataAccessError('Cabang masih memiliki user.', 'validation')
        const claimRef = this.branchNameClaim(String(current.data()?.normalizedName || ''))
        const revisionRef = this.entityRevision('branch', command.payload.branchId)
        const [claim, revisionSnapshot] = await Promise.all([transaction.get(claimRef), transaction.get(revisionRef)])
        const sourceRevision = readSourceRevision(revisionSnapshot.data()) + 1
        const sourceHash = branchSourceHash({ ...branchFromData(current.id, current.data() || {}), status: 'archived' })
        transaction.delete(reference)
        transaction.set(revisionRef, { entityType: 'branch', entityId: command.payload.branchId, revision: sourceRevision, deleted: true, updatedAt: FieldValue.serverTimestamp() })
        if (claim.data()?.branchId === command.payload.branchId) transaction.delete(claimRef)
        return this.meta(command, fingerprint, 'branch', command.payload.branchId, [{ kind: 'branch.remove', id: command.payload.branchId, sourceRevision, sourceHash }])
      }
      case 'settings.update': {
        const reference = this.db.collection('settings').doc('global')
        const current = await transaction.get(reference)
        const revisionRef = this.entityRevision('settings', 'global')
        const revisionSnapshot = await transaction.get(revisionRef)
        const existing = settingsFromData(current.data() || {})
        const record: GlobalSettingsRecord = { ...existing, ...command.payload.settings, updatedBy: actorUid }
        const sourceRevision = readSourceRevision(revisionSnapshot.data()) + 1
        const sourceHash = settingsSourceHash(record)
        transaction.set(reference, {
          ...command.payload.settings,
          updatedBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
          syncRevision: sourceRevision,
          syncHash: sourceHash,
        }, { merge: true })
        transaction.set(revisionRef, { entityType: 'settings', entityId: 'global', revision: sourceRevision, updatedAt: FieldValue.serverTimestamp() })
        return this.meta(command, fingerprint, 'settings', 'global', [{ kind: 'settings.upsert', id: 'global', sourceRevision, sourceHash }])
      }
    }
  }

  private meta(command: MasterDataCommand, fingerprint: string, entityType: 'branch' | 'settings', entityId: string, projectionMeta: ProjectionMeta[]): OperationMeta {
    const latest = projectionMeta.reduce((result, item) => item.sourceRevision >= result.sourceRevision ? item : result, {
      sourceRevision: 0,
      sourceHash: fingerprint,
    })
    return {
      operationId: command.commandId,
      commandFingerprint: fingerprint,
      entityType,
      entityId,
      sourceRevision: latest.sourceRevision,
      sourceHash: latest.sourceHash,
      projectionMeta,
      replayed: false,
    }
  }

  private entityRevision(entityType: 'branch' | 'settings', entityId: string) {
    return this.db.collection('dataSyncEntityRevisions').doc(`${entityType}__${entityId}`)
  }

  private branchNameClaim(normalizedName: string) {
    return this.db.collection('branchNameClaims').doc(stableHash(normalizedName))
  }

  private async hydrate(meta: OperationMeta): Promise<PrimaryCommandResult> {
    const projections = (await Promise.all(meta.projectionMeta.map(async item => {
      if (item.kind === 'branch.remove') {
        const [snapshot, revisionSnapshot] = await Promise.all([
          this.db.collection('branches').doc(item.id).get(),
          this.entityRevision('branch', item.id).get(),
        ])
        return snapshot.exists || readSourceRevision(revisionSnapshot.data()) !== item.sourceRevision
          ? null
          : { kind: item.kind, id: item.id, sourceRevision: item.sourceRevision, sourceHash: item.sourceHash } satisfies MasterDataProjection
      }
      if (item.kind === 'branch.upsert') {
        const snapshot = await this.db.collection('branches').doc(item.id).get()
        if (!snapshot.exists || snapshot.data()?.syncRevision !== item.sourceRevision || snapshot.data()?.syncHash !== item.sourceHash) return null
        return { kind: item.kind, record: branchFromData(snapshot.id, snapshot.data() || {}), sourceRevision: item.sourceRevision, sourceHash: item.sourceHash } satisfies MasterDataProjection
      }
      const snapshot = await this.db.collection('settings').doc('global').get()
      if (!snapshot.exists || snapshot.data()?.syncRevision !== item.sourceRevision || snapshot.data()?.syncHash !== item.sourceHash) return null
      return { kind: item.kind, record: settingsFromData(snapshot.data() || {}), sourceRevision: item.sourceRevision, sourceHash: item.sourceHash } satisfies MasterDataProjection
    }))).filter((item): item is MasterDataProjection => item !== null)
    return { ...meta, projections }
  }

  async recordMirrorResult(result: PrimaryCommandResult, status: 'skipped' | 'completed' | 'retry-pending' | 'superseded', errorCode?: string) {
    const operationRef = this.db.collection('dataSyncOperations').doc(result.operationId)
    let applied = false
    await this.db.runTransaction(async transaction => {
      const current = await transaction.get(operationRef)
      const currentStatus = current.data()?.mirrorStatus
      if ((currentStatus === 'completed' || currentStatus === 'superseded') && status === 'retry-pending') return
      transaction.set(operationRef, {
        state: status === 'retry-pending' ? 'retry-pending' : status === 'superseded' ? 'superseded' : 'completed',
        mirrorStatus: status,
        attemptCount: FieldValue.increment(status === 'skipped' ? 0 : 1),
        ...(errorCode ? { lastErrorCode: errorCode } : { lastErrorCode: FieldValue.delete() }),
        updatedAt: FieldValue.serverTimestamp(),
        ...(status === 'completed' || status === 'skipped' || status === 'superseded' ? { completedAt: FieldValue.serverTimestamp() } : {}),
      }, { merge: true })
      applied = true
    })
    if (applied && (status === 'completed' || status === 'superseded')) {
      await this.db.collection('dataSyncMismatches').doc(result.operationId).set({
        status: 'resolved',
        resolvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
  }

  async recordMismatch(result: PrimaryCommandResult, errorCode: string) {
    const operationRef = this.db.collection('dataSyncOperations').doc(result.operationId)
    const mismatchRef = this.db.collection('dataSyncMismatches').doc(result.operationId)
    await this.db.runTransaction(async transaction => {
      const operation = await transaction.get(operationRef)
      if (operation.data()?.mirrorStatus === 'completed' || operation.data()?.mirrorStatus === 'superseded') return
      transaction.set(mismatchRef, {
        operationId: result.operationId,
        entityType: result.entityType,
        entityId: result.entityId,
        kind: 'postgres-write-failed',
        differingFields: [],
        status: 'open',
        errorCode,
        detectedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    })
  }
}
