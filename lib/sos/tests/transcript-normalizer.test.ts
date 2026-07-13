import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendNormalizedTurn,
  buildTranscriptDedupeKey,
  combineTranscriptTextParts,
  createTranscriptNormalizerState,
  normalizeTranscriptText,
  normalizedTurnToLegacyTranscriptTurn,
} from '../transcript-normalizer'

const baseTime = '2026-07-13T10:00:00.000Z'

function timeAfter(ms: number): string {
  return new Date(Date.parse(baseTime) + ms).toISOString()
}

test('appendNormalizedTurn assigns sequence and retains timestamp and source', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, {
    role: 'sales',
    text: 'Saya tertarik.',
    source: 'gemini_live_input',
    timestamp: baseTime,
  })
  state = appendNormalizedTurn(state, {
    role: 'customer',
    text: 'Baik, boleh saya jelaskan dulu kekhawatiran saya.',
    source: 'gemini_live_model',
    timestamp: timeAfter(1000),
  })

  assert.equal(state.turns[0].sequence, 1)
  assert.equal(state.turns[1].sequence, 2)
  assert.equal(state.turns[0].timestamp, baseTime)
  assert.equal(state.turns[0].source, 'gemini_live_input')
})

test('empty transcript input is ignored', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: '', source: 'manual', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: '   \n  ', source: 'manual', timestamp: baseTime })

  assert.equal(state.turns.length, 0)
  assert.equal(state.nextSequence, 1)
})

test('exact duplicate within duplicate window is ignored', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya tertarik.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya tertarik.', source: 'gemini_live_input', timestamp: timeAfter(1000) })

  assert.equal(state.turns.length, 1)
})

test('formatting duplicate within duplicate window is ignored', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya tertarik.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: 'saya tertarik', source: 'gemini_live_input', timestamp: timeAfter(1000) })
  state = appendNormalizedTurn(state, { role: 'sales', text: '  Saya   tertarik.  ', source: 'gemini_live_input', timestamp: timeAfter(2000) })

  assert.equal(state.turns.length, 1)
  assert.equal(state.turns[0].text, 'Saya tertarik.')
})

test('cross-source duplicate within duplicate window is ignored', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya kerja freelance.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya kerja freelance', source: 'fallback', timestamp: timeAfter(1000) })

  assert.equal(state.turns.length, 1)
})

test('same text from different roles is not deduplicated', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Baik.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'customer', text: 'Baik.', source: 'gemini_live_model', timestamp: timeAfter(1000) })

  assert.equal(state.turns.length, 2)
})

test('same role and text outside duplicate window is accepted', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Baik, Bu.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Baik, Bu.', source: 'gemini_live_input', timestamp: timeAfter(6000) })

  assert.equal(state.turns.length, 2)
  assert.equal(state.turns[1].sequence, 2)
})

test('different meaningful text remains separate', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya punya cicilan motor.', source: 'gemini_live_input', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Saya tidak punya cicilan motor.', source: 'gemini_live_input', timestamp: timeAfter(1000) })

  assert.equal(state.turns.length, 2)
})

test('legacy transcript conversion maps sales to user and customer to model', () => {
  let state = createTranscriptNormalizerState()
  state = appendNormalizedTurn(state, { role: 'sales', text: 'Halo.', source: 'manual', timestamp: baseTime })
  state = appendNormalizedTurn(state, { role: 'customer', text: 'Halo juga.', source: 'manual', timestamp: timeAfter(1000) })

  assert.deepEqual(state.turns.map(normalizedTurnToLegacyTranscriptTurn), [
    { role: 'user', text: 'Halo.' },
    { role: 'model', text: 'Halo juga.' },
  ])
})

test('text normalization is conservative and dedupe key is case-insensitive', () => {
  const normalized = normalizeTranscriptText('  Saya\n\n tertarik.  ')
  const key = buildTranscriptDedupeKey({ role: 'sales', text: 'saya tertarik', source: 'manual' }, normalized)

  assert.equal(normalized, 'Saya tertarik.')
  assert.equal(key, 'sales:saya tertarik')
})

test('combineTranscriptTextParts joins multiple provider text parts into one input', () => {
  const combined = combineTranscriptTextParts([
    { text: 'Saya tertarik.' },
    { text: ' Tapi masih ragu.' },
    { text: '  ' },
    'Boleh tanya dulu?',
  ])

  assert.equal(combined, 'Saya tertarik. Tapi masih ragu. Boleh tanya dulu?')
})
