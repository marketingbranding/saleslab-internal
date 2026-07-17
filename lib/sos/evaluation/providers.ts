import { GoogleGenAI } from '@google/genai'

export type EvaluationProviderId = 'groq' | 'nvidia_nim' | 'gemini'
export type ProviderFailureCode = 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'EMPTY_RESPONSE' | 'INVALID_RESPONSE'

export interface ProviderFailure {
  provider: EvaluationProviderId
  code: ProviderFailureCode
  status?: number
}

export interface EvaluationProviderResult<T> {
  provider: EvaluationProviderId
  result: T
}

export interface RunEvaluationProvidersOptions<T> {
  prompt: string
  groqKey?: string
  nvidiaKey?: string
  geminiKey?: string
  nvidiaModel?: string
  parse: (content: string) => T
  fetchImpl?: typeof fetch
  geminiGenerate?: (prompt: string, apiKey: string) => Promise<string>
  onFailure?: (failure: ProviderFailure) => void
  timeouts?: Partial<Record<EvaluationProviderId, number>>
}

export class EvaluationProvidersExhaustedError extends Error {
  readonly failures: ProviderFailure[]

  constructor(failures: ProviderFailure[]) {
    super('EVALUATION_PROVIDERS_EXHAUSTED')
    this.name = 'EvaluationProvidersExhaustedError'
    this.failures = failures
  }
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
export const DEFAULT_NVIDIA_NIM_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b'

function openAiContent(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('choices' in data) || !Array.isArray(data.choices)) return ''
  const first = data.choices[0]
  if (typeof first !== 'object' || first === null || !('message' in first)) return ''
  const message = first.message
  return typeof message === 'object' && message !== null && 'content' in message && typeof message.content === 'string'
    ? message.content
    : ''
}

async function fetchJsonWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function defaultGeminiGenerate(prompt: string, apiKey: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.2 },
  })
  return response.text || ''
}

async function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error('Provider timeout')
          error.name = 'AbortError'
          reject(error)
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function failureFromError(provider: EvaluationProviderId, error: unknown): ProviderFailure {
  return {
    provider,
    code: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
  }
}

export async function runEvaluationProviders<T>({
  prompt,
  groqKey,
  nvidiaKey,
  geminiKey,
  nvidiaModel = DEFAULT_NVIDIA_NIM_MODEL,
  parse,
  fetchImpl = fetch,
  geminiGenerate = defaultGeminiGenerate,
  onFailure,
  timeouts = {},
}: RunEvaluationProvidersOptions<T>): Promise<EvaluationProviderResult<T>> {
  const failures: ProviderFailure[] = []
  const recordFailure = (failure: ProviderFailure) => {
    failures.push(failure)
    onFailure?.(failure)
  }

  const openAiProviders: Array<{
    provider: 'groq' | 'nvidia_nim'
    key?: string
    url: string
    body: Record<string, unknown>
  }> = [
    {
      provider: 'groq',
      key: groqKey,
      url: GROQ_API_URL,
      body: {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      },
    },
    {
      provider: 'nvidia_nim',
      key: nvidiaKey,
      url: NVIDIA_API_URL,
      body: {
        model: nvidiaModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 4096,
        stream: false,
        reasoning_effort: 'none',
      },
    },
  ]

  for (const candidate of openAiProviders) {
    if (!candidate.key) continue
    let response: Response
    try {
      response = await fetchJsonWithTimeout(
        fetchImpl,
        candidate.url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${candidate.key}`,
          },
          body: JSON.stringify(candidate.body),
        },
        timeouts[candidate.provider] ?? (candidate.provider === 'groq' ? 12_000 : 20_000)
      )
    } catch (error) {
      recordFailure(failureFromError(candidate.provider, error))
      continue
    }

    if (!response.ok) {
      recordFailure({ provider: candidate.provider, code: 'HTTP_ERROR', status: response.status })
      continue
    }

    let content = ''
    try {
      content = openAiContent(await response.json())
    } catch {
      recordFailure({ provider: candidate.provider, code: 'INVALID_RESPONSE', status: response.status })
      continue
    }
    if (!content) {
      recordFailure({ provider: candidate.provider, code: 'EMPTY_RESPONSE', status: response.status })
      continue
    }
    try {
      return { provider: candidate.provider, result: parse(content) }
    } catch {
      recordFailure({ provider: candidate.provider, code: 'INVALID_RESPONSE', status: response.status })
    }
  }

  if (geminiKey) {
    let content = ''
    try {
      content = await promiseWithTimeout(geminiGenerate(prompt, geminiKey), timeouts.gemini ?? 15_000)
    } catch (error) {
      recordFailure(failureFromError('gemini', error))
      throw new EvaluationProvidersExhaustedError(failures)
    }
    if (!content) {
      recordFailure({ provider: 'gemini', code: 'EMPTY_RESPONSE' })
      throw new EvaluationProvidersExhaustedError(failures)
    }
    try {
      return { provider: 'gemini', result: parse(content) }
    } catch {
      recordFailure({ provider: 'gemini', code: 'INVALID_RESPONSE' })
    }
  }

  throw new EvaluationProvidersExhaustedError(failures)
}
