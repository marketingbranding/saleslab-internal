import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LegacyEvaluationInputError,
  reconstructLegacyEvaluationInput,
} from '../evaluation/legacy-input'

const scenario = {
  id: 'legacy-evaluator',
  title: 'Evaluasi Inquiry',
  description: 'Uji evaluator legacy.',
  target: 'Jadwalkan survey.',
  consumerProfile: 'Pelanggan berhati-hati.',
  difficulty: 'Medium',
  icon: 'Target',
  name: 'Ibu Rina',
  gender: 'Wanita',
  aggressiveness: 4,
  patience: 6,
  responseStyle: 'Ragu-ragu',
  firstSpeaker: 'AI',
  hiddenRules: 'Nilai tersembunyi tidak boleh masuk context.',
}

const transcript = [
  { role: 'model', text: 'Saya ingin bertanya dulu.' },
  { role: 'user', text: 'Selamat pagi, Bu. Saat ini masih tinggal di mana?' },
  { role: 'customer', text: 'Saya masih ngontrak bersama keluarga.' },
  { role: 'sales', text: 'Pekerjaan Ibu saat ini sebagai apa?' },
]

test('legacy input reconstructs mapped domain, turns, events, state, and context', () => {
  const result = reconstructLegacyEvaluationInput({ scenario, transcript })

  assert.equal(result.scenario.id, scenario.id)
  assert.equal(result.scenario.name, scenario.title)
  assert.equal(result.persona.name, scenario.name)
  assert.deepEqual(result.turns.map(turn => turn.role), ['customer', 'sales', 'customer', 'sales'])
  assert.deepEqual(result.turns.map(turn => turn.sequence), [1, 2, 3, 4])
  assert.ok(result.turns.every(turn => turn.timestamp === '1970-01-01T00:00:00.000Z'))
  assert.ok(result.turns.every(turn => turn.source === 'legacy' && turn.finalized))
  assert.ok(result.events.some(event => event.eventType === 'APPROACHING_STARTED'))
  assert.ok(result.events.some(event => event.eventType === 'PROBING_STARTED'))
  assert.equal(result.finalState.processedEventIds.length, result.events.length)
  assert.equal(result.context.scenarioId, scenario.id)
  assert.equal(result.context.turns.length, 4)
  assert.equal(JSON.stringify(result.context).includes(scenario.hiddenRules), false)
})

test('malformed transcript entries are ignored and accepted turns are sequenced deterministically', () => {
  const result = reconstructLegacyEvaluationInput({
    scenario,
    transcript: [
      null,
      { role: 'unknown', text: 'ignored' },
      { role: 'user', text: '   ' },
      { role: 'user', text: ' Pertanyaan pertama. ' },
      { role: 'model', text: 'Jawaban.' },
    ],
  })

  assert.deepEqual(result.turns.map(turn => ({ sequence: turn.sequence, text: turn.text })), [
    { sequence: 1, text: 'Pertanyaan pertama.' },
    { sequence: 2, text: 'Jawaban.' },
  ])
})

test('empty or invalid transcript produces a controlled reconstruction error', () => {
  for (const invalidTranscript of [undefined, 'invalid', [], [{ role: 'user', text: '   ' }]]) {
    assert.throws(
      () => reconstructLegacyEvaluationInput({ scenario, transcript: invalidTranscript }),
      LegacyEvaluationInputError
    )
  }
})

test('legitimate repeated transcript statements remain separate', () => {
  const result = reconstructLegacyEvaluationInput({
    scenario,
    transcript: [
      { role: 'user', text: 'Baik, Bu.' },
      { role: 'user', text: 'Baik, Bu.' },
    ],
  })

  assert.equal(result.turns.length, 2)
  assert.deepEqual(result.turns.map(turn => turn.text), ['Baik, Bu.', 'Baik, Bu.'])
})

test('incomplete scenario uses safe mapper-compatible defaults without mutating input', () => {
  const incompleteScenario = { title: 'Minimal Scenario' }
  const snapshot = JSON.stringify({ incompleteScenario, transcript })

  const result = reconstructLegacyEvaluationInput({ scenario: incompleteScenario, transcript })

  assert.equal(result.scenario.name, 'Minimal Scenario')
  assert.equal(result.persona.name, 'Pelanggan')
  assert.equal(JSON.stringify({ incompleteScenario, transcript }), snapshot)
})

test('missing scenario object is rejected', () => {
  assert.throws(
    () => reconstructLegacyEvaluationInput({ scenario: null, transcript }),
    LegacyEvaluationInputError
  )
})
