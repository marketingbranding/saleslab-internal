import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { ScenarioListOptions, ScenarioRepository } from '../contracts/scenario-repository'
import type { ScenarioRecord } from '../types/records'
import { toDataAccessError } from './error-mapper'
import { mapScenarioDocument, scenarioWriteData } from './mappers'

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

  subscribe(callback: (items: ScenarioRecord[]) => void, onError?: Parameters<ScenarioRepository['subscribe']>[1]) {
    return onSnapshot(query(collection(db, 'scenarios')), snapshot => {
      callback(visible(snapshot.docs.map(item => mapScenarioDocument(item.id, item.data()))))
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

  async save(scenario: ScenarioRecord) {
    const batch = writeBatch(db)
    batch.set(doc(db, 'scenarios', scenario.id), {
      ...scenarioWriteData(scenario),
      id: scenario.id,
      ...(auth.currentUser ? { userId: auth.currentUser.uid } : {}),
      updatedAt: serverTimestamp(),
    })
    if (Object.prototype.hasOwnProperty.call(scenario, 'hiddenRules')) {
      batch.set(doc(db, 'scenarioSecrets', scenario.id), {
        hiddenRules: scenario.hiddenRules || '',
        ...(auth.currentUser ? { updatedBy: auth.currentUser.uid } : {}),
        updatedAt: serverTimestamp(),
      })
    }
    try {
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async remove(id: string) {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'scenarios', id))
    batch.delete(doc(db, 'scenarioSecrets', id))
    try {
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
