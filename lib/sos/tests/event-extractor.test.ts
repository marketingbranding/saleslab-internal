import test from 'node:test'
import assert from 'node:assert/strict'
import { extractDeterministicEvents } from '../event-extractor'
import type { NormalizedTurn, RoleplayEvent, RoleplayEventType, TurnRole } from '../types'

const sessionId = 'test-session'
const baseTimestamp = '2026-07-13T10:00:00.000Z'

function turn(sequence: number, role: TurnRole, text: string): NormalizedTurn {
  return {
    sequence,
    role,
    text,
    timestamp: baseTimestamp,
    source: role === 'sales' ? 'gemini_live_input' : 'gemini_live_model',
    finalized: true,
  }
}

function eventTypes(events: RoleplayEvent[]): RoleplayEventType[] {
  return events.map(event => event.eventType)
}

function extract(currentTurn: NormalizedTurn, existingEvents: RoleplayEvent[] = [], previousTurns: NormalizedTurn[] = []) {
  return extractDeterministicEvents(currentTurn, { sessionId, existingEvents, previousTurns }).events
}

test('sales greeting triggers APPROACHING_STARTED once', () => {
  const firstTurn = turn(1, 'sales', 'Halo, selamat pagi Bu, perkenalkan saya dari SalesLab.')
  const events = extract(firstTurn)
  const repeated = extract(turn(2, 'sales', 'Halo lagi Bu.'), events, [firstTurn])

  assert.ok(eventTypes(events).includes('APPROACHING_STARTED'))
  assert.equal(repeated.some(event => event.eventType === 'APPROACHING_STARTED'), false)
})

test('sales occupation discovery question triggers PROBING_STARTED but generic question does not', () => {
  const probing = extract(turn(1, 'sales', 'Pekerjaan Ibu sekarang sebagai apa?'))
  const generic = extract(turn(2, 'sales', 'Bagaimana, Pak?'))

  assert.deepEqual(eventTypes(probing), ['PROBING_STARTED'])
  assert.equal(generic.length, 0)
})

test('customer HOME statements trigger correct discovery events', () => {
  assert.ok(eventTypes(extract(turn(1, 'customer', 'Saya masih ngontrak.'))).includes('HOUSING_INFO_DISCOVERED'))
  assert.ok(eventTypes(extract(turn(2, 'customer', 'Saya kerja sebagai driver ojol.'))).includes('OCCUPATION_INFO_DISCOVERED'))
  assert.ok(eventTypes(extract(turn(3, 'customer', 'Penghasilan saya sekitar empat juta per bulan.'))).includes('MONEY_INFO_DISCOVERED'))
  assert.ok(eventTypes(extract(turn(4, 'customer', 'Saya belum pernah punya rumah.'))).includes('ELIGIBILITY_INFO_DISCOVERED'))
})

test('customer objection triggers OBJECTION_RAISED with topic', () => {
  const events = extract(turn(1, 'customer', 'Saya takut cicilannya terlalu berat.'))
  const objection = events.find(event => event.eventType === 'OBJECTION_RAISED')

  assert.ok(objection)
  assert.equal(objection.topic, 'price')
})

test('tapi alone does not trigger objection without another concern indicator', () => {
  const neutral = extract(turn(1, 'customer', 'Saya kerja di toko, tapi rumah saya dekat.'))
  const concern = extract(turn(2, 'customer', 'Tapi saya takut cicilannya berat.'))

  assert.equal(eventTypes(neutral).includes('OBJECTION_RAISED'), false)
  assert.equal(eventTypes(concern).includes('OBJECTION_RAISED'), true)
})

test('customer concrete interest triggers BUYING_SIGNAL_DETECTED', () => {
  const events = extract(turn(1, 'customer', 'Saya tertarik, kapan bisa survey?'))

  assert.ok(eventTypes(events).includes('BUYING_SIGNAL_DETECTED'))
})

test('sales concrete next action request triggers CLOSING_ATTEMPTED', () => {
  const events = extract(turn(1, 'sales', 'Kalau cocok, mau kita jadwalkan survey?'))

  assert.ok(eventTypes(events).includes('CLOSING_ATTEMPTED'))
})

test('explicit customer agreement triggers NEXT_STEP_AGREED', () => {
  const events = extract(turn(1, 'customer', 'Baik, besok saya datang untuk survey.'))

  assert.ok(eventTypes(events).includes('NEXT_STEP_AGREED'))
})

test('sales guarantee language triggers GUARANTEE_LANGUAGE with exclusions', () => {
  const unsafe = extract(turn(1, 'sales', 'Tenang, pasti disetujui bank.'))
  const safe = extract(turn(2, 'sales', 'Tidak bisa dijamin karena keputusan tetap di bank.'))

  assert.ok(eventTypes(unsafe).includes('GUARANTEE_LANGUAGE'))
  assert.equal(eventTypes(safe).includes('GUARANTEE_LANGUAGE'), false)
})

test('document manipulation triggers event with negation exclusion', () => {
  const unsafe = extract(turn(1, 'sales', 'Nanti slip gajinya kita edit saja.'))
  const safe = extract(turn(2, 'sales', 'Slip gaji tidak boleh diedit.'))

  assert.ok(eventTypes(unsafe).includes('DOCUMENT_MANIPULATION_SUGGESTED'))
  assert.equal(eventTypes(safe).includes('DOCUMENT_MANIPULATION_SUGGESTED'), false)
})

test('document manipulation exclusion only applies to direct negation of manipulation', () => {
  const safeWarnings = [
    'Jangan mengubah slip gaji.',
    'Slip gaji tidak boleh diedit.',
    'Dokumen dilarang dimanipulasi.',
    'Hindari merekayasa mutasi rekening.',
  ]
  const unsafeSuggestions = [
    'Jangan khawatir, slip gajinya kita edit saja.',
    'Jangan bilang bank, cicilannya kita sembunyikan.',
    'Tidak boleh ketahuan, rekeningnya kita edit.',
    'Tenang saja, kita akal-akali dokumennya.',
  ]

  for (const [index, text] of safeWarnings.entries()) {
    assert.equal(eventTypes(extract(turn(index + 10, 'sales', text))).includes('DOCUMENT_MANIPULATION_SUGGESTED'), false)
  }

  for (const [index, text] of unsafeSuggestions.entries()) {
    assert.equal(eventTypes(extract(turn(index + 20, 'sales', text))).includes('DOCUMENT_MANIPULATION_SUGGESTED'), true)
  }
})

test('clear coercive language triggers PRESSURE_TACTIC', () => {
  const events = extract(turn(1, 'sales', 'Harus booking sekarang atau unitnya saya kasih orang lain.'))

  assert.ok(eventTypes(events).includes('PRESSURE_TACTIC'))
})

test('role restrictions prevent customer question from triggering guarantee event', () => {
  const events = extract(turn(1, 'customer', 'Pasti disetujui?'))

  assert.equal(eventTypes(events).includes('GUARANTEE_LANGUAGE'), false)
})

test('processing the same turn twice with existing events does not duplicate events', () => {
  const currentTurn = turn(1, 'sales', 'Tenang, pasti lolos.')
  const first = extract(currentTurn)
  const second = extract(currentTurn, first)

  assert.equal(first.length, 1)
  assert.equal(second.length, 0)
})

test('a single turn may produce multiple valid events', () => {
  const events = extract(turn(1, 'customer', 'Saya tertarik, boleh dijadwalkan survey besok?'))

  assert.ok(eventTypes(events).includes('BUYING_SIGNAL_DETECTED'))
  assert.ok(eventTypes(events).includes('NEXT_STEP_AGREED'))
})

test('event IDs are deterministic', () => {
  const events = extract(turn(7, 'sales', 'Tenang, pasti lolos.'))

  assert.equal(events[0].id, `${sessionId}:7:GUARANTEE_LANGUAGE`)
  assert.equal(events[0].extractor, 'deterministic')
  assert.equal(events[0].createdAt, baseTimestamp)
})
