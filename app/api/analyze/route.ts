import { NextRequest, NextResponse } from 'next/server'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function invalidRequestResponse() {
  return NextResponse.json(
    { error: 'Data skenario atau transkrip tidak valid.' },
    { status: 400 }
  )
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalidRequestResponse()
  }
  if (!isRecord(body)) return invalidRequestResponse()

  let reconstructed
  try {
    reconstructed = reconstructLegacyEvaluationInput({
      scenario: body.scenario,
      transcript: body.transcript,
    })
  } catch (error) {
    if (error instanceof LegacyEvaluationInputError) return invalidRequestResponse()
    console.error('Evaluation reconstruction failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    })
    return invalidRequestResponse()
  }

  const groqKey = process.env.GROQ_API_KEY
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!groqKey && !nvidiaKey && !geminiKey) {
    console.error('No analysis provider key is configured')
    return NextResponse.json(
      { error: 'Analysis provider is not configured.' },
      { status: 500 }
    )
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
    const analysis = normalizeTrialEvaluationResult(
      providerResult.result,
      reconstructed.context,
      { provider: providerResult.provider }
    )
    return NextResponse.json(analysis)
  } catch (error) {
    if (error instanceof EvaluationProvidersExhaustedError) {
      return NextResponse.json(
        { error: 'Analisis belum tersedia setelah mencoba seluruh server AI. Tunggu sekitar 20 detik lalu coba sekali lagi.' },
        { status: 503, headers: { 'Retry-After': '20' } }
      )
    }
    console.error('Evaluator processing failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Error && error.message === 'INVALID_MODEL_JSON'
        ? 'INVALID_MODEL_JSON'
        : 'PROVIDER_OR_PROCESSING_ERROR',
    })
    return NextResponse.json(
      { error: 'Gagal menganalisis performa. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
