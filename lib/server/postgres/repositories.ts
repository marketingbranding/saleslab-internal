import { getPostgresDatabase } from './connection'
import { PostgresBranchRepository } from './postgres-branch-repository'
import { PostgresSettingsRepository } from './postgres-settings-repository'

export function createPostgresRepositories() {
  const db = getPostgresDatabase()
  return {
    branches: new PostgresBranchRepository(db),
    settings: new PostgresSettingsRepository(db),
  }
}
