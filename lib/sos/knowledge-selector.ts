import type { KnowledgeEntry, Persona, RoleplayState, Scenario } from './types'

export interface KnowledgeSelectionInput {
  knowledge: KnowledgeEntry[]
  persona: Persona
  scenario: Scenario
  state?: RoleplayState
  maxEntries?: number
}

export interface KnowledgeSelectionReason {
  knowledgeId: string
  score: number
  matchedSignals: string[]
}

export interface KnowledgeSelectionResult {
  selected: KnowledgeEntry[]
  reasons: KnowledgeSelectionReason[]
}

interface SignalContribution {
  label: string
  weight: number
  signals: string[]
}

const DEFAULT_MAX_ENTRIES = 4
const MIN_MAX_ENTRIES = 1
const MAX_MAX_ENTRIES = 10

const scoringWeights = {
  baseline: 20,
  targetSkill: 10,
  forbiddenClosing: 8,
  scenarioStage: 6,
  expectedClosing: 6,
  personaObjection: 5,
  personaProfile: 5,
  state: 5,
  fallback: 1,
} as const

const categoryPriority: Record<KnowledgeEntry['category'], number> = {
  sos: 0,
  spin: 1,
  home: 2,
  fab: 3,
  objection: 4,
  closing: 5,
  evaluation: 6,
}

const targetSkillGroups: Array<{ aliases: string[]; name: string; signals: string[] }> = [
  {
    aliases: ['approaching', 'rapport', 'opening'],
    name: 'approaching',
    signals: ['sos', 'mindset', 'customer-success'],
  },
  {
    aliases: ['probing', 'spin', 'discovery', 'need-discovery'],
    name: 'probing',
    signals: ['spin', 'probing', 'discovery'],
  },
  {
    aliases: ['home', 'qualification', 'eligibility', 'housing', 'occupation', 'money'],
    name: 'home',
    signals: ['home', 'qualification', 'housing', 'occupation', 'money', 'eligibility'],
  },
  {
    aliases: ['solution', 'presentation', 'fab', 'solution-matching'],
    name: 'solution',
    signals: ['fab', 'presentation', 'solution-matching'],
  },
  {
    aliases: ['closing', 'next-step', 'survey', 'booking'],
    name: 'closing',
    signals: ['closing', 'customer-stage', 'readiness'],
  },
]

const objectionGroups: Array<{ aliases: string[]; name: string; signals: string[] }> = [
  {
    aliases: ['price', 'cost', 'installment', 'cicilan', 'income', 'money', 'affordability'],
    name: 'money',
    signals: ['home', 'money', 'qualification'],
  },
  {
    aliases: ['eligibility', 'slik', 'bi-checking', 'documents', 'document'],
    name: 'eligibility',
    signals: ['home', 'eligibility', 'qualification'],
  },
  {
    aliases: ['location', 'distance', 'facility', 'unit'],
    name: 'solution',
    signals: ['fab', 'presentation', 'solution-matching'],
  },
  {
    aliases: ['trust', 'fear', 'skepticism', 'uncertain'],
    name: 'trust',
    signals: ['sos', 'customer-success', 'spin', 'discovery'],
  },
  {
    aliases: ['partner', 'spouse', 'family', 'decision'],
    name: 'decision',
    signals: ['spin', 'discovery', 'customer-stage'],
  },
  {
    aliases: ['timing', 'not-ready', 'later', 'follow-up'],
    name: 'timing',
    signals: ['customer-stage', 'readiness', 'closing'],
  },
]

function normalizeSignal(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-')
}

function normalizeMaxEntries(value: number | undefined): number {
  if (!Number.isFinite(value) || Number(value) <= 0) return DEFAULT_MAX_ENTRIES
  return Math.max(MIN_MAX_ENTRIES, Math.min(MAX_MAX_ENTRIES, Math.floor(Number(value))))
}

function uniqueKnowledge(knowledge: KnowledgeEntry[]): Array<{ entry: KnowledgeEntry; index: number }> {
  const seenIds = new Set<string>()
  return knowledge
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => {
      if (!entry.id || seenIds.has(entry.id)) return false
      seenIds.add(entry.id)
      return true
    })
}

function entrySignals(entry: KnowledgeEntry): Set<string> {
  return new Set([normalizeSignal(entry.category), ...entry.tags.map(normalizeSignal)])
}

function matchesAnySignal(entry: KnowledgeEntry, signals: string[]): boolean {
  const available = entrySignals(entry)
  return signals.some(signal => available.has(normalizeSignal(signal)))
}

function addContribution(
  contributions: SignalContribution[],
  labels: Set<string>,
  contribution: SignalContribution
): void {
  if (labels.has(contribution.label)) return
  labels.add(contribution.label)
  contributions.push(contribution)
}

function targetSkillContributions(scenario: Scenario): SignalContribution[] {
  const normalizedSkills = new Set(scenario.targetSkills.map(normalizeSignal))
  return targetSkillGroups
    .filter(group => group.aliases.some(alias => normalizedSkills.has(alias)))
    .map(group => ({
      label: `target-skill:${group.name}`,
      weight: scoringWeights.targetSkill,
      signals: group.signals,
    }))
}

function stageSignals(stage: Scenario['stage']): string[] {
  switch (stage) {
    case 'awareness':
    case 'lead':
    case 'inquiry':
      return ['sos', 'spin', 'home', 'probing', 'discovery', 'qualification']
    case 'qualified':
      return ['home', 'qualification', 'fab', 'presentation', 'solution-matching']
    case 'survey_scheduled':
    case 'surveyed':
    case 'booking_intent':
    case 'booked':
      return ['fab', 'presentation', 'solution-matching', 'closing', 'customer-stage', 'readiness']
    case 'customer_withdrawn':
      return ['sos', 'customer-success', 'spin', 'discovery']
    default:
      return ['sos', 'customer-stage', 'readiness']
  }
}

function containsKnownConcept(value: string | undefined, concepts: string[]): boolean {
  if (!value) return false
  const normalized = normalizeSignal(value)
  return concepts.some(concept => normalized.includes(concept))
}

function collectObjectionText(persona: Persona): string[] {
  return persona.objections.flatMap(objection => [
    objection.key,
    objection.category,
    objection.statement ?? '',
    ...(objection.rootCauses ?? []),
  ]).map(normalizeSignal)
}

function objectionContributions(persona: Persona): SignalContribution[] {
  const objectionValues = collectObjectionText(persona)
  return objectionGroups
    .filter(group => group.aliases.some(alias => objectionValues.some(value => value === alias || value.split('-').includes(alias))))
    .map(group => ({
      label: `persona-objection:${group.name}`,
      weight: scoringWeights.personaObjection,
      signals: group.signals,
    }))
}

function personaProfileContributions(persona: Persona): SignalContribution[] {
  const contributions: SignalContribution[] = []
  const skepticism = persona.legacy ? persona.skepticism / 10 : persona.skepticism
  if (Number.isFinite(skepticism) && skepticism >= 7) {
    contributions.push({
      label: 'persona-profile:high-skepticism',
      weight: scoringWeights.personaProfile,
      signals: ['sos', 'customer-success', 'spin', 'discovery'],
    })
  }
  if (persona.decisionAuthority || persona.familyContext) {
    contributions.push({
      label: 'persona-profile:decision-context',
      weight: scoringWeights.personaProfile,
      signals: ['spin', 'discovery', 'customer-stage'],
    })
  }
  return contributions
}

function stateContributions(state: RoleplayState | undefined): SignalContribution[] {
  if (!state) return []
  const contributions: SignalContribution[] = []
  if (state.trust <= 40) {
    contributions.push({
      label: 'state:low-trust',
      weight: scoringWeights.state,
      signals: ['sos', 'mindset', 'customer-success', 'spin', 'discovery'],
    })
  }
  if (state.readiness <= 30) {
    contributions.push({
      label: 'state:low-readiness',
      weight: scoringWeights.state,
      signals: ['spin', 'home', 'discovery', 'qualification'],
    })
  } else if (state.readiness >= 60) {
    contributions.push({
      label: 'state:high-readiness',
      weight: scoringWeights.state,
      signals: ['fab', 'closing', 'customer-stage', 'readiness'],
    })
  }
  return contributions
}

function fallbackContributions(scenario: Scenario): SignalContribution[] {
  const normalizedSkills = new Set(scenario.targetSkills.map(normalizeSignal))
  const contributions: SignalContribution[] = [{
    label: 'fallback:sos',
    weight: scoringWeights.fallback,
    signals: ['sos'],
  }]

  if (['probing', 'spin', 'discovery', 'need-discovery', 'home', 'qualification'].some(skill => normalizedSkills.has(skill))) {
    contributions.push({ label: 'fallback:discovery', weight: scoringWeights.fallback, signals: ['spin', 'discovery'] })
  }
  if (['home', 'qualification', 'eligibility'].some(skill => normalizedSkills.has(skill)) || ['inquiry', 'qualified'].includes(scenario.stage)) {
    contributions.push({ label: 'fallback:home', weight: scoringWeights.fallback, signals: ['home'] })
  }
  if (['solution', 'presentation', 'fab'].some(skill => normalizedSkills.has(skill)) || scenario.stage === 'qualified') {
    contributions.push({ label: 'fallback:fab', weight: scoringWeights.fallback, signals: ['fab'] })
  }
  if (['closing', 'next-step', 'survey', 'booking'].some(skill => normalizedSkills.has(skill))) {
    contributions.push({ label: 'fallback:closing', weight: scoringWeights.fallback, signals: ['closing', 'customer-stage', 'readiness'] })
  }
  return contributions
}

export function selectKnowledge({
  knowledge,
  persona,
  scenario,
  state,
  maxEntries,
}: KnowledgeSelectionInput): KnowledgeSelectionResult {
  const candidates = uniqueKnowledge(knowledge)
  if (candidates.length === 0) return { selected: [], reasons: [] }

  const contributions: SignalContribution[] = []
  const contributionLabels = new Set<string>()

  for (const contribution of targetSkillContributions(scenario)) addContribution(contributions, contributionLabels, contribution)
  addContribution(contributions, contributionLabels, {
    label: `scenario-stage:${scenario.stage}`,
    weight: scoringWeights.scenarioStage,
    signals: stageSignals(scenario.stage),
  })

  if (containsKnownConcept(scenario.expectedClosing, ['survey', 'visit', 'appointment', 'schedule', 'booking', 'document', 'follow-up', 'next-step'])) {
    addContribution(contributions, contributionLabels, {
      label: 'expected-closing:next-step',
      weight: scoringWeights.expectedClosing,
      signals: ['closing', 'customer-stage', 'readiness'],
    })
  }
  if (containsKnownConcept(scenario.forbiddenClosing, ['force', 'pressure', 'before-qualification', 'premature', 'guarantee'])) {
    addContribution(contributions, contributionLabels, {
      label: 'forbidden-closing:premature',
      weight: scoringWeights.forbiddenClosing,
      signals: ['customer-stage', 'readiness', 'qualification'],
    })
  }

  for (const contribution of objectionContributions(persona)) addContribution(contributions, contributionLabels, contribution)
  for (const contribution of personaProfileContributions(persona)) addContribution(contributions, contributionLabels, contribution)
  for (const contribution of stateContributions(state)) addContribution(contributions, contributionLabels, contribution)
  for (const contribution of fallbackContributions(scenario)) addContribution(contributions, contributionLabels, contribution)

  const scored = candidates.map(candidate => {
    let score = 0
    const matchedSignals: string[] = []

    if (candidate.entry.id === 'sos-customer-success') {
      score += scoringWeights.baseline
      matchedSignals.push('baseline:sos-customer-success')
    }

    for (const contribution of contributions) {
      if (!matchesAnySignal(candidate.entry, contribution.signals)) continue
      score += contribution.weight
      matchedSignals.push(contribution.label)
    }

    return { ...candidate, score, matchedSignals }
  })

  let positive = scored.filter(candidate => candidate.score > 0)
  if (positive.length === 0) {
    positive = [...scored]
      .sort((a, b) => categoryPriority[a.entry.category] - categoryPriority[b.entry.category] || a.entry.id.localeCompare(b.entry.id))
      .slice(0, 1)
      .map(candidate => ({ ...candidate, score: 1, matchedSignals: ['fallback:first-entry'] }))
  }

  const limit = normalizeMaxEntries(maxEntries)
  const selectedCandidates = positive
    .sort((a, b) =>
      b.score - a.score ||
      categoryPriority[a.entry.category] - categoryPriority[b.entry.category] ||
      a.index - b.index ||
      a.entry.id.localeCompare(b.entry.id)
    )
    .slice(0, limit)

  return {
    selected: selectedCandidates.map(candidate => candidate.entry),
    reasons: selectedCandidates.map(candidate => ({
      knowledgeId: candidate.entry.id,
      score: candidate.score,
      matchedSignals: candidate.matchedSignals,
    })),
  }
}
