import type { NormalizedTurn, TurnRole, TurnSource } from './types'

const DEFAULT_DUPLICATE_WINDOW_MS = 5000
const RECENT_TURN_LIMIT = 8

export interface TranscriptInput {
  role: TurnRole
  text: string
  source: TurnSource
  timestamp?: string
  finalized?: boolean
  confidence?: number
  rawRef?: string
}

export interface TranscriptNormalizerState {
  turns: NormalizedTurn[]
  nextSequence: number
}

export interface LegacyTranscriptTurn {
  role: 'user' | 'model'
  text: string
}

export function createTranscriptNormalizerState(): TranscriptNormalizerState {
  return { turns: [], nextSequence: 1 }
}

export function normalizeTranscriptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeForComparison(text: string): string {
  return normalizeTranscriptText(text)
    .toLowerCase()
    .replace(/[.!?。？！]+$/g, '')
    .replace(/([.!?]){2,}/g, '$1')
    .trim()
}

export function buildTranscriptDedupeKey(input: TranscriptInput, normalizedText = normalizeTranscriptText(input.text)): string {
  return `${input.role}:${normalizeForComparison(normalizedText)}`
}

function getTimestampMs(timestamp: string): number | null {
  const time = Date.parse(timestamp)
  return Number.isFinite(time) ? time : null
}

function isDuplicateWithinWindow(turn: NormalizedTurn, dedupeKey: string, timestamp: string): boolean {
  if (turn.dedupeKey !== dedupeKey) return false

  const currentMs = getTimestampMs(timestamp)
  const previousMs = getTimestampMs(turn.timestamp)
  if (currentMs === null || previousMs === null) return false

  return Math.abs(currentMs - previousMs) <= DEFAULT_DUPLICATE_WINDOW_MS
}

export function appendNormalizedTurn(
  state: TranscriptNormalizerState,
  input: TranscriptInput
): TranscriptNormalizerState {
  const text = normalizeTranscriptText(input.text)
  if (!text) return state

  const timestamp = input.timestamp ?? new Date().toISOString()
  const dedupeKey = buildTranscriptDedupeKey(input, text)
  const recentTurns = state.turns.slice(-RECENT_TURN_LIMIT)

  if (recentTurns.some(turn => isDuplicateWithinWindow(turn, dedupeKey, timestamp))) {
    return state
  }

  const nextTurn: NormalizedTurn = {
    sequence: state.nextSequence,
    role: input.role,
    text,
    timestamp,
    source: input.source,
    finalized: input.finalized ?? true,
    confidence: input.confidence,
    dedupeKey,
    rawRefs: input.rawRef ? [input.rawRef] : undefined,
  }

  return {
    turns: [...state.turns, nextTurn],
    nextSequence: state.nextSequence + 1,
  }
}

export function normalizedTurnToLegacyTranscriptTurn(turn: NormalizedTurn): LegacyTranscriptTurn {
  return {
    role: turn.role === 'sales' ? 'user' : 'model',
    text: turn.text,
  }
}
