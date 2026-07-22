import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { closePostgresConnection, getPostgresDatabase } from '@/lib/server/postgres/connection'
import { appSettings, branches } from '@/lib/server/postgres/schema'
import { mapPostgresBranchRow, mapPostgresSettingsRow } from '@/lib/server/postgres/row-mappers'
import { createPostgresMasterDataMirror } from '@/lib/server/postgres/master-data-mirror'
import { getAdminDb } from '@/lib/server/firebase-admin'
import { branchFromData, settingsFromData } from '@/lib/server/data/firestore-master-data-store'
import { branchSourceHash, commandFingerprint, settingsSourceHash, type PrimaryCommandResult } from '@/lib/server/data/master-data-sync'
import { compareBranches, compareSettings, reportMismatchCount, type ReconciliationReport } from '@/lib/server/data/compare-master-data'
import type { MasterDataCommand } from '@/lib/data/master-data-commands'

function option(name: string) {
  const prefix = `--${name}=`
  return process.argv.slice(2).find(item => item.startsWith(prefix))?.slice(prefix.length)
}

function hasFlag(name: string) {
  return process.argv.slice(2).includes(`--${name}`)
}

async function repairBranches(firestoreRecords: Array<{ record: ReturnType<typeof branchFromData>; sourceRevision: number }>, removeIds: string[]) {
  const mirror = createPostgresMasterDataMirror()
  const runId = randomUUID()
  for (const { record, sourceRevision } of firestoreRecords) {
    const sourceHash = branchSourceHash(record)
    const command: MasterDataCommand = { schemaVersion: 1, commandId: `repair-${runId}-${sourceHash.slice(0, 16)}`, type: 'branch.save', payload: { branch: record } }
    const result: PrimaryCommandResult = {
      operationId: command.commandId,
      commandFingerprint: commandFingerprint(command),
      entityType: 'branch',
      entityId: record.id,
      sourceRevision,
      sourceHash,
      projections: [{ kind: 'branch.upsert', record, sourceRevision, sourceHash }],
      replayed: false,
      force: true,
    }
    await mirror.apply(result, record.createdBy || 'migration')
  }
  for (const id of removeIds) {
    const sourceHash = branchSourceHash({ id, name: id, normalizedName: id, status: 'archived' })
    const operationId = `repair-${runId}-remove-${sourceHash.slice(0, 16)}`
    await mirror.apply({
      operationId,
      commandFingerprint: sourceHash,
      entityType: 'branch',
      entityId: id,
      sourceRevision: 2_147_483_647,
      sourceHash,
      projections: [{ kind: 'branch.remove', id, sourceRevision: 2_147_483_647, sourceHash }],
      replayed: false,
      force: true,
    }, 'migration')
  }
}

async function main() {
  const collection = option('collection')
  if (collection !== 'branches' && collection !== 'settings') throw new Error('Use --collection=branches or --collection=settings.')
  const repair = hasFlag('repair')
  if (repair && !hasFlag('confirm-firestore-authoritative')) {
    throw new Error('Repair requires --repair --confirm-firestore-authoritative.')
  }
  if (repair && (!process.env.FIREBASE_PROJECT_ID || option('confirm-project') !== process.env.FIREBASE_PROJECT_ID)) {
    throw new Error('Repair requires --confirm-project=<FIREBASE_PROJECT_ID>.')
  }
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-471779e6-3ac4-400d-910b-6a025a280090'
  if (repair && option('confirm-firestore-database') !== firestoreDatabaseId) {
    throw new Error('Repair requires --confirm-firestore-database=<FIRESTORE_DATABASE_ID>.')
  }
  const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  const postgresTarget = databaseUrl ? `${databaseUrl.hostname}${databaseUrl.port ? `:${databaseUrl.port}` : ''}${databaseUrl.pathname}` : null
  if (repair && (!postgresTarget || option('confirm-postgres-target') !== postgresTarget)) {
    throw new Error('Repair requires --confirm-postgres-target=<host[:port]/database>.')
  }

  const firestoreDb = getAdminDb()
  const postgresDb = getPostgresDatabase()
  let report: ReconciliationReport
  if (collection === 'branches') {
    const [firestoreSnapshot, postgresRows] = await Promise.all([
      firestoreDb.collection('branches').get(),
      postgresDb.select().from(branches),
    ])
    const firestoreRecords = firestoreSnapshot.docs.map(item => ({
      record: branchFromData(item.id, item.data()),
      sourceRevision: typeof item.data().syncRevision === 'number' ? Math.max(1, item.data().syncRevision) : 1,
      validStatus: item.data().status === 'active' || item.data().status === 'archived',
    }))
    const postgresRecords = postgresRows.map(mapPostgresBranchRow)
    report = compareBranches(firestoreRecords.map(item => item.record), postgresRecords)
    firestoreRecords.filter(item => !item.validStatus).forEach(item => {
      const existing = report.fieldMismatch.find(mismatch => mismatch.id === item.record.id)
      if (existing) existing.fields = [...new Set([...existing.fields, 'status'])].sort()
      else report.fieldMismatch.push({ id: item.record.id, fields: ['status'] })
    })
    if (repair && reportMismatchCount(report) > 0) {
      const invalidIds = new Set(firestoreRecords.filter(item => !item.validStatus).map(item => item.record.id))
      const upsertIds = new Set([
        ...report.missingInPostgres,
        ...report.fieldMismatch.map(item => item.id),
        ...report.timestampMismatch,
        ...report.archivedStatusMismatch,
      ].filter(id => !invalidIds.has(id)))
      await repairBranches(
        firestoreRecords.filter(item => upsertIds.has(item.record.id)).map(({ record, sourceRevision }) => ({ record, sourceRevision })),
        report.missingInFirestore,
      )
      report = compareBranches(
        firestoreRecords.map(item => item.record),
        (await postgresDb.select().from(branches)).map(mapPostgresBranchRow),
      )
      firestoreRecords.filter(item => !item.validStatus).forEach(item => {
        const existing = report.fieldMismatch.find(mismatch => mismatch.id === item.record.id)
        if (existing) existing.fields = [...new Set([...existing.fields, 'status'])].sort()
        else report.fieldMismatch.push({ id: item.record.id, fields: ['status'] })
      })
    }
  } else {
    const [firestoreSnapshot, postgresRows] = await Promise.all([
      firestoreDb.collection('settings').doc('global').get(),
      postgresDb.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1),
    ])
    const firestoreData = firestoreSnapshot.data() || {}
    const firestoreRecord = firestoreSnapshot.exists ? settingsFromData(firestoreData) : null
    const postgresRecord = postgresRows[0] ? mapPostgresSettingsRow(postgresRows[0]) : null
    report = compareSettings(firestoreRecord, postgresRecord)
    if (repair && reportMismatchCount(report) > 0) {
      if (!firestoreRecord) {
        await postgresDb.delete(appSettings).where(eq(appSettings.id, 'global'))
      } else {
        const sourceRevision = typeof firestoreData.syncRevision === 'number' ? Math.max(1, firestoreData.syncRevision) : 1
        const sourceHash = settingsSourceHash(firestoreRecord)
        const operationId = `repair-${randomUUID()}-settings`
        await createPostgresMasterDataMirror().apply({
          operationId,
          commandFingerprint: sourceHash,
          entityType: 'settings',
          entityId: 'global',
          sourceRevision,
          sourceHash,
          projections: [{ kind: 'settings.upsert', record: firestoreRecord, sourceRevision, sourceHash }],
          replayed: false,
          force: true,
        }, firestoreRecord.updatedBy || 'migration')
      }
      const repairedRows = await postgresDb.select().from(appSettings).where(eq(appSettings.id, 'global')).limit(1)
      report = compareSettings(firestoreRecord, repairedRows[0] ? mapPostgresSettingsRow(repairedRows[0]) : null)
    }
  }

  console.log(JSON.stringify({ collection, repaired: repair, mismatchCount: reportMismatchCount(report), report }, null, 2))
  if (reportMismatchCount(report) > 0) process.exitCode = 2
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Comparison failed.')
    process.exitCode = 1
  })
  .finally(closePostgresConnection)
