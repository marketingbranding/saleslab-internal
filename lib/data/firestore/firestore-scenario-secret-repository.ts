import { collection, deleteField, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ScenarioSecretRepository } from '../contracts/scenario-secret-repository'
import { toDomainDate } from '../types/dates'
import { toDataAccessError } from './error-mapper'

export class FirestoreScenarioSecretRepository implements ScenarioSecretRepository {
  subscribeAll(callback: Parameters<ScenarioSecretRepository['subscribeAll']>[0], onError?: Parameters<ScenarioSecretRepository['subscribeAll']>[1]) {
    return onSnapshot(query(collection(db, 'scenarioSecrets')), snapshot => {
      const items = Object.fromEntries(snapshot.docs.map(item => {
        const data = item.data()
        return [item.id, {
          scenarioId: item.id,
          hiddenRules: typeof data.hiddenRules === 'string' ? data.hiddenRules : '',
          ...(typeof data.updatedBy === 'string' ? { updatedBy: data.updatedBy } : {}),
          ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
        }]
      }))
      callback(items)
    }, error => onError?.(toDataAccessError(error)))
  }

  async migrateLegacyPublicSecrets(actorId: string) {
    try {
      const snapshot = await getDocs(query(collection(db, 'scenarios')))
      const legacy = snapshot.docs.filter(item => typeof item.data().hiddenRules === 'string' && item.data().hiddenRules)
      await Promise.all(legacy.map(item => runTransaction(db, async transaction => {
        const publicRef = doc(db, 'scenarios', item.id)
        const secretRef = doc(db, 'scenarioSecrets', item.id)
        const publicSnapshot = await transaction.get(publicRef)
        const secretSnapshot = await transaction.get(secretRef)
        if (!publicSnapshot.exists() || !publicSnapshot.data().hiddenRules) return
        if (!secretSnapshot.exists()) {
          transaction.set(secretRef, {
            hiddenRules: String(publicSnapshot.data().hiddenRules),
            updatedAt: serverTimestamp(),
            updatedBy: actorId,
          })
        }
        transaction.update(publicRef, { hiddenRules: deleteField() })
      })))
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
