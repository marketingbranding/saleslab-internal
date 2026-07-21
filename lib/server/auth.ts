import type { DecodedIdToken } from 'firebase-admin/auth'
import { getAdminAuth } from './firebase-admin'

export class AuthenticationError extends Error {
  constructor(message = 'Autentikasi diperlukan.') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export function extractBearerToken(authorization: string | null): string {
  if (!authorization) throw new AuthenticationError()
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i)
  if (!match) throw new AuthenticationError('Token autentikasi tidak valid.')
  return match[1]
}

export async function verifyRequestAuth(request: Request): Promise<DecodedIdToken> {
  const token = extractBearerToken(request.headers.get('authorization'))
  try {
    return await getAdminAuth().verifyIdToken(token, true)
  } catch {
    throw new AuthenticationError('Token autentikasi tidak valid atau sudah kedaluwarsa.')
  }
}
