import test from 'node:test'
import assert from 'node:assert/strict'
import { buildEvaluationContext } from '../evaluation/context'
import { compileTrialEvaluationPrompt } from '../evaluation/prompt'
import { createInitialRoleplayState } from '../state-reducer'
import type { Persona, RoleplayEvent, Scenario } from '../types'

const persona: Persona = {
  id: 'prompt-persona',
  name: 'Ibu Prompt',
  gender: 'female',
  patience: 5,
  aggressiveness: 4,
  skepticism: 6,
  trustStart: 40,
  hiddenInformation: [{
    key: 'private',
    value: 'HIDDEN_PROMPT_VALUE',
    revealWhen: ['trust>=60'],
    importance: 'critical',
  }],
  objections: [],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'prompt-scenario',
  name: 'Prompt Scenario',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: [],
  expectedClosing: 'Schedule survey',
  forbiddenClosing: 'Force booking',
  targetSkills: ['probing', 'home'],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
}

function context() {
  const turns = [
    { sequence: 1, role: 'customer' as const, text: 'Saya masih ingin bertanya.', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy' as const, finalized: true },
    { sequence: 2, role: 'sales' as const, text: 'Saat ini masih tinggal di mana, Bu?', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy' as const, finalized: true },
  ]
  const events: RoleplayEvent[] = [{
    id: 'event-1',
    sessionId: 'prompt-session',
    eventType: 'PROBING_STARTED',
    severity: 'LOW',
    sourceTurnSequence: 2,
    confidence: 0.9,
    extractor: 'deterministic',
    payload: { private: 'EVENT_PAYLOAD_VALUE' },
    createdAt: '1970-01-01T00:00:00.000Z',
  }]
  const state = {
    ...createInitialRoleplayState(),
    processedEventIds: ['INTERNAL_PROCESSED_ID'],
    complianceFlags: ['PRESSURE_TACTIC'],
  }
  return buildEvaluationContext({ persona, scenario, turns, events, finalState: state })
}

test('trial prompt contains numbered transcript and deterministic summaries', () => {
  const prompt = compileTrialEvaluationPrompt({ context: context() })

  assert.match(prompt, /TURN 1 \| CUSTOMER:/)
  assert.match(prompt, /TURN 2 \| SALES:/)
  assert.match(prompt, /TRANSCRIPT SUFFICIENCY/)
  assert.match(prompt, /HOME DISCOVERY/)
  assert.match(prompt, /PROBING_STARTED: 1/)
  assert.match(prompt, /PRESSURE_TACTIC/)
  assert.match(prompt, /"evidence": \[\{/)
  assert.match(prompt, /Gunakan hanya bukti dari TURN SALES/)
})

test('insufficient context adds explicit conservative instruction', () => {
  const shortContext = buildEvaluationContext({
    persona,
    scenario,
    turns: [{ sequence: 1, role: 'sales', text: 'Halo.', timestamp: '1970-01-01T00:00:00.000Z', source: 'legacy', finalized: true }],
    events: [],
    finalState: createInitialRoleplayState(),
  })
  const prompt = compileTrialEvaluationPrompt({ context: shortContext })

  assert.match(prompt, /Transkrip tidak memadai/)
  assert.match(prompt, /INSUFFICIENT_SALES_TURNS/)
  assert.match(prompt, /NO_CUSTOMER_TURNS/)
})

test('trial prompt excludes hidden values, payloads, processed IDs, and full state JSON', () => {
  const prompt = compileTrialEvaluationPrompt({ context: context() })

  assert.equal(prompt.includes('HIDDEN_PROMPT_VALUE'), false)
  assert.equal(prompt.includes('EVENT_PAYLOAD_VALUE'), false)
  assert.equal(prompt.includes('INTERNAL_PROCESSED_ID'), false)
  assert.equal(prompt.includes('processedEventIds'), false)
  assert.equal(prompt.includes('revealedInformation'), false)
})
