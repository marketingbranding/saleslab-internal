import type { DataAccessError } from '../errors/data-access-error'
import type { BranchRecord } from '../types/records'

export interface BranchSeed {
  id: string
  name: string
  normalizedName: string
  type?: 'KC' | 'KCP'
}

export interface BranchCatalogMarker {
  version: number
  seededAt?: Date
  seededBy?: string
}

export interface BranchRepository {
  listActive(): Promise<BranchRecord[]>
  subscribe(
    callback: (items: BranchRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  subscribeCatalogMarker(
    callback: (marker: BranchCatalogMarker | null) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getById(id: string): Promise<BranchRecord | null>
  save(branch: BranchRecord): Promise<void>
  seedDefaults(input: {
    defaults: readonly BranchSeed[]
    existing: readonly BranchRecord[]
    actorId: string
  }): Promise<{ inserted: number }>
  rename(input: {
    branchId: string
    name: string
    type: 'KC' | 'KCP'
    normalizedName: string
    membershipUserIds: readonly string[]
    actorId: string
  }): Promise<void>
  remove(id: string): Promise<void>
}
