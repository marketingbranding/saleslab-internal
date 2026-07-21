export const ANALYZE_LIMITS = {
  maxBodyBytes: 1_000_000,
  maxTranscriptTurns: 200,
  maxCharactersPerTurn: 5_000,
  maxTotalTranscriptCharacters: 100_000,
} as const

export interface ValidatedAnalyzeRequest {
  sessionId: string
  salespersonName: string
  personaVersion?: number
  scenario: Record<string, unknown>
  transcript: Array<{ role: 'user' | 'model'; text: string }>
}

export class AnalyzeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnalyzeValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(data: Record<string, unknown>, key: string, maxLength: number) {
  const value = data[key]
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new AnalyzeValidationError(`Field scenario.${key} tidak valid.`)
  }
}

export function validateAnalyzeRequest(body: unknown): ValidatedAnalyzeRequest {
  if (!isRecord(body)) throw new AnalyzeValidationError('Body request tidak valid.')

  const { sessionId, salespersonName, scenario, transcript, personaVersion } = body
  if (typeof sessionId !== 'string' || sessionId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    throw new AnalyzeValidationError('Session ID tidak valid.')
  }
  if (typeof salespersonName !== 'string' || salespersonName.trim().length === 0 || salespersonName.length > 100) {
    throw new AnalyzeValidationError('Nama sales tidak valid.')
  }
  if (personaVersion !== undefined && (!Number.isInteger(personaVersion) || Number(personaVersion) < 1 || Number(personaVersion) > 10_000)) {
    throw new AnalyzeValidationError('Versi persona tidak valid.')
  }
  if (!isRecord(scenario)) throw new AnalyzeValidationError('Data skenario tidak valid.')

  requiredString(scenario, 'id', 128)
  if (!/^[a-zA-Z0-9_-]+$/.test(String(scenario.id))) throw new AnalyzeValidationError('ID skenario tidak valid.')
  requiredString(scenario, 'title', 200)
  requiredString(scenario, 'description', 3_000)
  requiredString(scenario, 'target', 2_000)
  requiredString(scenario, 'consumerProfile', 5_000)
  requiredString(scenario, 'icon', 100)
  requiredString(scenario, 'name', 100)
  if (!['Easy', 'Medium', 'Hard'].includes(String(scenario.difficulty))) throw new AnalyzeValidationError('Tingkat kesulitan tidak valid.')
  if (!['Pria', 'Wanita'].includes(String(scenario.gender))) throw new AnalyzeValidationError('Gender persona tidak valid.')
  if (!Number.isInteger(scenario.aggressiveness) || Number(scenario.aggressiveness) < 1 || Number(scenario.aggressiveness) > 10) throw new AnalyzeValidationError('Agresivitas persona tidak valid.')
  if (!Number.isInteger(scenario.patience) || Number(scenario.patience) < 1 || Number(scenario.patience) > 10) throw new AnalyzeValidationError('Kesabaran persona tidak valid.')
  if (!['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(String(scenario.responseStyle))) throw new AnalyzeValidationError('Gaya respons tidak valid.')
  if (!['AI', 'Sales'].includes(String(scenario.firstSpeaker))) throw new AnalyzeValidationError('Pembicara pertama tidak valid.')

  if (!Array.isArray(transcript) || transcript.length === 0 || transcript.length > ANALYZE_LIMITS.maxTranscriptTurns) {
    throw new AnalyzeValidationError('Jumlah percakapan tidak valid.')
  }

  let totalCharacters = 0
  const validatedTranscript = transcript.map((turn, index) => {
    if (!isRecord(turn) || !['user', 'model'].includes(String(turn.role)) || typeof turn.text !== 'string') {
      throw new AnalyzeValidationError(`Percakapan ke-${index + 1} tidak valid.`)
    }
    if (turn.text.length === 0 || turn.text.length > ANALYZE_LIMITS.maxCharactersPerTurn) {
      throw new AnalyzeValidationError(`Panjang percakapan ke-${index + 1} tidak valid.`)
    }
    totalCharacters += turn.text.length
    return { role: turn.role as 'user' | 'model', text: turn.text }
  })
  if (totalCharacters > ANALYZE_LIMITS.maxTotalTranscriptCharacters) {
    throw new AnalyzeValidationError('Total panjang transkrip melebihi batas.')
  }

  return {
    sessionId,
    salespersonName: salespersonName.trim(),
    scenario,
    transcript: validatedTranscript,
    ...(personaVersion === undefined ? {} : { personaVersion: Number(personaVersion) }),
  }
}
