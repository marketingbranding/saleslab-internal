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

const MESSAGE_BY_CATEGORY: Record<DataAccessErrorCategory, string> = {
  unauthenticated: 'Silakan login untuk melanjutkan.',
  forbidden: 'Anda tidak memiliki izin untuk tindakan ini.',
  'not-found': 'Data yang diminta tidak ditemukan.',
  validation: 'Data yang diberikan tidak valid.',
  conflict: 'Data berubah atau sudah tersedia. Muat ulang lalu coba lagi.',
  unavailable: 'Layanan data sedang tidak tersedia. Coba lagi nanti.',
  unknown: 'Operasi data gagal.',
}

export function toDataAccessError(error: unknown): DataAccessError {
  if (error instanceof DataAccessError) return error

  const candidate = error as { code?: unknown; message?: unknown }
  const rawCode = typeof candidate?.code === 'string' ? candidate.code : ''
  const code = rawCode.startsWith('firestore/') ? rawCode.slice('firestore/'.length) : rawCode
  const category = CATEGORY_BY_CODE[code] || 'unknown'
  return new DataAccessError(MESSAGE_BY_CATEGORY[category], category, error)
}
