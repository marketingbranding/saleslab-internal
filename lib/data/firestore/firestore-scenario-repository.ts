import { collection, doc, getDoc, getDocs, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ScenarioListOptions, ScenarioRepository } from '../contracts/scenario-repository'
import type { ScenarioRecord } from '../types/records'
import { toDataAccessError } from './error-mapper'
import { mapScenarioDocument } from './mappers'

function visible(items: ScenarioRecord[], options?: ScenarioListOptions) {
  return options?.includeArchived ? items : items.filter(item => item.status !== 'archived')
}

export class FirestoreScenarioRepository implements ScenarioRepository {
  async list(options?: ScenarioListOptions) {
    try {
      const snapshot = await getDocs(query(collection(db, 'scenarios')))
      return visible(snapshot.docs.map(item => mapScenarioDocument(item.id, item.data())), options)
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribe(options: ScenarioListOptions, callback: (items: ScenarioRecord[]) => void, onError?: Parameters<ScenarioRepository['subscribe']>[2]) {
    return onSnapshot(query(collection(db, 'scenarios')), snapshot => {
      callback(visible(snapshot.docs.map(item => mapScenarioDocument(item.id, item.data())), options))
    }, error => onError?.(toDataAccessError(error)))
  }

  async getById(id: string) {
    try {
      const snapshot = await getDoc(doc(db, 'scenarios', id))
      return snapshot.exists() ? mapScenarioDocument(snapshot.id, snapshot.data()) : null
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

}
