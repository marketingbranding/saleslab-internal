import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'
import { AuthenticationError, verifyRequestAuth } from '@/lib/server/auth'
import { getAdminDb } from '@/lib/server/firebase-admin'
import { rateLimitFromEnv } from '@/lib/server/rate-limit'
import { readJsonBody, RequestBodyError } from '@/lib/server/request-body'
import { RoleplayTextValidationError, validateRoleplayTextRequest } from '@/lib/validation/roleplay-text'

const roleplayRateLimiter = rateLimitFromEnv('roleplay-text', 'ROLEPLAY_TEXT', { limit: 30, windowSeconds: 60 })

function responseError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers })
}

function systemInstruction(scenario: Record<string, unknown>, historyLength: number) {
  return `
    Anda adalah AI roleplay bot yang berakting sebagai konsumen spesifik dalam skenario penjualan rumah subsidi (KPR).
    Implementasikan materi 'Sales Path' dan 'Sales Funnel' secara implisit dalam perilaku Anda.
    Status Anda saat ini dalam funnel: ${historyLength < 3 ? 'Suspect' : historyLength < 6 ? 'Prospect' : 'Hot Prospect'}.

    Gunakan Bahasa Indonesia yang santai dan natural. JANGAN menggunakan istilah 'lo/gue'.
    Gunakan panggilan yang sopan.

    PROFIL KONSUMEN:
    - Nama: ${scenario.name}
    - Gender: ${scenario.gender}
    - Agresivitas: ${scenario.aggressiveness}/10
    - Kesabaran: ${scenario.patience}/10
    - Gaya Respon: ${scenario.responseStyle}
    - Latar Belakang: ${scenario.consumerProfile}

    SKENARIO: ${scenario.title}
    DESKRIPSI: ${scenario.description}
    GOAL SALES: ${scenario.target}

    ATURAN:
    1. Tetap dalam karakter. Sesuaikan respon Anda dengan seberapa baik Sales melakukan tahapan Sales Path (Approaching, Probing, Presenting, etc).
    2. Jika Sales langsung 'Closing' tanpa 'Probing' yang baik, jadilah lebih skeptis.
    3. Realistis. Jangan terlalu mudah diyakinkan kecuali Sales menyentuh 'Pain Point' Anda sesuai skenario.
    4. Respon singkat (1-3 kalimat).
    5. JANGAN menyebutkan istilah materi sales. Bertindaklah saja sebagai konsumen yang merespon teknik tersebut.
    6. JANGAN berikan feedback saat chat.
  `
}

export async function POST(request: NextRequest) {
  let token
  try {
    token = await verifyRequestAuth(request)
  } catch (error) {
    return responseError(error instanceof AuthenticationError ? error.message : 'Autentikasi gagal.', 401)
  }

  const limit = await roleplayRateLimiter.consume(token.uid)
  if (!limit.allowed) return responseError('Terlalu banyak pesan. Coba lagi sebentar.', 429, { 'Retry-After': String(limit.retryAfterSeconds) })

  let body
  try {
    body = validateRoleplayTextRequest(await readJsonBody(request, 750_000))
  } catch (error) {
    return responseError(error instanceof RoleplayTextValidationError || error instanceof RequestBodyError ? error.message : 'Data roleplay tidak valid.', 400)
  }

  const settingsSnapshot = await getAdminDb().collection('settings').doc('global').get()
  const settings = settingsSnapshot.data() || {}
  const provider = typeof settings.modelProvider === 'string' ? settings.modelProvider : 'gemini'
  const instruction = systemInstruction(body.scenario, body.history.length)
  const messages = [
    { role: 'system', content: instruction },
    ...body.history.map(turn => ({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.text })),
  ]
  if (body.history.length === 0 && body.scenario.firstSpeaker === 'AI') {
    messages.push({ role: 'user', content: 'Mulai obrolan sesuai skenario.' })
  }

  try {
    if (provider === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) return responseError('OpenRouter belum dikonfigurasi di server.', 503)
      const providerResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://saleslab.local',
          'X-Title': 'Sales Lab Internal',
        },
        body: JSON.stringify({
          model: settings.openRouterModel || process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct:free',
          messages,
          stream: false,
          max_tokens: 500,
        }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!providerResponse.ok) throw new Error(`OPENROUTER_HTTP_${providerResponse.status}`)
      const result = await providerResponse.json()
      const text = result.choices?.[0]?.message?.content
      if (typeof text !== 'string' || text.trim().length === 0) throw new Error('OPENROUTER_EMPTY_RESPONSE')
      return NextResponse.json({ text })
    }

    if (provider === 'ollama') {
      const baseUrl = process.env.OLLAMA_BASE_URL
      if (!baseUrl) return responseError('Ollama server belum dikonfigurasi.', 503)
      const providerResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.ollamaModel || 'llama3', messages, stream: false }),
        signal: AbortSignal.timeout(30_000),
      })
      if (!providerResponse.ok) throw new Error(`OLLAMA_HTTP_${providerResponse.status}`)
      const result = await providerResponse.json()
      const text = result.message?.content
      if (typeof text !== 'string' || text.trim().length === 0) throw new Error('OLLAMA_EMPTY_RESPONSE')
      return NextResponse.json({ text })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) return responseError('Gemini text belum dikonfigurasi di server.', 503)
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
      contents: messages.filter(message => message.role !== 'system').map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
      config: { systemInstruction: instruction, temperature: 0.8 },
    })
    if (typeof result.text !== 'string' || result.text.trim().length === 0) throw new Error('GEMINI_EMPTY_RESPONSE')
    return NextResponse.json({ text: result.text })
  } catch (error) {
    console.error('Text roleplay provider failed', {
      provider,
      code: error instanceof Error ? error.message : 'UNKNOWN_PROVIDER_ERROR',
    })
    return responseError('Respons AI belum tersedia. Silakan coba lagi.', 503, { 'Retry-After': '10' })
  }
}
