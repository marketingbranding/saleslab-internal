import { auth } from '@/lib/firebase'
import { DataAccessError } from '../errors/data-access-error'
import type { MasterDataCommand, MasterDataCommandResult } from '../master-data-commands'

export function createCommandId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `command-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function sendMasterDataCommand(command: MasterDataCommand): Promise<MasterDataCommandResult> {
  const user = auth.currentUser
  if (!user) throw new DataAccessError('Silakan login untuk melanjutkan.', 'unauthenticated')
  const token = await user.getIdToken()
  let response: Response | undefined
  let networkError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(command),
      })
      if (response.status < 500 || attempt === 1) break
    } catch (error) {
      networkError = error
      if (attempt === 1) break
    }
  }
  if (!response) throw new DataAccessError('Layanan data sedang tidak tersedia. Coba lagi nanti.', 'unavailable', networkError)
  const body = await response.json().catch(() => null) as (MasterDataCommandResult & { error?: string; category?: string }) | null
  if (!response.ok || !body) {
    const category = body?.category === 'forbidden' || body?.category === 'validation' || body?.category === 'conflict'
      ? body.category
      : response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'forbidden' : 'unavailable'
    throw new DataAccessError(body?.error || 'Operasi data gagal.', category)
  }
  return body
}
