import type { DataAccessError } from '../errors/data-access-error'
import type { MembershipRecord } from '../types/records'

export interface MembershipRepository {
  subscribeForUser(
    userId: string,
    callback: (membership: MembershipRecord | null) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  subscribeAll(
    callback: (memberships: MembershipRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getByUserId(userId: string): Promise<MembershipRecord | null>
}
