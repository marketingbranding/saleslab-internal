import type { EvaluationContext } from './context'

export interface EvaluationPromptInput {
  context: EvaluationContext
}

const dimensions = [
  ['approaching', 'Approaching'],
  ['probing', 'Probing'],
  ['home_qualification', 'Kualifikasi HOME'],
  ['solution_presentation', 'Presentasi Solusi'],
  ['objection_handling', 'Penanganan Keberatan'],
  ['closing', 'Closing'],
  ['communication', 'Komunikasi'],
  ['compliance', 'Kepatuhan'],
] as const

function valueOrNone(value: string | undefined): string {
  return value || 'Tidak ditentukan'
}

function listOrNone(values: string[]): string {
  return values.length ? values.join(', ') : 'Tidak ada'
}

function eventCounts(context: EvaluationContext): string {
  const entries = Object.entries(context.eventSummary.eventCounts)
  return entries.length ? entries.map(([key, count]) => `- ${key}: ${count}`).join('\n') : '- Tidak ada'
}

function numberedTranscript(context: EvaluationContext): string {
  return context.turns
    .map(turn => `TURN ${turn.sequence} | ${turn.role === 'sales' ? 'SALES' : 'CUSTOMER'}:\n${turn.text}`)
    .join('\n\n')
}

export function compileTrialEvaluationPrompt({ context }: EvaluationPromptInput): string {
  const insufficiencyInstruction = context.summary.isTranscriptSufficient
    ? 'Transkrip memenuhi batas minimum evaluasi.'
    : 'Transkrip tidak memadai. Nyatakan keterbatasan di summary, hindari klaim yakin dan skor sangat tinggi, jangan mengarang tindakan, dan berikan feedback terbatas.'

  return `
Anda adalah evaluator performa sales KPR Subsidi. Tulis hasil dalam Bahasa Indonesia profesional dan natural.

ATURAN EVALUASI
- Nilai SALES, bukan CUSTOMER.
- Gunakan hanya bukti dari TURN SALES bernomor di bawah.
- Jangan mengarang fakta pelanggan atau mengklaim pertanyaan/tindakan yang tidak ada.
- Dialog customer bukan bukti performa sales.
- Context summary deterministik adalah sumber input tepercaya.
- Jangan menjamin persetujuan KPR atau kebenaran hukum/regulasi.
- Semua skor wajib berupa integer pada skala 0-100. Skor pada fase trial ini adalah estimasi evaluator, belum weighted scoring final.
- ${insufficiencyInstruction}

SCENARIO
- Name: ${context.scenarioName}
- Customer stage: ${context.customerStage}
- Difficulty: ${context.difficulty}
- Target skills: ${listOrNone(context.targetSkills)}
- Expected closing: ${valueOrNone(context.expectedClosing)}
- Forbidden closing: ${valueOrNone(context.forbiddenClosing)}

TRANSCRIPT SUFFICIENCY
- Total turns: ${context.summary.totalTurns}
- Sales turns: ${context.summary.salesTurns}
- Customer turns: ${context.summary.customerTurns}
- Sufficient: ${context.summary.isTranscriptSufficient ? 'yes' : 'no'}
- Reason codes: ${listOrNone(context.summary.insufficiencyReasons)}

HOME DISCOVERY
- Housing: ${context.home.housingDiscovered ? 'yes' : 'no'}
- Occupation: ${context.home.occupationDiscovered ? 'yes' : 'no'}
- Money: ${context.home.moneyDiscovered ? 'yes' : 'no'}
- Eligibility: ${context.home.eligibilityDiscovered ? 'yes' : 'no'}
- Missing categories: ${listOrNone(context.home.missingCategories)}

OBSERVED EVENT COUNTS
${eventCounts(context)}

UNRESOLVED CONCERNS
${listOrNone(context.unresolvedObjections)}

BUYING SIGNALS
${listOrNone(context.buyingSignals)}

COMPLIANCE FLAGS
${listOrNone(context.complianceFlags)}

NUMBERED TRANSCRIPT
${numberedTranscript(context)}

DIMENSIONS (gunakan semua, persis key dan label berikut)
${dimensions.map(([key, label]) => `- ${key}: ${label}`).join('\n')}

Kembalikan JSON murni valid tanpa markdown dengan schema persis:
{
  "overallScore": integer 0-100,
  "grade": string,
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "keyObjectionsHandled": string[],
  "missedOpportunities": string[],
  "verdict": string,
  "actionableTips": string[],
  "skillScores": [{ "dimensionKey": string, "score": integer 0-100 }],
  "evidence": [{
    "id": string,
    "dimensionKey": string,
    "turnSequence": number,
    "behaviorObserved": string,
    "reason": string,
    "impact": string,
    "recommendedImprovement": string
  }],
  "suggestedResponses": string[],
  "recommendedNextScenario": string | null,
  "actionPlan": string[]
}
`.trim()
}
