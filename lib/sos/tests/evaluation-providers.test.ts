import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_NVIDIA_NIM_MODEL,
  EvaluationProvidersExhaustedError,
  runEvaluationProviders,
  type ProviderFailure,
} from '../evaluation/providers'

function completion(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const parse = (content: string) => JSON.parse(content) as { overallScore: number }

test('Groq success returns immediately without calling fallback providers', async () => {
  const requests: string[] = []
  const result = await runEvaluationProviders({
    prompt: 'safe prompt',
    groqKey: 'groq-test-key',
    nvidiaKey: 'nvidia-test-key',
    geminiKey: 'gemini-test-key',
    parse,
    fetchImpl: async input => {
      requests.push(String(input))
      return completion('{"overallScore":81}')
    },
    geminiGenerate: async () => {
      throw new Error('Gemini must not be called')
    },
  })

  assert.equal(result.provider, 'groq')
  assert.equal(result.result.overallScore, 81)
  assert.equal(requests.length, 1)
})

test('Groq HTTP failure falls back to NVIDIA NIM with safe structured payload', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const failures: ProviderFailure[] = []
  const result = await runEvaluationProviders({
    prompt: 'evaluation prompt',
    groqKey: 'groq-test-key',
    nvidiaKey: 'nvidia-test-key',
    geminiKey: 'gemini-test-key',
    parse,
    onFailure: failure => failures.push(failure),
    fetchImpl: async (input, init) => {
      requests.push({ url: String(input), init })
      return requests.length === 1
        ? completion('{}', 429)
        : completion('{"overallScore":77}')
    },
  })

  assert.equal(result.provider, 'nvidia_nim')
  assert.equal(result.result.overallScore, 77)
  assert.deepEqual(failures, [{ provider: 'groq', code: 'HTTP_ERROR', status: 429 }])
  assert.equal(requests[1].url, 'https://integrate.api.nvidia.com/v1/chat/completions')
  const body = JSON.parse(String(requests[1].init?.body))
  assert.equal(body.model, DEFAULT_NVIDIA_NIM_MODEL)
  assert.equal(body.stream, false)
  assert.equal(body.reasoning_effort, 'none')
  assert.equal(body.messages[0].content, 'evaluation prompt')
})

test('invalid NVIDIA JSON falls back to Gemini', async () => {
  const failures: ProviderFailure[] = []
  const result = await runEvaluationProviders({
    prompt: 'safe prompt',
    nvidiaKey: 'nvidia-test-key',
    geminiKey: 'gemini-test-key',
    parse,
    onFailure: failure => failures.push(failure),
    fetchImpl: async () => completion('not-json'),
    geminiGenerate: async () => '{"overallScore":73}',
  })

  assert.equal(result.provider, 'gemini')
  assert.equal(result.result.overallScore, 73)
  assert.deepEqual(failures, [{ provider: 'nvidia_nim', code: 'INVALID_RESPONSE', status: 200 }])
})

test('all configured providers failing returns privacy-safe diagnostics', async () => {
  const failures: ProviderFailure[] = []

  await assert.rejects(
    runEvaluationProviders({
      prompt: 'PRIVATE_PROMPT_VALUE',
      groqKey: 'PRIVATE_GROQ_KEY',
      nvidiaKey: 'PRIVATE_NVIDIA_KEY',
      geminiKey: 'PRIVATE_GEMINI_KEY',
      parse,
      onFailure: failure => failures.push(failure),
      fetchImpl: async () => completion('{}', 500),
      geminiGenerate: async () => '',
    }),
    error => {
      assert.ok(error instanceof EvaluationProvidersExhaustedError)
      const serialized = JSON.stringify(error)
      assert.equal(serialized.includes('PRIVATE_PROMPT_VALUE'), false)
      assert.equal(serialized.includes('PRIVATE_NVIDIA_KEY'), false)
      return true
    }
  )

  assert.deepEqual(failures.map(item => item.provider), ['groq', 'nvidia_nim', 'gemini'])
})
