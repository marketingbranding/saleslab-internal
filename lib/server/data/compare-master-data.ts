import type { BranchRecord, GlobalSettingsRecord } from '@/lib/data/types/records'

export interface FieldMismatch {
  id: string
  fields: string[]
}

export interface ReconciliationReport {
  missingInPostgres: string[]
  missingInFirestore: string[]
  fieldMismatch: FieldMismatch[]
  timestampMismatch: string[]
  archivedStatusMismatch: string[]
}

function different(left: unknown, right: unknown) {
  return (left ?? null) !== (right ?? null)
}

function timestampDifferent(left?: Date, right?: Date) {
  if (!left && !right) return false
  if (!left || !right) return true
  return left.getTime() !== right.getTime()
}

export function compareBranches(firestore: readonly BranchRecord[], postgres: readonly BranchRecord[]): ReconciliationReport {
  const firestoreById = new Map(firestore.map(item => [item.id, item]))
  const postgresById = new Map(postgres.map(item => [item.id, item]))
  const report: ReconciliationReport = {
    missingInPostgres: [],
    missingInFirestore: [],
    fieldMismatch: [],
    timestampMismatch: [],
    archivedStatusMismatch: [],
  }

  for (const item of firestore) {
    const mirror = postgresById.get(item.id)
    if (!mirror) {
      report.missingInPostgres.push(item.id)
      continue
    }
    const fields = [
      different(item.name, mirror.name) ? 'name' : '',
      different(item.normalizedName, mirror.normalizedName) ? 'normalizedName' : '',
      different(item.type, mirror.type) ? 'type' : '',
    ].filter(Boolean)
    if (fields.length) report.fieldMismatch.push({ id: item.id, fields })
    if (item.status !== mirror.status) report.archivedStatusMismatch.push(item.id)
    if (timestampDifferent(item.updatedAt, mirror.updatedAt)) report.timestampMismatch.push(item.id)
  }
  for (const item of postgres) if (!firestoreById.has(item.id)) report.missingInFirestore.push(item.id)

  report.missingInPostgres.sort()
  report.missingInFirestore.sort()
  report.fieldMismatch.sort((left, right) => left.id.localeCompare(right.id))
  report.timestampMismatch.sort()
  report.archivedStatusMismatch.sort()
  return report
}

export function compareSettings(firestore: GlobalSettingsRecord | null, postgres: GlobalSettingsRecord | null): ReconciliationReport {
  if (!firestore || !postgres) {
    return {
      missingInPostgres: firestore && !postgres ? ['global'] : [],
      missingInFirestore: postgres && !firestore ? ['global'] : [],
      fieldMismatch: [],
      timestampMismatch: [],
      archivedStatusMismatch: [],
    }
  }
  const fields = [
    different(firestore.modelProvider, postgres.modelProvider) ? 'modelProvider' : '',
    different(firestore.geminiModel, postgres.geminiModel) ? 'geminiModel' : '',
    different(firestore.ollamaModel, postgres.ollamaModel) ? 'ollamaModel' : '',
    different(firestore.openRouterModel, postgres.openRouterModel) ? 'openRouterModel' : '',
    different(firestore.thinkingDelay, postgres.thinkingDelay) ? 'thinkingDelay' : '',
    different(firestore.frustrationSensitivity, postgres.frustrationSensitivity) ? 'frustrationSensitivity' : '',
    different(firestore.ollamaUrl, postgres.ollamaUrl) ? 'ollamaUrl' : '',
  ].filter(Boolean)
  return {
    missingInPostgres: [],
    missingInFirestore: [],
    fieldMismatch: fields.length ? [{ id: 'global', fields }] : [],
    timestampMismatch: timestampDifferent(firestore.updatedAt, postgres.updatedAt) ? ['global'] : [],
    archivedStatusMismatch: [],
  }
}

export function reportMismatchCount(report: ReconciliationReport) {
  return new Set([
    ...report.missingInPostgres,
    ...report.missingInFirestore,
    ...report.fieldMismatch.map(item => item.id),
    ...report.timestampMismatch,
    ...report.archivedStatusMismatch,
  ]).size
}
