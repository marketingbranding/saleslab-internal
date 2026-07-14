import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EVALUATION_DIMENSION_KEYS,
  normalizeEvaluationEvidence,
  validateEvaluationEvidence,
  validateEvaluationEvidenceBatch,
} from '../evaluation/evidence'
import type { EvaluationEvidence, NormalizedTurn } from '../types'

const turns: NormalizedTurn[] = [
  {
    sequence: 1,
    role: 'customer',
    text: 'Saya masih ingin bertanya dulu.',
    timestamp: '2026-07-14T08:00:00.000Z',
    source: 'legacy',
    finalized: true,
  },
  {
    sequence: 2,
    role: 'sales',
    text: 'Saat ini tinggal di rumah sendiri atau masih kontrak, Bu?',
    timestamp: '2026-07-14T08:00:05.000Z',
    source: 'legacy',
    finalized: true,
  },
  {
    sequence: 7,
    role: 'sales',
    text: 'Kita bisa lanjutkan dengan survey lokasi.',
    timestamp: '2026-07-14T08:00:10.000Z',
    source: 'legacy',
    finalized: true,
  },
]

const validInput = {
  dimensionKey: 'home_qualification',
  turnSequence: 2,
  behaviorObserved: '  Sales   menanyakan status tempat tinggal pelanggan. ',
  reason: ' Pertanyaan ini menggali komponen Housing dalam HOME. ',
  impact: ' Sales memperoleh konteks awal. ',
  recommendedImprovement: ' Lanjutkan dengan menggali pekerjaan dan kelayakan. ',
}

function validate(input: unknown, overrides: Partial<Parameters<typeof validateEvaluationEvidence>[1]> = {}) {
  return validateEvaluationEvidence(input, { turns, ...overrides })
}

function issueCodes(input: unknown): string[] {
  return validate(input).issues.map(issue => issue.code)
}

test('canonical valid evidence is accepted and normalized', () => {
  const result = validate(validInput)

  assert.equal(result.valid, true)
  assert.deepEqual(result.issues, [])
  assert.equal(result.evidence?.id, 'evidence:home_qualification:turn-2:1')
  assert.equal(result.evidence?.dimensionKey, 'home_qualification')
  assert.equal(result.evidence?.turnSequence, 2)
  assert.equal(result.evidence?.behaviorObserved, 'Sales menanyakan status tempat tinggal pelanggan.')
  assert.equal(result.evidence?.reason, 'Pertanyaan ini menggali komponen Housing dalam HOME.')
  assert.equal(result.evidence?.impact, 'Sales memperoleh konteks awal.')
  assert.equal(result.evidence?.recommendedImprovement, 'Lanjutkan dengan menggali pekerjaan dan kelayakan.')
})

test('explicit snake-case aliases normalize to canonical fields', () => {
  const result = validate({
    dimension_key: 'Home Qualification',
    turn_sequence: '2',
    behavior_observed: 'Sales menggali status rumah.',
    reason: 'Pertanyaan relevan.',
    impact: 'Kebutuhan lebih jelas.',
    recommended_improvement: 'Lanjutkan probing.',
  })

  assert.equal(result.valid, true)
  assert.equal(result.evidence?.dimensionKey, 'home_qualification')
  assert.equal(result.evidence?.turnSequence, 2)
})

test('null, undefined, string, and array inputs are safely rejected', () => {
  for (const input of [null, undefined, 'evidence', []]) {
    const result = validate(input)
    assert.equal(result.valid, false)
    assert.deepEqual(result.issues.map(issue => issue.code), ['INVALID_INPUT'])
  }
})

test('empty object reports deterministic missing field issues', () => {
  assert.deepEqual(issueCodes({}), [
    'MISSING_DIMENSION_KEY',
    'INVALID_TURN_SEQUENCE',
    'EMPTY_BEHAVIOR',
    'EMPTY_REASON',
    'EMPTY_IMPACT',
    'EMPTY_RECOMMENDATION',
  ])
})

test('dimension keys and explicit aliases normalize deterministically', () => {
  const cases = [
    ['Home Qualification', 'home_qualification'],
    ['home', 'home_qualification'],
    ['objection-handling', 'objection_handling'],
    ['solution', 'solution_presentation'],
    [' CLOSING ', 'closing'],
  ] as const

  for (const [dimensionKey, expected] of cases) {
    const result = validate({ ...validInput, dimensionKey })
    assert.equal(result.valid, true)
    assert.equal(result.evidence?.dimensionKey, expected)
  }
})

test('unsupported dimension is rejected', () => {
  const result = validate({ ...validInput, dimensionKey: 'creative_storytelling' })

  assert.equal(result.valid, false)
  assert.ok(result.issues.some(issue => issue.code === 'UNSUPPORTED_DIMENSION_KEY'))
})

test('custom dimension allowlist replaces the default vocabulary', () => {
  const custom = validate(
    { ...validInput, dimensionKey: 'Custom Skill' },
    { allowedDimensionKeys: [' custom-skill ', 'custom_skill'] }
  )
  const defaultDimension = validate(
    { ...validInput, dimensionKey: 'probing' },
    { allowedDimensionKeys: ['custom_skill'] }
  )

  assert.equal(custom.valid, true)
  assert.equal(custom.evidence?.dimensionKey, 'custom_skill')
  assert.ok(defaultDimension.issues.some(issue => issue.code === 'UNSUPPORTED_DIMENSION_KEY'))
})

test('numeric string turn sequence is accepted and invalid sequences are rejected', () => {
  assert.equal(validate({ ...validInput, turnSequence: '2' }).valid, true)

  for (const turnSequence of [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, 'abc']) {
    const result = validate({ ...validInput, turnSequence })
    assert.ok(result.issues.some(issue => issue.code === 'INVALID_TURN_SEQUENCE'))
  }
})

test('missing transcript sequence is rejected without reassignment', () => {
  const result = validate({ ...validInput, turnSequence: 3 })

  assert.ok(result.issues.some(issue => issue.code === 'TURN_NOT_FOUND'))
})

test('sales turn is required by default and can be explicitly disabled', () => {
  const customerEvidence = { ...validInput, turnSequence: 1 }
  const required = validate(customerEvidence)
  const allowed = validate(customerEvidence, { requireSalesTurn: false })

  assert.ok(required.issues.some(issue => issue.code === 'SALES_TURN_REQUIRED'))
  assert.equal(allowed.valid, true)
})

test('each required text field reports its corresponding empty issue', () => {
  const fields: Array<[keyof EvaluationEvidence, string]> = [
    ['behaviorObserved', 'EMPTY_BEHAVIOR'],
    ['reason', 'EMPTY_REASON'],
    ['impact', 'EMPTY_IMPACT'],
    ['recommendedImprovement', 'EMPTY_RECOMMENDATION'],
  ]

  for (const [field, code] of fields) {
    const result = validate({ ...validInput, [field]: '   ' })
    assert.ok(result.issues.some(issue => issue.code === code))
  }
})

test('evidence whitespace is collapsed without rewriting meaning', () => {
  const result = validate({
    ...validInput,
    behaviorObserved: 'Sales\n\nmenanyakan   status rumah.',
  })

  assert.equal(result.evidence?.behaviorObserved, 'Sales menanyakan status rumah.')
})

test('oversized evidence text is deterministically trimmed to safe limits', () => {
  const result = validate({
    ...validInput,
    behaviorObserved: 'b'.repeat(550),
    reason: 'r'.repeat(550),
    impact: 'i'.repeat(550),
    recommendedImprovement: 'x'.repeat(750),
  })

  assert.equal(result.valid, true)
  assert.equal(result.evidence?.behaviorObserved.length, 500)
  assert.equal(result.evidence?.reason.length, 500)
  assert.equal(result.evidence?.impact.length, 500)
  assert.equal(result.evidence?.recommendedImprovement.length, 700)
})

test('missing ID generates the same deterministic ID for repeated calls', () => {
  const first = validate(validInput)
  const second = validate(validInput)

  assert.equal(first.evidence?.id, 'evidence:home_qualification:turn-2:1')
  assert.equal(first.evidence?.id, second.evidence?.id)
})

test('supplied ID is trimmed and length-limited', () => {
  const result = validate({ ...validInput, id: `  ${'a'.repeat(140)}  ` })

  assert.equal(result.valid, true)
  assert.equal(result.evidence?.id.length, 128)
})

test('batch preserves valid input order and rejects invalid records with original indices', () => {
  const result = validateEvaluationEvidenceBatch([
    { ...validInput, dimensionKey: 'probing' },
    null,
    { ...validInput, dimensionKey: 'closing', turnSequence: 7 },
  ], { turns })

  assert.deepEqual(result.validEvidence.map(evidence => evidence.dimensionKey), ['probing', 'closing'])
  assert.deepEqual(result.rejectedEvidence.map(rejected => rejected.inputIndex), [1])
  assert.equal(result.rejectedEvidence[0].issues[0].inputIndex, 1)
})

test('duplicate evidence uses normalized dimension, turn, and behavior; first wins', () => {
  const result = validateEvaluationEvidenceBatch([
    { ...validInput, behaviorObserved: 'Sales menggali kebutuhan.' },
    { ...validInput, dimensionKey: 'HOME', behaviorObserved: '  sales   menggali kebutuhan.  ' },
  ], { turns })

  assert.equal(result.validEvidence.length, 1)
  assert.equal(result.rejectedEvidence.length, 1)
  assert.deepEqual(result.rejectedEvidence[0].issues.map(issue => issue.code), ['DUPLICATE_EVIDENCE'])
})

test('same supplied ID on distinct evidence remains accepted with unique final IDs', () => {
  const result = validateEvaluationEvidenceBatch([
    { ...validInput, id: 'repeated-id', dimensionKey: 'probing' },
    { ...validInput, id: 'repeated-id', dimensionKey: 'closing', turnSequence: 7 },
  ], { turns })

  assert.equal(result.validEvidence.length, 2)
  assert.equal(result.validEvidence[0].id, 'repeated-id')
  assert.notEqual(result.validEvidence[1].id, 'repeated-id')
  assert.equal(new Set(result.validEvidence.map(evidence => evidence.id)).size, 2)
})

test('same turn and behavior can support different dimensions', () => {
  const result = validateEvaluationEvidenceBatch([
    { ...validInput, dimensionKey: 'probing' },
    { ...validInput, dimensionKey: 'communication' },
  ], { turns })

  assert.equal(result.validEvidence.length, 2)
})

test('empty batch returns empty arrays without issues', () => {
  assert.deepEqual(validateEvaluationEvidenceBatch([], { turns }), {
    validEvidence: [],
    rejectedEvidence: [],
    issues: [],
  })
})

test('validation issues remain privacy-safe', () => {
  const privateBehavior = 'Private behavior text that must not enter issue messages.'
  const privateTranscript = turns[1].text
  const result = validateEvaluationEvidenceBatch([
    { ...validInput, dimensionKey: 'unsupported', behaviorObserved: privateBehavior },
  ], { turns })
  const serializedIssues = JSON.stringify(result.issues)

  assert.equal(serializedIssues.includes(privateBehavior), false)
  assert.equal(serializedIssues.includes(privateTranscript), false)
  assert.equal(serializedIssues.includes('persona'), false)
  assert.equal(serializedIssues.includes('hidden'), false)
})

test('normalization and validation do not mutate evidence or transcript inputs', () => {
  const input = { ...validInput }
  const inputSnapshot = JSON.stringify(input)
  const turnsSnapshot = JSON.stringify(turns)

  normalizeEvaluationEvidence(input)
  validateEvaluationEvidenceBatch([input], { turns })

  assert.equal(JSON.stringify(input), inputSnapshot)
  assert.equal(JSON.stringify(turns), turnsSnapshot)
})

test('repeated batch validation is deterministic', () => {
  const inputs = [
    { ...validInput, dimensionKey: 'probing' },
    { ...validInput, dimensionKey: 'closing', turnSequence: 7 },
  ]

  assert.deepEqual(
    validateEvaluationEvidenceBatch(inputs, { turns }),
    validateEvaluationEvidenceBatch(inputs, { turns })
  )
})

test('default dimension vocabulary is explicit', () => {
  assert.deepEqual(EVALUATION_DIMENSION_KEYS, [
    'approaching',
    'probing',
    'home_qualification',
    'solution_presentation',
    'objection_handling',
    'closing',
    'communication',
    'compliance',
  ])
})
