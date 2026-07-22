import { doc, runTransaction, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { submissionToPersonaData, toPersonaPublicData, type PersonaData, type PersonaSubmission } from '@/lib/personas'
import type { PersonaAdminRepository } from '../contracts/persona-admin-repository'
import { toDataAccessError } from './error-mapper'
import { DataAccessError } from '../errors/data-access-error'

export class FirestorePersonaAdminRepository implements PersonaAdminRepository {
  async save(input: Parameters<PersonaAdminRepository['save']>[0]) {
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'personas', input.persona.id), {
        ...input.persona,
        id: input.persona.id,
        createdAt: input.persona.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'personaSecrets', input.persona.id), {
        ...input.secrets,
        updatedAt: serverTimestamp(),
        updatedBy: input.actorId,
      })
      await batch.commit()
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async archive(id: string) {
    try {
      await setDoc(doc(db, 'personas', id), {
        status: 'archived',
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (error) {
      throw toDataAccessError(error)
    }
  }

  async approveSubmission(input: Parameters<PersonaAdminRepository['approveSubmission']>[0]) {
    try {
      await runTransaction(db, async transaction => {
        const personaRef = doc(db, 'personas', input.personaId)
        const secretRef = doc(db, 'personaSecrets', input.personaId)
        const submissionRef = doc(db, 'personaSubmissions', input.submissionId)
        const currentSubmissionSnapshot = await transaction.get(submissionRef)
        const existing = await transaction.get(personaRef)
        if (!currentSubmissionSnapshot.exists()) throw new DataAccessError('Submission tidak ditemukan.', 'not-found')
        const currentSubmission = { id: currentSubmissionSnapshot.id, ...currentSubmissionSnapshot.data() } as PersonaSubmission
        if (currentSubmission.status !== 'pending') throw new DataAccessError('Submission ini sudah direview.', 'conflict')
        const existingData = existing.exists() ? existing.data() as PersonaData : null
        if (!currentSubmission.targetPersonaId && existing.exists()) throw new DataAccessError('ID persona sudah digunakan.', 'conflict')
        if (currentSubmission.targetPersonaId && (!existingData || existingData.creatorUid !== currentSubmission.creatorUid)) {
          throw new DataAccessError('Target revisi persona tidak valid.', 'validation')
        }
        const base = submissionToPersonaData(currentSubmission)
        transaction.set(personaRef, {
          ...toPersonaPublicData({ ...base, ...input.reviewedPersona, id: input.personaId }),
          id: input.personaId,
          status: 'approved',
          version: (existingData?.version || 0) + 1,
          sourceSubmissionId: currentSubmission.id,
          creatorUid: currentSubmission.creatorUid,
          creatorName: currentSubmission.creatorName,
          creatorEmail: currentSubmission.creatorEmail,
          creatorBranchId: currentSubmission.creatorBranchId,
          creatorBranchName: currentSubmission.creatorBranchName,
          createdBy: existingData?.createdBy || currentSubmission.creatorUid,
          createdAt: existingData?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          approvedAt: serverTimestamp(),
          approvedBy: input.approverId,
        })
        transaction.set(secretRef, {
          hiddenInstructions: input.reviewedPersona.hiddenInstructions,
          personaKnowledge: input.reviewedPersona.personaKnowledge,
          personaUnknowns: input.reviewedPersona.personaUnknowns,
          updatedAt: serverTimestamp(),
          updatedBy: input.approverId,
        })
        transaction.update(submissionRef, {
          status: 'approved',
          targetPersonaId: input.personaId,
          reviewedAt: serverTimestamp(),
          reviewedByUid: input.approverId,
          reviewedByName: input.approverName,
          updatedAt: serverTimestamp(),
        })
      })
    } catch (error) {
      throw toDataAccessError(error)
    }
  }
}
