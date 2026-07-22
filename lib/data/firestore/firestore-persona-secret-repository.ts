import { collection, deleteField, doc, getDocs, onSnapshot, query, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonaSecretRepository } from '../contracts/persona-secret-repository'
import { toDomainDate } from '../types/dates'
import { toDataAccessError } from './error-mapper'

export class FirestorePersonaSecretRepository implements PersonaSecretRepository {
  subscribeAll(callback: Parameters<PersonaSecretRepository['subscribeAll']>[0], onError?: Parameters<PersonaSecretRepository['subscribeAll']>[1]) {
    return onSnapshot(query(collection(db, 'personaSecrets')), snapshot => {
      const items = Object.fromEntries(snapshot.docs.map(item => {
        const data = item.data()
        return [item.id, {
          personaId: item.id,
          hiddenInstructions: typeof data.hiddenInstructions === 'string' ? data.hiddenInstructions : '',
          personaKnowledge: typeof data.personaKnowledge === 'string' ? data.personaKnowledge : '',
          personaUnknowns: typeof data.personaUnknowns === 'string' ? data.personaUnknowns : '',
          ...(typeof data.updatedBy === 'string' ? { updatedBy: data.updatedBy } : {}),
          ...(toDomainDate(data.updatedAt) ? { updatedAt: toDomainDate(data.updatedAt) } : {}),
        }]
      }))
      callback(items)
    }, error => onError?.(toDataAccessError(error)))
  }

  async migrateLegacyPublicSecrets(actorId: string) {
    try {
      const snapshot = await getDocs(query(collection(db, 'personas')))
      const legacy = snapshot.docs.filter(item => {
        const data = item.data()
        return data.hiddenInstructions || data.personaKnowledge || data.personaUnknowns
      })
      await Promise.all(legacy.map(item => runTransaction(db, async transaction => {
        const publicRef = doc(db, 'personas', item.id)
        const secretRef = doc(db, 'personaSecrets', item.id)
        const publicSnapshot = await transaction.get(publicRef)
        const secretSnapshot = await transaction.get(secretRef)
        if (!publicSnapshot.exists()) return
        const data = publicSnapshot.data()
        if (!data.hiddenInstructions && !data.personaKnowledge && !data.personaUnknowns) return
        if (!secretSnapshot.exists()) {
          transaction.set(secretRef, {
            hiddenInstructions: String(data.hiddenInstructions || ''),
            personaKnowledge: String(data.personaKnowledge || ''),
            personaUnknowns: String(data.personaUnknowns || ''),
            updatedAt: serverTimestamp(),
            updatedBy: actorId,
          })
        }
        transaction.update(publicRef, {
          hiddenInstructions: deleteField(),
          personaKnowledge: deleteField(),
          personaUnknowns: deleteField(),
        })
      })))
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
