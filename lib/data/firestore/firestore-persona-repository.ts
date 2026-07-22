import { collection, doc, getDoc, getDocs, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonaRepository } from '../contracts/persona-repository'
import { toDataAccessError } from './error-mapper'
import { mapPersonaDocument } from './mappers'

export class FirestorePersonaRepository implements PersonaRepository {
  async listApproved() {
    try {
      const snapshot = await getDocs(query(collection(db, 'personas')))
      return snapshot.docs.map(item => mapPersonaDocument(item.id, item.data())).filter(item => item.status === 'approved')
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribeApproved(callback: Parameters<PersonaRepository['subscribeApproved']>[0], onError?: Parameters<PersonaRepository['subscribeApproved']>[1]) {
    return onSnapshot(query(collection(db, 'personas')), snapshot => {
      callback(snapshot.docs.map(item => mapPersonaDocument(item.id, item.data())).filter(item => item.status === 'approved'))
    }, error => onError?.(toDataAccessError(error)))
  }

  async getById(id: string) {
    try {
      const snapshot = await getDoc(doc(db, 'personas', id))
      return snapshot.exists() ? mapPersonaDocument(snapshot.id, snapshot.data()) : null
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
