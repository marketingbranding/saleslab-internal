import { DataAccessError, type DataAccessErrorCategory } from '../errors/data-access-error'

const CATEGORY_BY_CODE: Record<string, DataAccessErrorCategory> = {
  'auth/unauthenticated': 'unauthenticated',
  unauthenticated: 'unauthenticated',
  'permission-denied': 'forbidden',
  'not-found': 'not-found',
  'invalid-argument': 'validation',
  'failed-precondition': 'validation',
  'already-exists': 'conflict',
  aborted: 'conflict',
  unavailable: 'unavailable',
  'deadline-exceeded': 'unavailable',
  'resource-exhausted': 'unavailable',
}

export function toDataAccessError(error: unknown): DataAccessError {
  if (error instanceof DataAccessError) return error

  const candidate = error as { code?: unknown; message?: unknown }
  const rawCode = typeof candidate?.code === 'string' ? candidate.code : ''
  const code = rawCode.startsWith('firestore/') ? rawCode.slice('firestore/'.length) : rawCode
  const category = CATEGORY_BY_CODE[code] || 'unknown'
  const message = typeof candidate?.message === 'string' && candidate.message
    ? candidate.message
    : 'Operasi data gagal.'

  return new DataAccessError(message, category, error)
}
