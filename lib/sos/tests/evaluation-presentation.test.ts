import test from 'node:test'
import assert from 'node:assert/strict'
import {
  allHomeCategoryPresentations,
  evaluationRuleLabel,
  evaluationSeverityLabel,
  homeCategoryPresentation,
  knownMissingHomeCategories,
  transcriptReasonLabel,
  uniqueTranscriptReasonLabels,
} from '../evaluation/presentation'

test('all trial score rules have readable Indonesian labels', () => {
  const labels: Record<string, string> = {
    DOCUMENT_MANIPULATION: 'Saran manipulasi dokumen',
    DISCRIMINATORY_LANGUAGE: 'Bahasa diskriminatif',
    PRIVACY_RISK: 'Risiko privasi data konsumen',
    GUARANTEE_LANGUAGE: 'Janji kepastian persetujuan',
    PRESSURE_TACTIC: 'Tekanan berlebihan kepada konsumen',
    NO_MEANINGFUL_DISCOVERY: 'Tidak ada penggalian kebutuhan yang memadai',
    MATERIAL_COST_OMITTED: 'Biaya penting tidak dijelaskan',
    CLOSING_BEFORE_DISCOVERY: 'Closing dilakukan terlalu awal',
    UNVERIFIED_CLAIM: 'Klaim belum terverifikasi',
  }

  for (const [ruleId, label] of Object.entries(labels)) {
    assert.equal(evaluationRuleLabel(ruleId), label)
  }
})

test('severity labels and unknown fallback never expose internal values', () => {
  assert.equal(evaluationSeverityLabel('critical'), 'Kritis')
  assert.equal(evaluationSeverityLabel('SERIOUS'), 'Serius')
  assert.equal(evaluationSeverityLabel(' warning '), 'Perlu Perhatian')
  assert.equal(evaluationSeverityLabel('INTERNAL_SEVERITY'), 'Perlu Ditinjau')
  assert.equal(evaluationSeverityLabel('INTERNAL_SEVERITY').includes('INTERNAL'), false)
})

test('transcript reasons map to leadership-safe messages', () => {
  const labels: Record<string, string> = {
    NO_VALID_TURNS: 'Tidak ada percakapan valid yang dapat dianalisis.',
    NO_CUSTOMER_TURNS: 'Respons calon konsumen tidak cukup terekam.',
    INSUFFICIENT_SALES_TURNS: 'Jumlah respons sales belum cukup untuk penilaian menyeluruh.',
    TRANSCRIPT_TOO_SHORT: 'Percakapan terlalu singkat untuk penilaian yang kuat.',
  }

  for (const [reason, label] of Object.entries(labels)) {
    assert.equal(transcriptReasonLabel(reason), label)
  }
  assert.equal(
    transcriptReasonLabel('INTERNAL_REASON'),
    'Data percakapan belum cukup untuk evaluasi menyeluruh.'
  )
})

test('transcript reason list is defensive and deduplicates unknown fallbacks', () => {
  assert.deepEqual(uniqueTranscriptReasonLabels(undefined), [
    'Data percakapan belum cukup untuk evaluasi menyeluruh.',
  ])
  assert.deepEqual(uniqueTranscriptReasonLabels(['UNKNOWN_ONE', 'UNKNOWN_TWO', null]), [
    'Data percakapan belum cukup untuk evaluasi menyeluruh.',
  ])
})

test('HOME category presentation uses fixed labels and rejects unknown keys', () => {
  assert.deepEqual(allHomeCategoryPresentations(), [
    { key: 'housing', label: 'Housing', description: 'Kondisi tempat tinggal' },
    { key: 'occupation', label: 'Occupation', description: 'Pekerjaan' },
    { key: 'money', label: 'Money', description: 'Kemampuan finansial' },
    { key: 'eligibility', label: 'Eligibility', description: 'Kelayakan dasar' },
  ])
  assert.deepEqual(homeCategoryPresentation(' HOUSING '), {
    key: 'housing',
    label: 'Housing',
    description: 'Kondisi tempat tinggal',
  })
  assert.equal(homeCategoryPresentation('INTERNAL_HOME_KEY'), null)
})

test('missing HOME categories normalize, deduplicate, and omit malformed values', () => {
  assert.deepEqual(
    knownMissingHomeCategories(['MONEY', 'money', 'eligibility', 'INTERNAL_HOME_KEY', null]),
    ['money', 'eligibility']
  )
  assert.deepEqual(knownMissingHomeCategories('money'), [])
})

test('unknown rule ID uses a fixed label instead of exposing the identifier', () => {
  const label = evaluationRuleLabel('PRIVATE_INTERNAL_RULE')
  assert.equal(label, 'Temuan evaluasi penting')
  assert.equal(label.includes('PRIVATE_INTERNAL_RULE'), false)
})
