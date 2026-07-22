import type { BranchRecord, GlobalSettingsRecord } from './types/records'
import type { BranchSeed } from './contracts/branch-repository'

interface CommandBase {
  schemaVersion: 1
  commandId: string
}

export type MasterDataCommand =
  | CommandBase & { type: 'branch.save'; payload: { branch: BranchRecord } }
  | CommandBase & { type: 'branch.seed'; payload: { defaults: BranchSeed[] } }
  | CommandBase & { type: 'branch.rename'; payload: { branchId: string; name: string; type: 'KC' | 'KCP'; normalizedName: string } }
  | CommandBase & { type: 'branch.remove'; payload: { branchId: string } }
  | CommandBase & { type: 'settings.update'; payload: { settings: Partial<GlobalSettingsRecord> } }

export interface MasterDataCommandResult {
  outcome: 'committed' | 'primary-committed'
  operationId: string
  entityType: 'branch' | 'settings'
  entityId: string
  sourceRevision: number
  mirror: 'skipped' | 'completed' | 'retry-pending' | 'superseded'
  replayed: boolean
  affected: number
}
