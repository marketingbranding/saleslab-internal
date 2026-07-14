import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import {
  LegacyEvaluationInputError,
  reconstructLegacyEvaluationInput,
} from '@/lib/sos/evaluation/legacy-input'
import { compileTrialEvaluationPrompt } from '@/lib/sos/evaluation/prompt'
import { normalizeTrialEvaluationResult } from '@/lib/sos/evaluation/result-normalizer'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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
  const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!groqKey && !geminiKey) {
    console.error('No analysis provider key is configured')
    return NextResponse.json(
      { error: 'Analysis provider is not configured.' },
      { status: 500 }
    )
  }

  const prompt = compileTrialEvaluationPrompt({ context: reconstructed.context })

  try {
    let content = ''
    if (groqKey) {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      })

      if (!response.ok) {
        console.error('Groq evaluator request failed', { status: response.status })
        return NextResponse.json(
          { error: 'Analisis gagal: server AI sedang sibuk. Coba lagi nanti.' },
          { status: 502 }
        )
      }
      const data: unknown = await response.json()
      if (isRecord(data) && Array.isArray(data.choices)) {
        const firstChoice = data.choices[0]
        if (isRecord(firstChoice) && isRecord(firstChoice.message) && typeof firstChoice.message.content === 'string') {
          content = firstChoice.message.content
        }
      }
    } else {
      const ai = new GoogleGenAI({ apiKey: geminiKey! })
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      })
      content = response.text || ''
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Analisis gagal: AI tidak memberikan respons.' },
        { status: 502 }
      )
    }

    const rawResult = extractJson(content)
    const analysis = normalizeTrialEvaluationResult(rawResult, reconstructed.context)
    return NextResponse.json(analysis)
  } catch (error) {
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
