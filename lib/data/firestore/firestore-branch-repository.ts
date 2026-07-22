import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { BranchRepository } from '../contracts/branch-repository'
import { DataAccessError } from '../errors/data-access-error'
import type { BranchRecord } from '../types/records'
import { toDomainDate } from '../types/dates'
import { toDataAccessError } from './error-mapper'
import { mapBranchDocument } from './mappers'

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
    try {
      await setDoc(doc(db, 'branches', branch.id), {
        id: branch.id,
        name: branch.name,
        ...(branch.type ? { type: branch.type } : {}),
        normalizedName: branch.normalizedName,
        status: branch.status,
        ...(branch.createdBy ? { createdBy: branch.createdBy } : {}),
        createdAt: branch.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async seedDefaults(input: Parameters<BranchRepository['seedDefaults']>[0]) {
    try {
      const existingNames = new Set(input.existing.map(branch => branch.normalizedName))
      const existingIds = new Set(input.existing.map(branch => branch.id))
      const missing = input.defaults.filter(branch => !existingNames.has(branch.normalizedName) && !existingIds.has(branch.id))
      const batch = writeBatch(db)
      missing.forEach(branch => {
        batch.set(doc(db, 'branches', branch.id), {
          ...branch,
          status: 'active',
          createdBy: input.actorId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
      batch.set(doc(db, 'settings', 'branchCatalog'), {
        version: 1,
        seededAt: serverTimestamp(),
        seededBy: input.actorId,
      })
      await batch.commit()
      return { inserted: missing.length }
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async rename(input: Parameters<BranchRepository['rename']>[0]) {
    try {
      if (input.membershipUserIds.length > 499) {
        throw new DataAccessError('Cabang memiliki terlalu banyak user untuk diperbarui dalam satu proses.', 'validation')
      }
      const batch = writeBatch(db)
      batch.update(doc(db, 'branches', input.branchId), {
        name: input.name,
        type: input.type,
        normalizedName: input.normalizedName,
        updatedAt: serverTimestamp(),
      })
      input.membershipUserIds.forEach(userId => {
        batch.update(doc(db, 'userMemberships', userId), {
          branchName: input.name,
          updatedAt: serverTimestamp(),
          updatedBy: input.actorId,
        })
      })
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async remove(id: string) {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'branches', id))
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
