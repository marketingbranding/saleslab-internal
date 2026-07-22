import { after, before, beforeEach, test } from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { NextRequest } from 'next/server'
import { POST as analyzePost } from '@/app/api/analyze/route'
import { POST as roleplayTextPost } from '@/app/api/roleplay/text/route'

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-saleslab'
let environment: RulesTestEnvironment

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('config/firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

beforeEach(async () => {
  await environment.clearFirestore()
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'admins', 'admin-1'), { label: 'Test admin' })
    await setDoc(doc(db, 'sessions', 'session-owner'), {
      scenarioId: 'scenario-1',
      salespersonName: 'Sales Satu',
      transcript: [{ role: 'user', text: 'Halo' }],
      userId: 'user-1',
      score: 75,
      analysisStatus: 'completed',
      feedback: { overallScore: 75 },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    await setDoc(doc(db, 'settings', 'global'), { modelProvider: 'gemini' })
    await setDoc(doc(db, 'personaSecrets', 'persona-1'), { hiddenInstructions: 'private' })
    await setDoc(doc(db, 'scenarioSecrets', 'scenario-1'), { hiddenRules: 'private' })
  })
})

after(async () => {
  await environment.cleanup()
})

test('unauthenticated access is denied', async () => {
  const db = environment.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'sessions', 'session-owner')))
  await assertFails(getDocs(collection(db, 'personas')))
})

test('normal user cannot read admin settings or secret collections', async () => {
  const db = environment.authenticatedContext('user-1', { email: 'user@example.com' }).firestore()
  await assertFails(getDoc(doc(db, 'settings', 'global')))
  await assertFails(getDoc(doc(db, 'personaSecrets', 'persona-1')))
  await assertFails(getDoc(doc(db, 'scenarioSecrets', 'scenario-1')))
})

test('admin browser writes to master data must use the server command route', async () => {
  const db = environment.authenticatedContext('admin-1').firestore()
  await assertFails(setDoc(doc(db, 'settings', 'global'), { modelProvider: 'openrouter', openRouterModel: 'test-model' }))
  await assertFails(setDoc(doc(db, 'settings', 'global'), { modelProvider: 'openrouter', openRouterApiKey: 'secret' }))
  await assertFails(setDoc(doc(db, 'branches', 'kc-browser'), {
    id: 'kc-browser', name: 'KC Browser', normalizedName: 'kc browser', status: 'active',
  }))
})

test('normal user cannot create or modify admin documents', async () => {
  const db = environment.authenticatedContext('user-1').firestore()
  await assertFails(setDoc(doc(db, 'admins', 'user-1'), { label: 'Self admin' }))
  await assertFails(deleteDoc(doc(db, 'admins', 'admin-1')))
})

test('admin cannot delete their own admin grant', async () => {
  const db = environment.authenticatedContext('admin-1').firestore()
  await assertFails(deleteDoc(doc(db, 'admins', 'admin-1')))
})

test('session owner can read own session but cannot read another session', async () => {
  const ownerDb = environment.authenticatedContext('user-1').firestore()
  const otherDb = environment.authenticatedContext('user-2').firestore()
  await assertSucceeds(getDoc(doc(ownerDb, 'sessions', 'session-owner')))
  await assertFails(getDoc(doc(otherDb, 'sessions', 'session-owner')))
})

test('normal user cannot create sessions or alter evaluator-owned score fields', async () => {
  const db = environment.authenticatedContext('user-1').firestore()
  await assertFails(setDoc(doc(db, 'sessions', 'forged-session'), {
    scenarioId: 'scenario-1',
    salespersonName: 'Sales Satu',
    userId: 'user-1',
    score: 100,
  }))
  await assertFails(updateDoc(doc(db, 'sessions', 'session-owner'), {
    score: 100,
    feedback: { overallScore: 100 },
    analysisStatus: 'completed',
  }))
})

test('admin can read team sessions', async () => {
  const db = environment.authenticatedContext('admin-1').firestore()
  const snapshot = await assertSucceeds(getDocs(collection(db, 'sessions')))
  assert.equal(snapshot.size, 1)
})

test('admin can manage scenarios and personas', async () => {
  const db = environment.authenticatedContext('admin-1').firestore()
  await assertSucceeds(setDoc(doc(db, 'scenarios', 'scenario-new'), {
    id: 'scenario-new',
    title: 'Skenario Baru',
    name: 'Ibu Test',
    difficulty: 'Medium',
    gender: 'Wanita',
  }))
  await assertSucceeds(setDoc(doc(db, 'personas', 'persona-new'), {
    id: 'persona-new',
    name: 'Persona Baru',
  }))
  await assertSucceeds(deleteDoc(doc(db, 'scenarios', 'scenario-new')))
  await assertSucceeds(deleteDoc(doc(db, 'personas', 'persona-new')))
})

test('email alone never grants admin access', async () => {
  const db = environment.authenticatedContext('not-admin', { email: 'former-admin@example.com' }).firestore()
  await assertFails(getDocs(collection(db, 'sessions')))
  await assertFails(getDoc(doc(db, 'settings', 'global')))
})

async function createEmulatorIdToken() {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  })
  const result = await response.json()
  assert.equal(response.ok, true)
  return { token: result.idToken as string, uid: result.localId as string }
}

const routeScenario = {
  id: 'scenario-route-test',
  title: 'Skenario Route Test',
  description: 'Deskripsi untuk integration test evaluator.',
  target: 'Dapatkan komitmen langkah lanjut.',
  consumerProfile: 'Konsumen berhati-hati dan butuh penjelasan.',
  difficulty: 'Medium',
  icon: 'User',
  name: 'Ibu Test',
  gender: 'Wanita',
  aggressiveness: 5,
  patience: 5,
  responseStyle: 'Banyak Tanya',
  firstSpeaker: 'AI',
}

const routeTranscript = [
  { role: 'model', text: 'Selamat siang, saya masih ragu soal rumah ini dan ingin tahu prosesnya.' },
  { role: 'user', text: 'Selamat siang Bu, saat ini Ibu tinggal di rumah sendiri atau masih mengontrak?' },
  { role: 'model', text: 'Saya masih mengontrak bersama keluarga dan ingin punya rumah sendiri.' },
  { role: 'user', text: 'Baik Bu, saya bantu cek kebutuhan dan kemampuan cicilannya dulu supaya lebih jelas.' },
]

function modelResult() {
  const keys = ['approaching', 'probing', 'home_qualification', 'solution_presentation', 'objection_handling', 'closing', 'communication', 'compliance']
  return {
    overallScore: 75,
    grade: 'C',
    summary: 'Evaluasi test selesai.',
    strengths: ['Pembukaan baik'],
    weaknesses: ['Belum closing'],
    keyObjectionsHandled: [],
    missedOpportunities: [],
    verdict: 'Cukup baik.',
    actionableTips: ['Lanjutkan probing'],
    skillScores: keys.map(dimensionKey => ({ dimensionKey, score: 75 })),
    evidence: [],
    suggestedResponses: [],
    recommendedNextScenario: null,
    actionPlan: [],
  }
}

test('authenticated analyze request succeeds and creates a server-owned session', async () => {
  const { token, uid } = await createEmulatorIdToken()
  const originalFetch = globalThis.fetch
  let providerCalls = 0
  globalThis.fetch = async () => {
    providerCalls += 1
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(modelResult()) } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    const requestBody = JSON.stringify({
      sessionId: 'session-route-success',
      salespersonName: 'Sales Test',
      scenario: routeScenario,
      transcript: routeTranscript,
    })
    const response = await analyzePost(new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: requestBody,
    }))
    assert.equal(response.status, 200)
    const cachedResponse = await analyzePost(new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: requestBody,
    }))
    assert.equal(cachedResponse.status, 200)
    assert.equal(providerCalls, 1)
    const ownerDb = environment.authenticatedContext(uid).firestore()
    const session = await assertSucceeds(getDoc(doc(ownerDb, 'sessions', 'session-route-success')))
    assert.equal(session.data()?.analysisStatus, 'completed')
    assert.ok(session.data()?.score >= 0 && session.data()?.score <= 100)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('authenticated text roleplay uses the server-side OpenRouter credential', async () => {
  const { token } = await createEmulatorIdToken()
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'settings', 'global'), {
      modelProvider: 'openrouter',
      openRouterModel: 'test-model',
    })
  })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    const headers = new Headers(init?.headers)
    assert.equal(headers.get('Authorization'), 'Bearer test-openrouter-key')
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Baik, boleh dijelaskan dulu?' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const response = await roleplayTextPost(new NextRequest('http://localhost/api/roleplay/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ scenario: routeScenario, history: [] }),
    }))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).text, 'Baik, boleh dijelaskan dulu?')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('provider exhaustion returns 503 and records failed analysis', async () => {
  const { token, uid } = await createEmulatorIdToken()
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('rate limited', { status: 429 })

  try {
    const response = await analyzePost(new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId: 'session-route-exhausted',
        salespersonName: 'Sales Test',
        scenario: routeScenario,
        transcript: routeTranscript,
      }),
    }))
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('Retry-After'), '20')
    const ownerDb = environment.authenticatedContext(uid).firestore()
    const session = await assertSucceeds(getDoc(doc(ownerDb, 'sessions', 'session-route-exhausted')))
    assert.equal(session.data()?.analysisStatus, 'failed')
  } finally {
    globalThis.fetch = originalFetch
  }
})
