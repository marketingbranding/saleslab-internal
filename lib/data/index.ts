import type { BranchRepository } from './contracts/branch-repository'
import type { PersonaRepository } from './contracts/persona-repository'
import type { ScenarioRepository } from './contracts/scenario-repository'
import type { SessionRepository } from './contracts/session-repository'
import { FirestoreBranchRepository } from './firestore/firestore-branch-repository'
import { FirestorePersonaRepository } from './firestore/firestore-persona-repository'
import { FirestoreScenarioRepository } from './firestore/firestore-scenario-repository'
import { FirestoreSessionRepository } from './firestore/firestore-session-repository'

let branchRepository: BranchRepository | undefined
let personaRepository: PersonaRepository | undefined
let scenarioRepository: ScenarioRepository | undefined
let sessionRepository: SessionRepository | undefined

export function getBranchRepository(): BranchRepository {
  branchRepository ??= new FirestoreBranchRepository()
  return branchRepository
}

export function getPersonaRepository(): PersonaRepository {
  personaRepository ??= new FirestorePersonaRepository()
  return personaRepository
}

export function getScenarioRepository(): ScenarioRepository {
  scenarioRepository ??= new FirestoreScenarioRepository()
  return scenarioRepository
}

export function getSessionRepository(): SessionRepository {
  sessionRepository ??= new FirestoreSessionRepository()
  return sessionRepository
}

export type * from './contracts/admin-repository'
export type * from './contracts/branch-repository'
export type * from './contracts/membership-repository'
export type * from './contracts/persona-repository'
export type * from './contracts/persona-submission-repository'
export type * from './contracts/scenario-repository'
export type * from './contracts/session-repository'
export type * from './contracts/settings-repository'
export * from './errors/data-access-error'
export type * from './types/records'
