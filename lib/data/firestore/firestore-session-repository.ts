import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SessionRepository } from '../contracts/session-repository'
import { toDataAccessError } from './error-mapper'
import { mapSessionDocument } from './mappers'

export class FirestoreSessionRepository implements SessionRepository {
  async listForUser(userId: string) {
    try {
      const snapshot = await getDocs(query(collection(db, 'sessions'), where('userId', '==', userId)))
      return snapshot.docs.map(item => mapSessionDocument(item.id, item.data()))
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  subscribeForUser(userId: string, callback: Parameters<SessionRepository['subscribeForUser']>[1], onError?: Parameters<SessionRepository['subscribeForUser']>[2]) {
    return onSnapshot(query(collection(db, 'sessions'), where('userId', '==', userId)), snapshot => {
      callback(snapshot.docs.map(item => mapSessionDocument(item.id, item.data())))
    }, error => onError?.(toDataAccessError(error)))
  }

  async getById(id: string) {
    try {
      const snapshot = await getDoc(doc(db, 'sessions', id))
      return snapshot.exists() ? mapSessionDocument(snapshot.id, snapshot.data()) : null
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
