import type { KnowledgeEntry } from './types'

export const SOS_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'sos-customer-success',
    title: 'Solution Oriented Selling Mindset',
    category: 'sos',
    summary: 'Sales should help suitable customers move safely toward owning a first home, not chase booking alone.',
    tags: ['sos', 'mindset', 'customer-success', 'kpr-subsidi'],
  },
  {
    id: 'sos-stage-appropriate-progress',
    title: 'Stage Appropriate Progress',
    category: 'sos',
    summary: 'The next ask should match the customer journey stage and readiness.',
    tags: ['sos', 'customer-stage', 'closing', 'readiness'],
  },
]

export const SPIN_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'spin-probing-flow',
    title: 'SPIN Probing Flow',
    category: 'spin',
    summary: 'Use Situation, Problem, Implication, and Need-Payoff questions to understand needs without interrogating.',
    tags: ['spin', 'probing', 'discovery'],
  },
]

export const HOME_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'home-qualification-checklist',
    title: 'HOME Qualification Checklist',
    category: 'home',
    summary: 'Discover Housing, Occupation, Money, and Eligibility information needed for KPR Subsidi qualification.',
    tags: ['home', 'qualification', 'housing', 'occupation', 'money', 'eligibility'],
  },
]

export const FAB_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'fab-solution-presentation',
    title: 'FAB Solution Presentation',
    category: 'fab',
    summary: 'Connect customer needs to factual features, real advantages, and customer-specific benefits.',
    tags: ['fab', 'presentation', 'solution-matching'],
  },
]

export const SOS_STATIC_KNOWLEDGE: KnowledgeEntry[] = [
  ...SOS_KNOWLEDGE,
  ...SPIN_KNOWLEDGE,
  ...HOME_KNOWLEDGE,
  ...FAB_KNOWLEDGE,
]
