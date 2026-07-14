import { compileVoiceRoleplayPrompt, type MinimalPromptCompilerInput } from './prompt-compiler'
import type { KnowledgeEntry, Persona, Scenario } from './types'

export type PromptBudgetVariant = 'voice' | 'text' | 'evaluation' | 'admin-preview'

export interface PromptBudgetProfile {
  variant: PromptBudgetVariant
  maxCharacters: number
  reservedCharacters: number
  maxKnowledgeEntries: number
  maxKnowledgeCharacters: number
}

export interface PromptBudgetWarning {
  code:
    | 'KNOWLEDGE_ENTRY_LIMIT'
    | 'KNOWLEDGE_CHARACTER_LIMIT'
    | 'PROMPT_CHARACTER_LIMIT'
    | 'REQUIRED_CONTEXT_OVERSIZED'
  message: string
}

export interface PromptBudgetResult {
  knowledge: KnowledgeEntry[]
  estimatedCharacters: number
  estimatedKnowledgeCharacters: number
  removedKnowledgeIds: string[]
  warnings: PromptBudgetWarning[]
  withinBudget: boolean
}

export interface ApplyVoicePromptBudgetInput {
  persona: Persona
  scenario: Scenario
  knowledge: KnowledgeEntry[]
  profile?: Partial<PromptBudgetProfile>
}

export const VOICE_PROMPT_BUDGET: PromptBudgetProfile = {
  variant: 'voice',
  maxCharacters: 8000,
  reservedCharacters: 4500,
  maxKnowledgeEntries: 4,
  maxKnowledgeCharacters: 2200,
}

const warningMessages: Record<PromptBudgetWarning['code'], string> = {
  KNOWLEDGE_ENTRY_LIMIT: 'Knowledge entries were reduced to the configured voice limit.',
  KNOWLEDGE_CHARACTER_LIMIT: 'Knowledge context was reduced to the configured character limit.',
  PROMPT_CHARACTER_LIMIT: 'Optional knowledge was reduced to fit the voice prompt character limit.',
  REQUIRED_CONTEXT_OVERSIZED: 'Required voice prompt context exceeds the configured character limit.',
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || Number(value) <= 0) return fallback
  return Math.floor(Number(value))
}

function normalizeProfile(profile: Partial<PromptBudgetProfile> | undefined): PromptBudgetProfile {
  const maxCharacters = Math.max(
    1000,
    normalizePositiveInteger(profile?.maxCharacters, VOICE_PROMPT_BUDGET.maxCharacters)
  )
  const reservedCharacters = Math.min(
    maxCharacters,
    normalizePositiveInteger(profile?.reservedCharacters, VOICE_PROMPT_BUDGET.reservedCharacters)
  )
  const maxKnowledgeEntries = Math.max(
    1,
    Math.min(20, normalizePositiveInteger(profile?.maxKnowledgeEntries, VOICE_PROMPT_BUDGET.maxKnowledgeEntries))
  )
  const maxKnowledgeCharacters = Math.min(
    maxCharacters,
    normalizePositiveInteger(profile?.maxKnowledgeCharacters, VOICE_PROMPT_BUDGET.maxKnowledgeCharacters)
  )

  return {
    variant: 'voice',
    maxCharacters,
    reservedCharacters,
    maxKnowledgeEntries,
    maxKnowledgeCharacters,
  }
}

function uniqueKnowledge(knowledge: KnowledgeEntry[]): KnowledgeEntry[] {
  const seenIds = new Set<string>()
  return knowledge.filter(entry => {
    if (!entry.id || seenIds.has(entry.id)) return false
    seenIds.add(entry.id)
    return true
  })
}

function addWarning(warnings: PromptBudgetWarning[], code: PromptBudgetWarning['code']): void {
  if (warnings.some(warning => warning.code === code)) return
  warnings.push({ code, message: warningMessages[code] })
}

export function estimateKnowledgeCharacters(knowledge: KnowledgeEntry[]): number {
  return knowledge.reduce((total, entry, index) => {
    const separatorLength = index === 0 ? 0 : 1
    return total + separatorLength + `- ${entry.title}: ${entry.summary}`.length
  }, 0)
}

export function estimateVoicePromptCharacters(input: MinimalPromptCompilerInput): number {
  return compileVoiceRoleplayPrompt(input).length
}

export function applyVoicePromptBudget({
  persona,
  scenario,
  knowledge,
  profile: profileOverrides,
}: ApplyVoicePromptBudgetInput): PromptBudgetResult {
  const profile = normalizeProfile(profileOverrides)
  const originalUniqueKnowledge = uniqueKnowledge(knowledge)
  let budgetedKnowledge = originalUniqueKnowledge
  const removedIds = new Set<string>()
  const warnings: PromptBudgetWarning[] = []

  if (budgetedKnowledge.length > profile.maxKnowledgeEntries) {
    for (const entry of budgetedKnowledge.slice(profile.maxKnowledgeEntries)) removedIds.add(entry.id)
    budgetedKnowledge = budgetedKnowledge.slice(0, profile.maxKnowledgeEntries)
    addWarning(warnings, 'KNOWLEDGE_ENTRY_LIMIT')
  }

  const availableKnowledgeCharacters = Math.min(
    profile.maxKnowledgeCharacters,
    Math.max(0, profile.maxCharacters - profile.reservedCharacters)
  )
  let estimatedKnowledgeCharacters = estimateKnowledgeCharacters(budgetedKnowledge)
  if (estimatedKnowledgeCharacters > availableKnowledgeCharacters) {
    addWarning(warnings, 'KNOWLEDGE_CHARACTER_LIMIT')
    while (budgetedKnowledge.length > 0 && estimatedKnowledgeCharacters > availableKnowledgeCharacters) {
      const removed = budgetedKnowledge[budgetedKnowledge.length - 1]
      removedIds.add(removed.id)
      budgetedKnowledge = budgetedKnowledge.slice(0, -1)
      estimatedKnowledgeCharacters = estimateKnowledgeCharacters(budgetedKnowledge)
    }
  }

  let estimatedCharacters = estimateVoicePromptCharacters({ persona, scenario, knowledge: budgetedKnowledge })
  if (estimatedCharacters > profile.maxCharacters) {
    addWarning(warnings, 'PROMPT_CHARACTER_LIMIT')
    while (budgetedKnowledge.length > 0 && estimatedCharacters > profile.maxCharacters) {
      const removed = budgetedKnowledge[budgetedKnowledge.length - 1]
      removedIds.add(removed.id)
      budgetedKnowledge = budgetedKnowledge.slice(0, -1)
      estimatedKnowledgeCharacters = estimateKnowledgeCharacters(budgetedKnowledge)
      estimatedCharacters = estimateVoicePromptCharacters({ persona, scenario, knowledge: budgetedKnowledge })
    }
  }

  if (estimatedCharacters > profile.maxCharacters && budgetedKnowledge.length === 0) {
    addWarning(warnings, 'REQUIRED_CONTEXT_OVERSIZED')
  }

  return {
    knowledge: budgetedKnowledge,
    estimatedCharacters,
    estimatedKnowledgeCharacters,
    removedKnowledgeIds: originalUniqueKnowledge
      .filter(entry => removedIds.has(entry.id))
      .map(entry => entry.id),
    warnings,
    withinBudget: estimatedCharacters <= profile.maxCharacters,
  }
}
