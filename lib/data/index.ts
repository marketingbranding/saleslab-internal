import type { BranchRepository } from './contracts/branch-repository'
import type { PersonaRepository } from './contracts/persona-repository'
import type { ScenarioRepository } from './contracts/scenario-repository'
import type { ScenarioAdminRepository } from './contracts/scenario-admin-repository'
import type { ScenarioSecretRepository } from './contracts/scenario-secret-repository'
import type { SessionRepository } from './contracts/session-repository'
import type { PersonaAdminRepository } from './contracts/persona-admin-repository'
import type { PersonaSecretRepository } from './contracts/persona-secret-repository'
import type { SettingsRepository } from './contracts/settings-repository'
import { FirestoreBranchRepository } from './firestore/firestore-branch-repository'
import { FirestorePersonaRepository } from './firestore/firestore-persona-repository'
import { FirestoreScenarioRepository } from './firestore/firestore-scenario-repository'
import { FirestoreScenarioAdminRepository } from './firestore/firestore-scenario-admin-repository'
import { FirestoreScenarioSecretRepository } from './firestore/firestore-scenario-secret-repository'
import { FirestoreSessionRepository } from './firestore/firestore-session-repository'
import { FirestorePersonaAdminRepository } from './firestore/firestore-persona-admin-repository'
import { FirestorePersonaSecretRepository } from './firestore/firestore-persona-secret-repository'
import { FirestoreSettingsRepository } from './firestore/firestore-settings-repository'

let branchRepository: BranchRepository | undefined
let personaRepository: PersonaRepository | undefined
let scenarioRepository: ScenarioRepository | undefined
let scenarioAdminRepository: ScenarioAdminRepository | undefined
let scenarioSecretRepository: ScenarioSecretRepository | undefined
let sessionRepository: SessionRepository | undefined
let personaAdminRepository: PersonaAdminRepository | undefined
let personaSecretRepository: PersonaSecretRepository | undefined
let settingsRepository: SettingsRepository | undefined

export function getBranchRepository(): BranchRepository {
  branchRepository ??= new FirestoreBranchRepository()
  return branchRepository
}

export function getPersonaRepository(): PersonaRepository {
  personaRepository ??= new FirestorePersonaRepository()
  return personaRepository
}

export function getPersonaAdminRepository(): PersonaAdminRepository {
  personaAdminRepository ??= new FirestorePersonaAdminRepository()
  return personaAdminRepository
}

export function getPersonaSecretRepository(): PersonaSecretRepository {
  personaSecretRepository ??= new FirestorePersonaSecretRepository()
  return personaSecretRepository
}

export function getScenarioRepository(): ScenarioRepository {
  scenarioRepository ??= new FirestoreScenarioRepository()
  return scenarioRepository
}

export function getScenarioAdminRepository(): ScenarioAdminRepository {
  scenarioAdminRepository ??= new FirestoreScenarioAdminRepository()
  return scenarioAdminRepository
}

export function getScenarioSecretRepository(): ScenarioSecretRepository {
  scenarioSecretRepository ??= new FirestoreScenarioSecretRepository()
  return scenarioSecretRepository
}

export function getSessionRepository(): SessionRepository {
  sessionRepository ??= new FirestoreSessionRepository()
  return sessionRepository
}

export function getSettingsRepository(): SettingsRepository {
  settingsRepository ??= new FirestoreSettingsRepository()
  return settingsRepository
}

export type * from './contracts/admin-repository'
export type * from './contracts/branch-repository'
export type * from './contracts/membership-repository'
export type * from './contracts/persona-repository'
export type * from './contracts/persona-submission-repository'
export type * from './contracts/scenario-repository'
export type * from './contracts/scenario-admin-repository'
export type * from './contracts/scenario-secret-repository'
export type * from './contracts/session-repository'
export type * from './contracts/settings-repository'
export type * from './contracts/persona-admin-repository'
export type * from './contracts/persona-secret-repository'
export * from './errors/data-access-error'
export type * from './types/records'
export * from './normalizers/persona'
export * from './normalizers/scenario'
