import { collection, doc, getDoc, getDocs, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PersonaRepository } from '../contracts/persona-repository'
import { toDataAccessError } from './error-mapper'
import { mapPersonaDocument } from './mappers'

export function mapApprovedPersonaDocuments(items: ReadonlyArray<{ id: string; data(): unknown }>) {
  return items.map(item => mapPersonaDocument(item.id, item.data())).filter(item => item.status === 'approved')
}

export class FirestorePersonaRepository implements PersonaRepository {
  async listApproved() {
    try {
      const snapshot = await getDocs(query(collection(db, 'personas')))
      return mapApprovedPersonaDocuments(snapshot.docs)
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribeApproved(callback: Parameters<PersonaRepository['subscribeApproved']>[0], onError?: Parameters<PersonaRepository['subscribeApproved']>[1]) {
    return onSnapshot(query(collection(db, 'personas')), snapshot => {
      callback(mapApprovedPersonaDocuments(snapshot.docs))
    }, error => onError?.(toDataAccessError(error)))
  }

  async getById(id: string) {
    try {
      const snapshot = await getDoc(doc(db, 'personas', id))
      if (!snapshot.exists()) return null
      const persona = mapPersonaDocument(snapshot.id, snapshot.data())
      return persona.status === 'approved' ? persona : null
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
