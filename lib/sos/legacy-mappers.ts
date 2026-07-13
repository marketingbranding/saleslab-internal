import type { SalesScenario } from '@/lib/gemini'
import type { Difficulty, Gender, Persona, Scenario } from './types'

const DEFAULT_EVALUATION_PROFILE = 'default_sos_kpr'

function mapDifficulty(difficulty: SalesScenario['difficulty'] | string | undefined): Difficulty {
  if (difficulty === 'Easy') return 'easy'
  if (difficulty === 'Hard') return 'hard'
  return 'medium'
}

function mapGender(gender: SalesScenario['gender'] | string | undefined): Gender {
  if (gender === 'Pria') return 'male'
  if (gender === 'Wanita') return 'female'
  return 'unspecified'
}

function scaleTenPointValue(value: number | undefined, fallback: number): number {
  const safeValue = Number.isFinite(value) ? Number(value) : fallback
  return Math.max(0, Math.min(100, Math.round(safeValue * 10)))
}

export function mapSalesScenario(scenario: SalesScenario): Scenario {
  return {
    id: scenario.id,
    name: scenario.title,
    stage: 'inquiry',
    channel: 'voice',
    personaId: `legacy-persona-${scenario.id}`,
    salesGoals: scenario.successCriteria?.filter(Boolean).length
      ? scenario.successCriteria.filter(Boolean)
      : [scenario.target],
    expectedClosing: scenario.target,
    forbiddenClosing: 'force_booking_before_qualification',
    targetSkills: ['approaching', 'probing', 'home', 'objection_handling', 'closing'],
    initialCustomerMessage: scenario.openingMessage,
    customerStartsFirst: scenario.firstSpeaker === 'AI',
    difficulty: mapDifficulty(scenario.difficulty),
    maxDurationMinutes: 10,
    successConditions: scenario.successCriteria ?? [],
    failureConditions: ['Sales guarantees approval', 'Sales pressures booking before qualification'],
    evaluationProfile: DEFAULT_EVALUATION_PROFILE,
    description: scenario.description,
    legacy: {
      title: scenario.title,
      target: scenario.target,
      consumerProfile: scenario.consumerProfile,
      icon: scenario.icon,
      status: scenario.status,
      baseXp: scenario.baseXp,
      hiddenRules: scenario.hiddenRules,
    },
  }
}

export function mapLegacyPersona(scenario: SalesScenario): Persona {
  return {
    id: `legacy-persona-${scenario.id}`,
    name: scenario.name,
    gender: mapGender(scenario.gender),
    occupation: undefined,
    incomeRange: undefined,
    primaryGoal: scenario.target,
    primaryFear: scenario.consumerProfile,
    communicationStyle: scenario.responseStyle,
    patience: scaleTenPointValue(scenario.patience, 5),
    aggressiveness: scaleTenPointValue(scenario.aggressiveness, 5),
    skepticism: scaleTenPointValue(scenario.aggressiveness, 5),
    trustStart: Math.max(0, Math.min(100, 100 - scaleTenPointValue(scenario.aggressiveness, 5))),
    hiddenInformation: scenario.hiddenRules
      ? [{
          key: 'legacy_hidden_rules',
          value: scenario.hiddenRules,
          revealWhen: ['internal behavior guidance only'],
          neverRevealWhen: ['shown directly to trainee'],
          importance: 'critical',
        }]
      : [],
    objections: [],
    buyingSignals: [],
    walkAwayConditions: ['Sales makes unrealistic guarantees', 'Sales applies excessive pressure'],
    difficulty: mapDifficulty(scenario.difficulty),
    legacy: {
      consumerProfile: scenario.consumerProfile,
      responseStyle: scenario.responseStyle,
      firstSpeaker: scenario.firstSpeaker,
    },
  }
}
