import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BranchRepository } from '../contracts/branch-repository'
import type { BranchRecord } from '../types/records'
import { toDomainDate } from '../types/dates'
import { toDataAccessError } from './error-mapper'
import { mapBranchDocument } from './mappers'
import { createCommandId, sendMasterDataCommand } from '../client/master-data-command'

export class FirestoreBranchRepository implements BranchRepository {
  async listActive() {
    try {
      const snapshot = await getDocs(query(collection(db, 'branches')))
      return snapshot.docs.map(item => mapBranchDocument(item.id, item.data())).filter(item => item.status === 'active')
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribe(callback: (items: BranchRecord[]) => void, onError?: Parameters<BranchRepository['subscribe']>[1]) {
    return onSnapshot(query(collection(db, 'branches')), snapshot => {
      callback(snapshot.docs.map(item => mapBranchDocument(item.id, item.data())))
    }, error => onError?.(toDataAccessError(error)))
  }

  subscribeCatalogMarker(callback: Parameters<BranchRepository['subscribeCatalogMarker']>[0], onError?: Parameters<BranchRepository['subscribeCatalogMarker']>[1]) {
    return onSnapshot(doc(db, 'settings', 'branchCatalog'), snapshot => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }
      const data = snapshot.data()
      callback({
        version: typeof data.version === 'number' ? data.version : 0,
        ...(toDomainDate(data.seededAt) ? { seededAt: toDomainDate(data.seededAt) } : {}),
        ...(typeof data.seededBy === 'string' ? { seededBy: data.seededBy } : {}),
      })
    }, error => onError?.(toDataAccessError(error)))
  }

  async getById(id: string) {
    try {
      const snapshot = await getDoc(doc(db, 'branches', id))
      return snapshot.exists() ? mapBranchDocument(snapshot.id, snapshot.data()) : null
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async save(branch: BranchRecord) {
    await sendMasterDataCommand({ schemaVersion: 1, commandId: createCommandId(), type: 'branch.save', payload: { branch } })
  }

  async seedDefaults(input: Parameters<BranchRepository['seedDefaults']>[0]) {
    const result = await sendMasterDataCommand({
      schemaVersion: 1,
      commandId: createCommandId(),
      type: 'branch.seed',
      payload: { defaults: [...input.defaults] },
    })
    return { inserted: result.affected }
  }

  async rename(input: Parameters<BranchRepository['rename']>[0]) {
    await sendMasterDataCommand({
      schemaVersion: 1,
      commandId: createCommandId(),
      type: 'branch.rename',
      payload: { branchId: input.branchId, name: input.name, type: input.type, normalizedName: input.normalizedName },
    })
  }

  async remove(id: string) {
    await sendMasterDataCommand({ schemaVersion: 1, commandId: createCommandId(), type: 'branch.remove', payload: { branchId: id } })
  }
}
