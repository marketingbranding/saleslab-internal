import { DataAccessError } from '@/lib/data/errors/data-access-error'

const CONFLICT_CODES = new Set(['23505', '40001', '40P01'])
const VALIDATION_CODES = new Set(['22001', '23502', '23503', '23514'])

export function toPostgresDataAccessError(error: unknown) {
  if (error instanceof DataAccessError) return error
  const code = typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : ''
  if (CONFLICT_CODES.has(code)) return new DataAccessError('Data berubah atau sudah tersedia. Muat ulang lalu coba lagi.', 'conflict', error)
  if (VALIDATION_CODES.has(code)) return new DataAccessError('Data yang diberikan tidak valid.', 'validation', error)
  if (code.startsWith('08') || code === '57P01') return new DataAccessError('Layanan data sedang tidak tersedia. Coba lagi nanti.', 'unavailable', error)
  return new DataAccessError('Operasi data gagal.', 'unknown', error)
}
