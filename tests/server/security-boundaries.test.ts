import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthenticationError, extractBearerToken } from '@/lib/server/auth'
import { createMemoryRateLimiter, resetMemoryRateLimitsForTests } from '@/lib/server/rate-limit'
import { AnalyzeValidationError, validateAnalyzeRequest } from '@/lib/validation/analyze'
import { NextRequest } from 'next/server'
import { POST as analyzePost } from '@/app/api/analyze/route'

const validScenario = {
  id: 'scenario-1',
  title: 'Skenario Test',
  description: 'Deskripsi pengujian.',
  target: 'Dapatkan langkah lanjut.',
  consumerProfile: 'Konsumen test.',
  difficulty: 'Medium',
  icon: 'User',
  name: 'Ibu Test',
  gender: 'Wanita',
  aggressiveness: 5,
  patience: 5,
  responseStyle: 'Banyak Tanya',
  firstSpeaker: 'AI',
}

test('missing and malformed Authorization headers are rejected', () => {
  assert.throws(() => extractBearerToken(null), AuthenticationError)
  assert.throws(() => extractBearerToken('Basic abc'), AuthenticationError)
  assert.equal(extractBearerToken('Bearer valid-token'), 'valid-token')
})

test('analyze HTTP route returns 401 without Authorization', async () => {
  const response = await analyzePost(new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify({}),
  }))
  assert.equal(response.status, 401)
})

test('analyze HTTP route returns 401 for an invalid token', async () => {
  const response = await analyzePost(new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: { Authorization: 'Bearer not-a-firebase-token' },
    body: JSON.stringify({}),
  }))
  assert.equal(response.status, 401)
})

test('valid analyze request is accepted without changing transcript', () => {
  const transcript = [{ role: 'user', text: 'Halo' }, { role: 'model', text: 'Halo juga' }]
  const result = validateAnalyzeRequest({
    sessionId: 'session-1',
    salespersonName: 'Sales Test',
    scenario: validScenario,
    transcript,
  })
  assert.deepEqual(result.transcript, transcript)
})

test('invalid roles and oversized transcript turns are rejected', () => {
  assert.throws(() => validateAnalyzeRequest({
    sessionId: 'session-1',
    salespersonName: 'Sales Test',
    scenario: validScenario,
    transcript: [{ role: 'admin', text: 'invalid' }],
  }), AnalyzeValidationError)
  assert.throws(() => validateAnalyzeRequest({
    sessionId: 'session-1',
    salespersonName: 'Sales Test',
    scenario: validScenario,
    transcript: [{ role: 'user', text: 'x'.repeat(5_001) }],
  }), AnalyzeValidationError)
})

test('rate limiter rejects requests above the configured UID limit', async () => {
  resetMemoryRateLimitsForTests()
  const limiter = createMemoryRateLimiter({ namespace: 'test', limit: 2, windowMs: 60_000 })
  assert.equal((await limiter.consume('uid-1')).allowed, true)
  assert.equal((await limiter.consume('uid-1')).allowed, true)
  const denied = await limiter.consume('uid-1')
  assert.equal(denied.allowed, false)
  assert.ok(denied.retryAfterSeconds > 0)
  assert.equal((await limiter.consume('uid-2')).allowed, true)
})
