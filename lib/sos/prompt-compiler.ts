import type { KnowledgeEntry, Persona, Scenario } from './types'

export interface MinimalPromptCompilerInput {
  persona: Persona
  scenario: Scenario
  knowledge: KnowledgeEntry[]
}

function formatKnowledge(knowledge: KnowledgeEntry[]): string {
  if (knowledge.length === 0) return '- No structured knowledge selected.'
  return knowledge.map(entry => `- ${entry.title}: ${entry.summary}`).join('\n')
}

export function compileVoiceRoleplayPrompt(input: MinimalPromptCompilerInput): string {
  const { persona, scenario, knowledge } = input

  return [
    `You are roleplaying as ${persona.name}, a KPR Subsidi customer persona.`,
    `Scenario: ${scenario.name}.`,
    scenario.description ? `Scenario description: ${scenario.description}.` : undefined,
    `Current customer stage: ${scenario.stage}.`,
    `Primary customer goal or fear: ${persona.primaryGoal || persona.primaryFear || 'not specified'}.`,
    `Communication style: ${persona.communicationStyle || 'natural and polite'}.`,
    'Respond naturally and briefly as the customer. Do not provide coaching or evaluation during the roleplay.',
    'Relevant structured knowledge:',
    formatKnowledge(knowledge),
  ].filter((line): line is string => Boolean(line)).join('\n')
}

export function compileEvaluationPrompt(input: MinimalPromptCompilerInput): string {
  const { persona, scenario, knowledge } = input

  return [
    'Evaluate the sales roleplay using the SOS KPR Subsidi framework.',
    `Scenario: ${scenario.name}.`,
    `Customer persona: ${persona.name}.`,
    `Expected closing: ${scenario.expectedClosing || 'stage-appropriate next step'}.`,
    `Forbidden closing: ${scenario.forbiddenClosing || 'forcing commitment before qualification'}.`,
    'Use transcript evidence for every score when this compiler is integrated in a later phase.',
    'Relevant structured knowledge:',
    formatKnowledge(knowledge),
  ].join('\n')
}
