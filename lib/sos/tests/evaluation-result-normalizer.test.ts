import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvaluationContext } from '../evaluation/context'
import { normalizeTrialEvaluationResult, TRIAL_DIMENSIONS } from '../evaluation/result-normalizer'
import { createInitialRoleplayState, reduceRoleplayEvents } from '../state-reducer'
import type { Persona, RoleplayEvent, Scenario } from '../types'

const persona: Persona = {
  id: 'result-persona',
  name: 'Ibu Result',
  gender: 'female',
  patience: 5,
  aggressiveness: 4,
  skepticism: 6,
  trustStart: 40,
  hiddenInformation: [{ key: 'private', value: 'HIDDEN_RESULT_VALUE', revealWhen: [], importance: 'critical' }],
  objections: [],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'result-scenario',
  name: 'Result Scenario',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: [],
  targetSkills: ['probing'],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

const baseState = createInitialRoleplayState()
const context = buildEvaluationContext({
  persona,
  scenario,
  turns: [
    { sequence: 1, role: 'customer', text: 'Saya ingin bertanya.', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy', finalized: true },
    { sequence: 2, role: 'sales', text: 'Saat ini masih tinggal di mana, Bu?', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy', finalized: true },
    { sequence: 3, role: 'sales', text: 'Pekerjaan Ibu saat ini apa?', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy', finalized: true },
  ],
  events: [],
  finalState: {
    ...baseState,
    home: {
      housingDiscovered: true,
      occupationDiscovered: true,
      moneyDiscovered: false,
      eligibilityDiscovered: false,
      completedCount: 2,
      completionRatio: 0.5,
    },
  },
})

const validEvidence = {
  dimensionKey: 'probing',
  turnSequence: 2,
  behaviorObserved: 'Sales menanyakan status tempat tinggal pelanggan.',
  reason: 'Pertanyaan menggali kebutuhan.',
  impact: 'Konteks pelanggan menjadi lebih jelas.',
  recommendedImprovement: 'Lanjutkan pertanyaan HOME lainnya.',
}

function allSkillScores(score: number, overrides: Record<string, number> = {}) {
  return TRIAL_DIMENSIONS.map(dimension => ({
    dimensionKey: dimension.key,
    score: overrides[dimension.key] ?? score,
  }))
}

test('valid model result preserves all legacy fields and returns eight dimensions with V2 evidence', () => {
  const result = normalizeTrialEvaluationResult({
    overallScore: 120,
    grade: 'A',
    summary: 'Evaluasi selesai.',
    strengths: ['Probing baik'],
    weaknesses: ['Belum closing'],
    keyObjectionsHandled: ['Harga'],
    missedOpportunities: ['Eligibility'],
    verdict: 'Cukup baik.',
    actionableTips: ['Lanjutkan HOME'],
    skillScores: allSkillScores(100, { probing: 88 }),
    evidence: [validEvidence],
    suggestedResponses: ['Boleh saya tanya pekerjaan Ibu?'],
    recommendedNextScenario: 'Closing survey',
    actionPlan: ['Latihan probing'],
  }, context)

  assert.equal(result.overallScore, 98)
  assert.equal(result.skillScores.length, 8)
  assert.deepEqual(result.skillScores.map(skill => skill.skill), TRIAL_DIMENSIONS.map(dimension => dimension.label))
  assert.equal(result.skillScores.find(skill => skill.skill === 'Probing')?.score, 88)
  assert.deepEqual(result.skillScores.find(skill => skill.skill === 'Probing')?.evidence, [
    'Turn 2: Sales menanyakan status tempat tinggal pelanggan.',
  ])
  assert.equal(result.evaluationV2.evidence.length, 1)
  assert.equal(result.evaluationV2.version, 'trial-v1.2')
  assert.equal(result.evaluationV2.provider, 'unspecified')
  assert.equal(result.evaluationV2.scoring.modelOverallScore, 100)
  assert.equal(result.evaluationV2.scoring.weightedScore, 98)
  assert.equal(result.evaluationV2.scoring.profileId, 'trial-weighted-v1')
  assert.deepEqual(result.evaluationV2.scoreAdjustment, {
    originalScore: 98,
    adjustedScore: 98,
    effectiveMaxScore: 100,
    capped: false,
    controllingRuleId: null,
    appliedRules: [],
  })
  for (const field of ['strengths', 'weaknesses', 'keyObjectionsHandled', 'missedOpportunities', 'actionableTips', 'skillScores', 'suggestedResponses', 'actionPlan']) {
    assert.ok(field in result)
  }
})

test('hallucinated, customer-turn, and invalid-dimension evidence are rejected from V2 and legacy output', () => {
  const rejected = [
    { ...validEvidence, turnSequence: 99 },
    { ...validEvidence, turnSequence: 1 },
    { ...validEvidence, dimensionKey: 'invented_dimension' },
  ]
  const result = normalizeTrialEvaluationResult({
    skillScores: [{ dimensionKey: 'probing', score: 70 }],
    evidence: rejected,
  }, context)

  assert.deepEqual(result.evaluationV2.evidence, [])
  assert.equal(result.evaluationV2.evidenceDiagnostics.rejected, 3)
  assert.deepEqual(result.skillScores.find(skill => skill.skill === 'Probing')?.evidence, [])
})

test('duplicate canonical evidence keeps the first valid item', () => {
  const result = normalizeTrialEvaluationResult({
    evidence: [validEvidence, { ...validEvidence, behaviorObserved: `  ${validEvidence.behaviorObserved}  ` }],
  }, context)

  assert.equal(result.evaluationV2.evidence.length, 1)
  assert.equal(result.evaluationV2.evidenceDiagnostics.accepted, 1)
  assert.equal(result.evaluationV2.evidenceDiagnostics.rejected, 1)
  assert.ok(result.evaluationV2.evidenceDiagnostics.issueCodes.includes('DUPLICATE_EVIDENCE'))
})

test('missing dimension score receives zero with empty evidence', () => {
  const result = normalizeTrialEvaluationResult({
    skillScores: [{ dimensionKey: 'probing', score: 75 }],
    evidence: [validEvidence],
  }, context)
  const closing = result.skillScores.find(skill => skill.skill === 'Closing')

  assert.equal(closing?.score, 0)
  assert.deepEqual(closing?.evidence, [])
})

test('malformed arrays and scores normalize safely with all legacy fields present', () => {
  const result = normalizeTrialEvaluationResult({
    overallScore: 'invalid',
    strengths: 'not-array',
    skillScores: [{ dimensionKey: 'probing', score: Number.POSITIVE_INFINITY }, null],
    evidence: 'not-array',
  }, context)

  assert.equal(result.overallScore, 0)
  assert.equal(result.grade, 'E')
  assert.deepEqual(result.strengths, [])
  assert.equal(result.skillScores.length, 8)
  assert.equal(result.skillScores.find(skill => skill.skill === 'Probing')?.score, 0)
  assert.equal(result.recommendedNextScenario, null)
})

test('result normalizer applies guarantee cap to legacy score and grade while preserving dimensions and evidence', () => {
  const guaranteeEvent: RoleplayEvent = {
    id: 'guarantee-2',
    sessionId: 'result-session',
    eventType: 'GUARANTEE_LANGUAGE',
    severity: 'CRITICAL',
    sourceTurnSequence: 2,
    confidence: 0.97,
    extractor: 'deterministic',
    createdAt: '1970-01-01T00:00:00.000Z',
  }
  const guaranteeContext = buildEvaluationContext({
    persona,
    scenario,
    turns: context.turns,
    events: [guaranteeEvent],
    finalState: reduceRoleplayEvents(baseState, [guaranteeEvent]),
  })
  const raw = {
    overallScore: 90,
    grade: 'A',
    skillScores: allSkillScores(90, { probing: 88 }),
    evidence: [validEvidence],
  }
  const result = normalizeTrialEvaluationResult(raw, guaranteeContext)

  assert.equal(result.overallScore, 65)
  assert.equal(result.grade, 'D')
  assert.equal(result.evaluationV2.scoreAdjustment.originalScore, 90)
  assert.equal(result.evaluationV2.scoreAdjustment.adjustedScore, 65)
  assert.equal(result.evaluationV2.scoreAdjustment.controllingRuleId, 'GUARANTEE_LANGUAGE')
  assert.equal(result.skillScores.find(skill => skill.skill === 'Probing')?.score, 88)
  assert.equal(result.evaluationV2.evidence.length, 1)
  assert.equal(raw.overallScore, 90)
  assert.equal(raw.grade, 'A')
  assert.deepEqual(raw.skillScores, allSkillScores(90, { probing: 88 }))
  assert.deepEqual(raw.evidence, [validEvidence])
})

test('normalized response excludes rejected raw evidence and private/internal values', () => {
  const rawSecret = 'RAW_REJECTED_EVIDENCE_SECRET'
  const result = normalizeTrialEvaluationResult({
    evidence: [{ ...validEvidence, turnSequence: 999, behaviorObserved: rawSecret }],
    internalPrompt: 'INTERNAL_PROMPT_SECRET',
  }, context)
  const serialized = JSON.stringify(result)

  assert.equal(serialized.includes(rawSecret), false)
  assert.equal(serialized.includes('INTERNAL_PROMPT_SECRET'), false)
  assert.equal(serialized.includes('HIDDEN_RESULT_VALUE'), false)
})

test('normalization is deterministic for identical model output and context', () => {
  const raw = {
    overallScore: 70,
    skillScores: [{ dimensionKey: 'probing', score: 75 }],
    evidence: [validEvidence],
  }

  assert.deepEqual(
    normalizeTrialEvaluationResult(raw, context),
    normalizeTrialEvaluationResult(raw, context)
  )
})
