import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { AuthenticationError, verifyRequestAuth } from '@/lib/server/auth'
import { getAdminDb } from '@/lib/server/firebase-admin'
import { rateLimitFromEnv } from '@/lib/server/rate-limit'
import { readJsonBody, RequestBodyError } from '@/lib/server/request-body'
import { ANALYZE_LIMITS, AnalyzeValidationError, validateAnalyzeRequest } from '@/lib/validation/analyze'
import {
  LegacyEvaluationInputError,
  reconstructLegacyEvaluationInput,
} from '@/lib/sos/evaluation/legacy-input'
import { compileTrialEvaluationPrompt } from '@/lib/sos/evaluation/prompt'
import { normalizeTrialEvaluationResult } from '@/lib/sos/evaluation/result-normalizer'
import {
  EvaluationProvidersExhaustedError,
  runEvaluationProviders,
} from '@/lib/sos/evaluation/providers'

const analyzeRateLimiter = rateLimitFromEnv('analyze', 'ANALYZE', { limit: 10, windowSeconds: 60 })
const PROCESSING_LEASE_MS = 2 * 60 * 1000

class SessionConflictError extends Error {
  constructor(message: string, readonly retryAfterSeconds?: number) {
    super(message)
  }
}

function extractJson(content: string): unknown {
  const cleaned = content.replace(/```json|```/gi, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) throw new Error('INVALID_MODEL_JSON')
    return JSON.parse(cleaned.slice(start, end + 1))
  }
}

function errorResponse(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers })
}

function inputDigest(input: {
  scenario: Record<string, unknown>
  transcript: Array<{ role: string; text: string }>
  salespersonName: string
  personaVersion?: number
}) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export async function POST(request: NextRequest) {
  let authToken
  try {
    authToken = await verifyRequestAuth(request)
  } catch (error) {
    if (error instanceof AuthenticationError) return errorResponse(error.message, 401)
    return errorResponse('Autentikasi gagal.', 401)
  }

  const rateLimit = await analyzeRateLimiter.consume(authToken.uid)
  if (!rateLimit.allowed) {
    return errorResponse('Terlalu banyak permintaan analisis. Coba lagi sebentar.', 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds),
    })
  }

  let rawBody: unknown
  try {
    rawBody = await readJsonBody(request, ANALYZE_LIMITS.maxBodyBytes)
  } catch (error) {
    return errorResponse(error instanceof RequestBodyError ? error.message : 'Body request tidak valid.', 400)
  }

  let body
  try {
    body = validateAnalyzeRequest(rawBody)
  } catch (error) {
    if (error instanceof AnalyzeValidationError) return errorResponse(error.message, 400)
    return errorResponse('Data skenario atau transkrip tidak valid.', 400)
  }

  let reconstructed
  try {
    reconstructed = reconstructLegacyEvaluationInput({
      scenario: body.scenario,
      transcript: body.transcript,
    })
  } catch (error) {
    if (error instanceof LegacyEvaluationInputError) return errorResponse('Data skenario atau transkrip tidak valid.', 400)
    console.error('Evaluation reconstruction failed', { name: error instanceof Error ? error.name : 'UnknownError' })
    return errorResponse('Data skenario atau transkrip tidak valid.', 400)
  }

  const groqKey = process.env.GROQ_API_KEY
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!groqKey && !nvidiaKey && !geminiKey) {
    console.error('No analysis provider key is configured')
    return errorResponse('Server analisis belum dikonfigurasi.', 500)
  }

  const db = getAdminDb()
  const sessionRef = db.collection('sessions').doc(body.sessionId)
  const digest = inputDigest({
    scenario: body.scenario,
    transcript: body.transcript,
    salespersonName: body.salespersonName,
    ...(body.personaVersion ? { personaVersion: body.personaVersion } : {}),
  })
  const now = Timestamp.now()
  let attempt = 1
  let cachedFeedback: unknown

  try {
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(sessionRef)
      if (snapshot.exists) {
        const current = snapshot.data() || {}
        if (current.userId !== authToken.uid) throw new SessionConflictError('Session dimiliki user lain.')
        if (current.inputDigest !== digest) throw new SessionConflictError('Data session tidak cocok dengan request awal.')
        if (current.analysisStatus === 'completed' && current.feedback) {
          cachedFeedback = current.feedback
          return
        }
        const updatedAt = current.updatedAt instanceof Timestamp ? current.updatedAt.toMillis() : 0
        if (current.analysisStatus === 'processing' && Date.now() - updatedAt < PROCESSING_LEASE_MS) {
          const retryAfterSeconds = Math.max(1, Math.ceil((PROCESSING_LEASE_MS - (Date.now() - updatedAt)) / 1000))
          throw new SessionConflictError('Analisis session ini masih berjalan.', retryAfterSeconds)
        }
        attempt = Number(current.analysisAttempt || 0) + 1
        transaction.update(sessionRef, {
          analysisStatus: 'processing',
          analysisAttempt: attempt,
          analysisError: FieldValue.delete(),
          updatedAt: now,
        })
        return
      }

      transaction.create(sessionRef, {
        scenarioId: body.scenario.id,
        salespersonName: body.salespersonName,
        transcript: body.transcript,
        userId: authToken.uid,
        score: 0,
        analysisStatus: 'processing',
        analysisAttempt: attempt,
        transcriptQuality: body.transcript.length < 3 ? 'partial' : 'complete',
        inputDigest: digest,
        createdAt: now,
        updatedAt: now,
        ...(typeof body.scenario.personaId === 'string' ? { personaId: body.scenario.personaId } : {}),
        ...(body.personaVersion ? { personaVersion: body.personaVersion } : {}),
      })
    })
  } catch (error) {
    if (error instanceof SessionConflictError) {
      return errorResponse(error.message, 409, error.retryAfterSeconds ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined)
    }
    console.error('Session initialization failed', { name: error instanceof Error ? error.name : 'UnknownError' })
    return errorResponse('Session analisis gagal dibuat.', 500)
  }

  if (cachedFeedback) return NextResponse.json(cachedFeedback)

  const markFailed = async (message: string) => {
    try {
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(sessionRef)
        const current = snapshot.data()
        if (!snapshot.exists || current?.userId !== authToken.uid || current?.analysisAttempt !== attempt || current?.analysisStatus !== 'processing') return
        transaction.update(sessionRef, {
          analysisStatus: 'failed',
          analysisError: message,
          updatedAt: Timestamp.now(),
        })
      })
    } catch (error) {
      console.error('Session failure state could not be saved', { name: error instanceof Error ? error.name : 'UnknownError' })
    }
  }

  const prompt = compileTrialEvaluationPrompt({ context: reconstructed.context })
  try {
    const providerResult = await runEvaluationProviders({
      prompt,
      groqKey,
      nvidiaKey,
      geminiKey,
      nvidiaModel: process.env.NVIDIA_NIM_MODEL || undefined,
      parse: extractJson,
      onFailure: failure => {
        console.error('Evaluator provider failed', {
          provider: failure.provider,
          code: failure.code,
          status: failure.status,
        })
      },
    })
    const analysis = normalizeTrialEvaluationResult(providerResult.result, reconstructed.context, {
      provider: providerResult.provider,
    })

    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(sessionRef)
      const current = snapshot.data()
      if (!snapshot.exists || current?.userId !== authToken.uid || current?.analysisAttempt !== attempt || current?.analysisStatus !== 'processing') {
        throw new SessionConflictError('Session berubah sebelum analisis selesai.')
      }
      transaction.update(sessionRef, {
        score: analysis.overallScore,
        feedback: analysis,
        analysisStatus: 'completed',
        analysisProvider: providerResult.provider,
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    })
    return NextResponse.json(analysis)
  } catch (error) {
    if (error instanceof SessionConflictError) return errorResponse(error.message, 409)
    if (error instanceof EvaluationProvidersExhaustedError) {
      const message = 'Analisis belum tersedia setelah mencoba seluruh server AI. Tunggu sekitar 20 detik lalu coba sekali lagi.'
      await markFailed(message)
      return errorResponse(message, 503, { 'Retry-After': '20' })
    }
    console.error('Evaluator processing failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Error && error.message === 'INVALID_MODEL_JSON'
        ? 'INVALID_MODEL_JSON'
        : 'PROVIDER_OR_PROCESSING_ERROR',
    })
    const message = 'Gagal menganalisis performa. Silakan coba lagi.'
    await markFailed(message)
    return errorResponse(message, 500)
  }
}
