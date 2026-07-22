import type { DataAccessError } from '../errors/data-access-error'
import type { RoleplaySessionRecord } from '../types/records'

export interface SessionRepository {
  listForUser(userId: string): Promise<RoleplaySessionRecord[]>
  subscribeForUser(
    userId: string,
    callback: (sessions: RoleplaySessionRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getById(id: string): Promise<RoleplaySessionRecord | null>
}
