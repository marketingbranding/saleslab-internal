import type { EventSeverity, NormalizedTurn, RoleplayEvent, RoleplayEventType, TurnRole } from './types'
import { normalizeTranscriptText } from './transcript-normalizer'

export interface EventExtractorContext {
  sessionId: string
  previousTurns?: NormalizedTurn[]
  existingEvents?: RoleplayEvent[]
}

export interface EventExtractionResult {
  events: RoleplayEvent[]
}

interface DetectionResult {
  matched: boolean
  topic?: string
  payload?: Record<string, unknown>
}

interface EventRule {
  eventType: RoleplayEventType
  allowedRoles: TurnRole[]
  severity: EventSeverity
  confidence: number
  detect: (text: string, turn: NormalizedTurn, context: EventExtractorContext) => DetectionResult
}

function normalizeForDetection(text: string): string {
  return normalizeTranscriptText(text).toLowerCase()
}

function includesAny(text: string, indicators: string[]): string[] {
  return indicators.filter(indicator => text.includes(indicator))
}

function firstMatch(text: string, indicators: string[]): string | undefined {
  return indicators.find(indicator => text.includes(indicator))
}

function hasExistingEvent(context: EventExtractorContext, eventType: RoleplayEventType): boolean {
  return Boolean(context.existingEvents?.some(event => event.eventType === eventType))
}

function hasPreviousClosingAttempt(context: EventExtractorContext): boolean {
  return Boolean(context.existingEvents?.some(event => event.eventType === 'CLOSING_ATTEMPTED'))
}

function isDuplicateEvent(context: EventExtractorContext, turn: NormalizedTurn, eventType: RoleplayEventType): boolean {
  const eventId = buildEventId(context.sessionId, turn.sequence, eventType)
  return Boolean(context.existingEvents?.some(event =>
    event.id === eventId ||
    (event.sourceTurnSequence === turn.sequence && event.eventType === eventType)
  ))
}

function buildEventId(sessionId: string, sequence: number, eventType: RoleplayEventType): string {
  return `${sessionId}:${sequence}:${eventType}`
}

function createEvent(
  context: EventExtractorContext,
  turn: NormalizedTurn,
  rule: EventRule,
  detection: DetectionResult
): RoleplayEvent {
  return {
    id: buildEventId(context.sessionId, turn.sequence, rule.eventType),
    sessionId: context.sessionId,
    eventType: rule.eventType,
    severity: rule.severity,
    topic: detection.topic,
    sourceTurnSequence: turn.sequence,
    confidence: rule.confidence,
    extractor: 'deterministic',
    payload: detection.payload,
    createdAt: turn.timestamp,
  }
}

function matchedIndicators(text: string, indicators: string[]): DetectionResult {
  const matches = includesAny(text, indicators)
  return { matched: matches.length > 0, payload: matches.length > 0 ? { matchedIndicators: matches } : undefined }
}

const approachingIndicators = [
  'selamat pagi', 'selamat siang', 'selamat sore', 'halo', 'assalamualaikum',
  'perkenalkan', 'saya dari', 'dengan bapak', 'dengan ibu',
]

const probingIndicators = [
  'tinggal di mana', 'rumah sendiri atau kontrak', 'pekerjaan', 'kerja sebagai apa',
  'penghasilan', 'pendapatan', 'cicilan', 'status menikah', 'sudah punya rumah',
  'pernah menerima subsidi', 'dokumen', 'slik', 'bi checking', 'kebutuhan rumah',
  'alasan mencari rumah',
]

const housingIndicators = ['tinggal dengan orang tua', 'masih kontrak', 'masih ngontrak', 'kos', 'rumah keluarga', 'belum punya rumah', 'sudah punya rumah']
const occupationIndicators = ['saya kerja', 'pekerjaan saya', 'karyawan', 'pegawai', 'ojol', 'driver', 'pedagang', 'usaha', 'freelance', 'honorer', 'wiraswasta']
const moneyIndicators = ['penghasilan saya', 'gaji saya', 'pendapatan', 'per bulan', 'cicilan', 'angsuran', 'utang', 'hutang', 'pengeluaran']
const eligibilityIndicators = ['belum pernah punya rumah', 'sudah punya rumah', 'belum pernah dapat subsidi', 'pernah menerima subsidi', 'sudah menikah', 'belum menikah', 'ktp', 'kk', 'npwp', 'slik', 'bi checking']

const solutionIndicators = [
  'solusinya', 'yang bisa dilakukan', 'opsinya', 'bisa menggunakan', 'bisa disiapkan',
  'kita bisa bantu', 'lebih cocok', 'sesuai kebutuhan', 'rumah ini memiliki',
  'keuntungannya', 'manfaatnya',
]

const objectionIndicators = [
  'tapi', 'saya takut', 'saya khawatir', 'saya ragu', 'mahal', 'belum siap',
  'tidak yakin', 'enggak yakin', 'nggak yakin', 'saya pikir dulu', 'harus tanya pasangan',
  'lokasinya jauh', 'cicilannya berat', 'takut ditolak', 'dokumennya susah',
]

const buyingSignalIndicators = [
  'saya tertarik', 'boleh lihat lokasi', 'kapan bisa survey', 'dokumennya apa saja',
  'cara daftarnya bagaimana', 'berapa booking', 'unitnya masih ada', 'bisa dijadwalkan',
  'saya mau lanjut',
]

const closingIndicators = [
  'mau kita jadwalkan survey', 'bisa kita proses', 'kita lanjutkan', 'booking sekarang',
  'isi formulir', 'kumpulkan dokumen', 'jadwalkan kunjungan', 'buat janji',
  'transfer booking', 'amankan unit',
]

const customerNextStepIndicators = [
  'baik, saya kirim dokumennya', 'boleh dijadwalkan', 'saya setuju survey',
  'ya, kita lanjut', 'besok saya datang', 'saya datang untuk survey',
  'saya kirim dokumen', 'boleh dijadwalkan survey',
]

const salesNextStepIndicators = [
  'baik, berarti besok kita survey', 'saya jadwalkan hari jumat', 'saya tunggu dokumennya',
  'berarti besok kita survey', 'saya jadwalkan',
]

const guaranteeIndicators = ['pasti disetujui', 'pasti lolos', 'dijamin lolos', '100 persen lolos', 'bank pasti approve', 'tidak mungkin ditolak', 'saya jamin']
const guaranteeExclusions = ['tidak bisa dijamin', 'tidak dapat dijamin', 'tidak bisa saya jamin', 'tidak dapat saya jamin', 'belum tentu', 'keputusan tetap di bank', 'tetap keputusan bank', 'hasil akhirnya tetap keputusan bank']

const documentManipulationIndicators = [
  'ubah slip gaji', 'buat slip gaji', 'edit rekening', 'rekayasa mutasi', 'pinjam rekening',
  'buat surat palsu', 'naikkan penghasilan', 'sembunyikan cicilan', 'hapus riwayat',
  'akal-akali dokumen', 'manipulasi data', 'slip gajinya kita edit', 'slip gaji kita edit',
]
const documentManipulationExclusions = ['jangan', 'tidak boleh', 'dilarang', 'hindari']

const pressureIndicators = [
  'harus booking sekarang', 'kalau tidak sekarang hangus', 'transfer sekarang juga',
  'jangan pikir lama-lama', 'wajib ambil hari ini', 'kalau tidak unit saya kasih orang lain',
]

function inferObjectionTopic(text: string): string {
  if (text.includes('mahal') || text.includes('cicilan') || text.includes('berat')) return 'price'
  if (text.includes('lokasi') || text.includes('jauh')) return 'location'
  if (text.includes('ditolak') || text.includes('bi checking') || text.includes('slik')) return 'eligibility'
  if (text.includes('dokumen')) return 'documents'
  if (text.includes('pasangan')) return 'partner'
  if (text.includes('pikir dulu') || text.includes('belum siap')) return 'timing'
  if (text.includes('ragu') || text.includes('khawatir') || text.includes('takut')) return 'trust'
  return 'other'
}

const eventRules: EventRule[] = [
  {
    eventType: 'APPROACHING_STARTED',
    allowedRoles: ['sales'],
    severity: 'LOW',
    confidence: 0.9,
    detect: (text, turn, context) => {
      const previousSalesTurns = context.previousTurns?.filter(previousTurn => previousTurn.role === 'sales').length ?? 0
      if (previousSalesTurns >= 2 || hasExistingEvent(context, 'APPROACHING_STARTED')) return { matched: false }
      return { matched: includesAny(text, approachingIndicators).length > 0 }
    },
  },
  {
    eventType: 'PROBING_STARTED',
    allowedRoles: ['sales'],
    severity: 'LOW',
    confidence: 0.85,
    detect: text => ({ matched: includesAny(text, probingIndicators).length > 0 }),
  },
  {
    eventType: 'HOUSING_INFO_DISCOVERED',
    allowedRoles: ['customer'],
    severity: 'LOW',
    confidence: 0.85,
    detect: text => matchedIndicators(text, housingIndicators),
  },
  {
    eventType: 'OCCUPATION_INFO_DISCOVERED',
    allowedRoles: ['customer'],
    severity: 'LOW',
    confidence: 0.85,
    detect: text => matchedIndicators(text, occupationIndicators),
  },
  {
    eventType: 'MONEY_INFO_DISCOVERED',
    allowedRoles: ['customer'],
    severity: 'LOW',
    confidence: 0.8,
    detect: text => matchedIndicators(text, moneyIndicators),
  },
  {
    eventType: 'ELIGIBILITY_INFO_DISCOVERED',
    allowedRoles: ['customer'],
    severity: 'LOW',
    confidence: 0.85,
    detect: text => matchedIndicators(text, eligibilityIndicators),
  },
  {
    eventType: 'SOLUTION_PRESENTED',
    allowedRoles: ['sales'],
    severity: 'LOW',
    confidence: 0.8,
    detect: text => ({ matched: includesAny(text, solutionIndicators).length > 0 }),
  },
  {
    eventType: 'OBJECTION_RAISED',
    allowedRoles: ['customer'],
    severity: 'MODERATE',
    confidence: 0.85,
    detect: text => ({ matched: includesAny(text, objectionIndicators).length > 0, topic: inferObjectionTopic(text) }),
  },
  {
    eventType: 'BUYING_SIGNAL_DETECTED',
    allowedRoles: ['customer'],
    severity: 'LOW',
    confidence: 0.9,
    detect: text => ({ matched: includesAny(text, buyingSignalIndicators).length > 0 }),
  },
  {
    eventType: 'CLOSING_ATTEMPTED',
    allowedRoles: ['sales'],
    severity: 'LOW',
    confidence: 0.9,
    detect: text => ({ matched: includesAny(text, closingIndicators).length > 0 }),
  },
  {
    eventType: 'NEXT_STEP_AGREED',
    allowedRoles: ['sales', 'customer'],
    severity: 'LOW',
    confidence: 0.92,
    detect: (text, turn, context) => {
      if (turn.role === 'customer') return { matched: includesAny(text, customerNextStepIndicators).length > 0 }
      return { matched: hasPreviousClosingAttempt(context) && includesAny(text, salesNextStepIndicators).length > 0 }
    },
  },
  {
    eventType: 'GUARANTEE_LANGUAGE',
    allowedRoles: ['sales'],
    severity: 'CRITICAL',
    confidence: 0.97,
    detect: text => {
      if (includesAny(text, guaranteeExclusions).length > 0) return { matched: false }
      const matchedPhrase = firstMatch(text, guaranteeIndicators)
      return { matched: Boolean(matchedPhrase), payload: matchedPhrase ? { matchedPhrase } : undefined }
    },
  },
  {
    eventType: 'DOCUMENT_MANIPULATION_SUGGESTED',
    allowedRoles: ['sales'],
    severity: 'CRITICAL',
    confidence: 0.98,
    detect: text => {
      if (includesAny(text, documentManipulationExclusions).length > 0) return { matched: false }
      const matchedPhrase = firstMatch(text, documentManipulationIndicators)
      return { matched: Boolean(matchedPhrase), payload: matchedPhrase ? { matchedPhrase } : undefined }
    },
  },
  {
    eventType: 'PRESSURE_TACTIC',
    allowedRoles: ['sales'],
    severity: 'HIGH',
    confidence: 0.92,
    detect: text => {
      const matchedPhrase = firstMatch(text, pressureIndicators)
      return { matched: Boolean(matchedPhrase), payload: matchedPhrase ? { matchedPhrase } : undefined }
    },
  },
]

export function extractDeterministicEvents(
  turn: NormalizedTurn,
  context: EventExtractorContext
): EventExtractionResult {
  const text = normalizeForDetection(turn.text)
  const events: RoleplayEvent[] = []

  for (const rule of eventRules) {
    if (!rule.allowedRoles.includes(turn.role)) continue
    if (isDuplicateEvent(context, turn, rule.eventType)) continue

    const detection = rule.detect(text, turn, context)
    if (!detection.matched) continue

    events.push(createEvent(context, turn, rule, detection))
  }

  return { events }
}
