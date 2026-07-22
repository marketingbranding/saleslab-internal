import { asc, eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { BranchReader, BranchWriter } from '@/lib/data/contracts/branch-repository'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import * as schema from './schema'
import { branches } from './schema'
import { getPostgresDatabase } from './connection'
import { toPostgresDataAccessError } from './error-mapper'
import { mapBranchRecordToPostgresValues, mapPostgresBranchRow } from './row-mappers'

export class PostgresBranchRepository implements BranchReader, BranchWriter {
  constructor(private readonly db: PostgresJsDatabase<typeof schema> = getPostgresDatabase()) {}

  async listActive() {
    try {
      const rows = await this.db.select().from(branches).where(eq(branches.status, 'active')).orderBy(asc(branches.name))
      return rows.map(mapPostgresBranchRow)
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async getById(id: string) {
    try {
      const [row] = await this.db.select().from(branches).where(eq(branches.id, id)).limit(1)
      return row ? mapPostgresBranchRow(row) : null
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async save(branch: Parameters<BranchWriter['save']>[0]) {
    try {
      const values = mapBranchRecordToPostgresValues(branch)
      await this.db.insert(branches).values(values).onConflictDoUpdate({
        target: branches.id,
        set: {
          name: branch.name,
          normalizedName: branch.normalizedName,
          type: branch.type,
          status: branch.status,
          updatedAt: values.updatedAt,
        },
      })
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async seedDefaults(input: Parameters<BranchWriter['seedDefaults']>[0]) {
    try {
      const existingNames = new Set(input.existing.map(branch => branch.normalizedName))
      const existingIds = new Set(input.existing.map(branch => branch.id))
      const missing = input.defaults.filter(branch => !existingNames.has(branch.normalizedName) && !existingIds.has(branch.id))
      const inserted = await this.db.transaction(async transaction => {
        let count = 0
        for (const branch of missing) {
          const rows = await transaction.insert(branches).values({
            ...branch,
            status: 'active',
            createdBy: input.actorId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing().returning({ id: branches.id })
          count += rows.length
        }
        return count
      })
      return { inserted }
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async rename(input: Parameters<BranchWriter['rename']>[0]) {
    try {
      const rows = await this.db.update(branches).set({
        name: input.name,
        type: input.type,
        normalizedName: input.normalizedName,
        updatedAt: new Date(),
      }).where(eq(branches.id, input.branchId)).returning({ id: branches.id })
      if (rows.length === 0) throw new DataAccessError('Cabang tidak ditemukan.', 'not-found')
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }

  async remove(id: string) {
    try {
      const rows = await this.db.delete(branches).where(eq(branches.id, id)).returning({ id: branches.id })
      if (rows.length === 0) throw new DataAccessError('Cabang tidak ditemukan.', 'not-found')
    } catch (error) {
      throw toPostgresDataAccessError(error)
    }
  }
}
