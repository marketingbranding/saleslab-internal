import type { ConversationStage, HiddenInformation, RoleplayEvent, RoleplayEventType, RoleplayState } from './types'

export interface HiddenInformationContext {
  events: RoleplayEvent[]
  state: RoleplayState
  alreadyRevealedKeys?: string[]
}

export interface HiddenInformationDecision {
  key: string
  status: 'eligible' | 'blocked' | 'already_revealed' | 'not_eligible'
  matchedRevealConditions: string[]
  matchedBlockConditions: string[]
  importance: HiddenInformation['importance']
}

export interface HiddenInformationEvaluationResult {
  decisions: HiddenInformationDecision[]
  newlyRevealedKeys: string[]
}

const stageRank: Record<ConversationStage, number> = {
  opening: 0,
  discovery: 1,
  solution: 2,
  objection: 2,
  closing: 3,
  committed: 4,
}

const importanceRank: Record<HiddenInformation['importance'], number> = {
  critical: 0,
  moderate: 1,
  low: 2,
}

const supportedEventTypes = new Set<RoleplayEventType>([
  'APPROACHING_STARTED',
  'PROBING_STARTED',
  'SOLUTION_PRESENTED',
  'OBJECTION_RAISED',
  'BUYING_SIGNAL_DETECTED',
  'CLOSING_ATTEMPTED',
  'NEXT_STEP_AGREED',
  'HOUSING_INFO_DISCOVERED',
  'OCCUPATION_INFO_DISCOVERED',
  'MONEY_INFO_DISCOVERED',
  'ELIGIBILITY_INFO_DISCOVERED',
])

const exactStageConditions = new Set(['stage:opening', 'stage:discovery', 'stage:solution', 'stage:objection', 'stage:closing', 'stage:committed'])
const minimumStageConditions = new Set(['stage>=discovery', 'stage>=solution', 'stage>=closing', 'stage>=committed'])
const trustConditions = new Set(['trust>=25', 'trust>=40', 'trust>=60', 'trust>=75', 'trust<=20', 'trust<=40'])
const readinessConditions = new Set(['readiness>=25', 'readiness>=40', 'readiness>=60', 'readiness>=75', 'readiness>=85', 'readiness<=20', 'readiness<=40'])
const metricConditions = new Set(['objections>=1', 'objections>=2', 'buying_signals>=1', 'closing_attempts>=1', 'next_steps>=1'])
const complianceConditions = new Set(['compliance:any', 'compliance:critical', 'compliance:guarantee', 'compliance:document_manipulation', 'compliance:pressure'])
const homeConditions = new Set(['home:housing', 'home:occupation', 'home:money', 'home:eligibility', 'home:complete', 'home:count>=1', 'home:count>=2', 'home:count>=3', 'home:count>=4'])

function normalizeCondition(condition: string): string {
  return condition.trim().toLowerCase()
}

function parseEventType(condition: string): RoleplayEventType | undefined {
  if (!condition.startsWith('event:')) return undefined
  const eventType = condition.slice('event:'.length).toUpperCase() as RoleplayEventType
  return supportedEventTypes.has(eventType) ? eventType : undefined
}

function compareThreshold(value: number, condition: string, prefix: 'trust' | 'readiness'): boolean {
  const match = condition.match(new RegExp(`^${prefix}(>=|<=)(25|40|60|75|85|20)$`))
  if (!match) return false

  const operator = match[1]
  const threshold = Number(match[2])
  return operator === '>=' ? value >= threshold : value <= threshold
}

function matchesStageCondition(condition: string, currentStage: ConversationStage): boolean {
  if (exactStageConditions.has(condition)) {
    return condition.slice('stage:'.length) === currentStage
  }
  if (!minimumStageConditions.has(condition)) return false

  const minimumStage = condition.slice('stage>='.length) as ConversationStage
  return stageRank[currentStage] >= stageRank[minimumStage]
}

export function isSupportedHiddenCondition(condition: string): boolean {
  const normalized = normalizeCondition(condition)
  if (!normalized) return false
  if (parseEventType(normalized)) return true
  return homeConditions.has(normalized) ||
    exactStageConditions.has(normalized) ||
    minimumStageConditions.has(normalized) ||
    trustConditions.has(normalized) ||
    readinessConditions.has(normalized) ||
    metricConditions.has(normalized) ||
    complianceConditions.has(normalized)
}

export function evaluateHiddenCondition(condition: string, context: HiddenInformationContext): boolean {
  const normalized = normalizeCondition(condition)
  if (!isSupportedHiddenCondition(normalized)) return false

  const eventType = parseEventType(normalized)
  if (eventType) return context.events.some(event => event.eventType === eventType)

  switch (normalized) {
    case 'home:housing': return context.state.home.housingDiscovered
    case 'home:occupation': return context.state.home.occupationDiscovered
    case 'home:money': return context.state.home.moneyDiscovered
    case 'home:eligibility': return context.state.home.eligibilityDiscovered
    case 'home:complete': return context.state.home.completedCount === 4
    case 'home:count>=1': return context.state.home.completedCount >= 1
    case 'home:count>=2': return context.state.home.completedCount >= 2
    case 'home:count>=3': return context.state.home.completedCount >= 3
    case 'home:count>=4': return context.state.home.completedCount >= 4
    case 'objections>=1': return context.state.metrics.objectionCount >= 1
    case 'objections>=2': return context.state.metrics.objectionCount >= 2
    case 'buying_signals>=1': return context.state.metrics.buyingSignalCount >= 1
    case 'closing_attempts>=1': return context.state.metrics.closingAttemptCount >= 1
    case 'next_steps>=1': return context.state.metrics.nextStepAgreementCount >= 1
    case 'compliance:any': return context.state.complianceFlags.length > 0
    case 'compliance:critical': return context.state.compliance.criticalViolationDetected
    case 'compliance:guarantee': return context.state.compliance.guaranteeLanguageCount > 0
    case 'compliance:document_manipulation': return context.state.compliance.documentManipulationCount > 0
    case 'compliance:pressure': return context.state.compliance.pressureTacticCount > 0
  }

  if (normalized.startsWith('stage')) return matchesStageCondition(normalized, context.state.stage)
  if (normalized.startsWith('trust')) return compareThreshold(context.state.trust, normalized, 'trust')
  if (normalized.startsWith('readiness')) return compareThreshold(context.state.readiness, normalized, 'readiness')

  return false
}

export function mapLegacyRevealCondition(condition: string): string | undefined {
  const normalized = normalizeCondition(condition)
  const mappings: Record<string, string> = {
    'after occupation is asked': 'event:PROBING_STARTED',
    'after occupation is discovered': 'home:occupation',
    'after financial discussion': 'home:money',
    'after trust is built': 'trust>=60',
    'after buying interest': 'event:BUYING_SIGNAL_DETECTED',
    'after closing attempt': 'event:CLOSING_ATTEMPTED',
  }

  return mappings[normalized]
}

function matchedConditions(conditions: string[] | undefined, context: HiddenInformationContext): string[] {
  return (conditions ?? [])
    .map(condition => mapLegacyRevealCondition(condition) ?? condition)
    .filter(condition => evaluateHiddenCondition(condition, context))
}

export function evaluateHiddenInformation(
  items: HiddenInformation[],
  context: HiddenInformationContext
): HiddenInformationEvaluationResult {
  const seenKeys = new Set<string>()
  const alreadyRevealed = new Set(context.alreadyRevealedKeys ?? [])
  const indexedItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (!item.key || seenKeys.has(item.key)) return false
      seenKeys.add(item.key)
      return true
    })
    .sort((a, b) => importanceRank[a.item.importance] - importanceRank[b.item.importance] || a.index - b.index)

  const decisions: HiddenInformationDecision[] = []
  const newlyRevealedKeys: string[] = []

  for (const { item } of indexedItems) {
    const matchedRevealConditions = matchedConditions(item.revealWhen, context)
    const matchedBlockConditions = matchedConditions(item.neverRevealWhen, context)

    let status: HiddenInformationDecision['status'] = 'not_eligible'
    if (alreadyRevealed.has(item.key)) {
      status = 'already_revealed'
    } else if (matchedBlockConditions.length > 0) {
      status = 'blocked'
    } else if (item.revealWhen.length > 0 && matchedRevealConditions.length > 0) {
      status = 'eligible'
      newlyRevealedKeys.push(item.key)
    }

    decisions.push({
      key: item.key,
      status,
      matchedRevealConditions,
      matchedBlockConditions,
      importance: item.importance,
    })
  }

  return { decisions, newlyRevealedKeys }
}

export function applyHiddenInformationRevealKeys(state: RoleplayState, keys: string[]): RoleplayState {
  const seenNewKeys = new Set<string>()
  const uniqueNewKeys = keys.filter(key => {
    if (!key || state.revealedInformation.includes(key) || seenNewKeys.has(key)) return false
    seenNewKeys.add(key)
    return true
  })
  if (uniqueNewKeys.length === 0) return state

  return {
    ...state,
    revealedInformation: [...state.revealedInformation, ...uniqueNewKeys],
  }
}
