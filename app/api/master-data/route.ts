import { NextRequest, NextResponse } from 'next/server'
import { DataAccessError } from '@/lib/data/errors/data-access-error'
import { resolveDataBackend, DataBackendConfigurationError } from '@/lib/server/data/backend'
import { FirestoreMasterDataStore } from '@/lib/server/data/firestore-master-data-store'
import { executeMasterDataCommand } from '@/lib/server/data/master-data-sync'
import { AuthenticationError, verifyRequestAuth } from '@/lib/server/auth'
import { readJsonBody, RequestBodyError } from '@/lib/server/request-body'
import { MasterDataCommandValidationError, validateMasterDataCommand } from '@/lib/validation/master-data-command'

export const runtime = 'nodejs'

function errorResponse(message: string, status: number, category: string) {
  return NextResponse.json({ error: message, category }, { status })
}

export async function POST(request: NextRequest) {
  let token
  try {
    token = await verifyRequestAuth(request)
  } catch (error) {
    return errorResponse(error instanceof AuthenticationError ? error.message : 'Autentikasi gagal.', 401, 'unauthenticated')
  }

  let command
  try {
    command = validateMasterDataCommand(await readJsonBody(request, 20_000))
  } catch (error) {
    const message = error instanceof MasterDataCommandValidationError || error instanceof RequestBodyError
      ? error.message
      : 'Perintah data tidak valid.'
    return errorResponse(message, 400, 'validation')
  }

  try {
    const result = await executeMasterDataCommand({
      backend: resolveDataBackend(),
      command,
      actorUid: token.uid,
      authoritative: new FirestoreMasterDataStore(),
      loadMirror: async () => {
        const mirrorModule = await import('@/lib/server/postgres/master-data-mirror')
        return mirrorModule.createPostgresMasterDataMirror()
      },
    })
    return NextResponse.json(result, { status: result.mirror === 'retry-pending' ? 202 : 200 })
  } catch (error) {
    if (error instanceof DataBackendConfigurationError) return errorResponse(error.message, 500, 'configuration')
    if (error instanceof DataAccessError) {
      const status = error.category === 'forbidden' ? 403
        : error.category === 'not-found' ? 404
        : error.category === 'conflict' ? 409
        : error.category === 'validation' ? 400
        : 503
      return errorResponse(error.message, status, error.category)
    }
    return errorResponse('Operasi data gagal.', 503, 'unavailable')
  }
}
