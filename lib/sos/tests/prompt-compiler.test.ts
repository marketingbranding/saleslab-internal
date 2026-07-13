import test from 'node:test'
import assert from 'node:assert/strict'
import { HOME_KNOWLEDGE, SOS_KNOWLEDGE } from '../knowledge'
import { compileEvaluationPrompt, compileVoiceRoleplayPrompt } from '../prompt-compiler'
import type { Persona, Scenario } from '../types'

const persona: Persona = {
  id: 'persona-rina',
  name: 'Rina',
  gender: 'female',
  occupation: 'online seller',
  primaryGoal: 'own first home',
  primaryFear: 'bank rejection',
  communicationStyle: 'cautious',
  patience: 60,
  aggressiveness: 20,
  skepticism: 70,
  trustStart: 25,
  hiddenInformation: [],
  objections: [],
  buyingSignals: [],
  walkAwayConditions: [],
  difficulty: 'medium',
}

const scenario: Scenario = {
  id: 'scenario-inquiry',
  name: 'Inquiry from Informal Worker',
  stage: 'inquiry',
  channel: 'voice',
  personaId: persona.id,
  salesGoals: ['build rapport', 'discover HOME data'],
  expectedClosing: 'document_precheck_or_survey',
  forbiddenClosing: 'force_booking',
  targetSkills: ['approaching', 'home'],
  customerStartsFirst: true,
  difficulty: 'medium',
  successConditions: [],
  failureConditions: [],
  evaluationProfile: 'default_sos_kpr',
  description: 'Customer asks whether informal workers can apply for KPR Subsidi.',
}

test('compileVoiceRoleplayPrompt creates a compact customer roleplay prompt', () => {
  const prompt = compileVoiceRoleplayPrompt({
    persona,
    scenario,
    knowledge: [...SOS_KNOWLEDGE, ...HOME_KNOWLEDGE],
  })

  assert.match(prompt, /Rina/)
  assert.match(prompt, /Inquiry from Informal Worker/)
  assert.match(prompt, /inquiry/)
  assert.match(prompt, /Primary customer goal: own first home/)
  assert.match(prompt, /Primary customer fear: bank rejection/)
  assert.match(prompt, /patience 60\/100, aggressiveness 20\/100, skepticism 70\/100/)
  assert.match(prompt, /Customer starts first: yes/)
  assert.match(prompt, /HOME Qualification Checklist/)
  assert.match(prompt, /Do not provide coaching or evaluation/)
})

test('compileEvaluationPrompt includes expected and forbidden closing context', () => {
  const prompt = compileEvaluationPrompt({
    persona,
    scenario,
    knowledge: HOME_KNOWLEDGE,
  })

  assert.match(prompt, /Evaluate the sales roleplay/)
  assert.match(prompt, /document_precheck_or_survey/)
  assert.match(prompt, /force_booking/)
  assert.match(prompt, /Use transcript evidence/)
})
