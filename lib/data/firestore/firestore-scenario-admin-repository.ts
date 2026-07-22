import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { ScenarioAdminRepository } from '../contracts/scenario-admin-repository'
import { toDataAccessError } from './error-mapper'
import { scenarioWriteData } from './mappers'

export class FirestoreScenarioAdminRepository implements ScenarioAdminRepository {
  async save(input: Parameters<ScenarioAdminRepository['save']>[0]) {
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'scenarios', input.scenario.id), {
        ...scenarioWriteData(input.scenario),
        id: input.scenario.id,
        ...(auth.currentUser ? { userId: auth.currentUser.uid } : {}),
        createdAt: input.scenario.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      if (input.hiddenRules !== undefined) {
        batch.set(doc(db, 'scenarioSecrets', input.scenario.id), {
          hiddenRules: input.hiddenRules,
          ...(auth.currentUser ? { updatedBy: auth.currentUser.uid } : {}),
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async remove(id: string) {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'scenarios', id))
      batch.delete(doc(db, 'scenarioSecrets', id))
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
