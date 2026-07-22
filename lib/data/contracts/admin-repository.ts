import type { DataAccessError } from '../errors/data-access-error'
import type { AdminGrantRecord } from '../types/records'

export interface AdminRepository {
  subscribeForUser(
    userId: string,
    callback: (grant: AdminGrantRecord | null) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getByUserId(userId: string): Promise<AdminGrantRecord | null>
}
