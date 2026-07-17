import type { EvaluationContext } from './context'
import { TRIAL_WEIGHTED_SCORING_PROFILE } from './weighted-scoring'

export interface EvaluationPromptInput {
  context: EvaluationContext
}

const dimensions = [
  ['approaching', 'Approaching', 'Pembukaan, agenda, sikap awal, dan rapport yang relevan.'],
  ['probing', 'Probing', 'Pertanyaan terbuka, klarifikasi, serta kedalaman penggalian kebutuhan dan masalah.'],
  ['home_qualification', 'Kualifikasi HOME', 'Penggalian Housing, Occupation, Money, dan Eligibility berdasarkan bukti percakapan.'],
  ['solution_presentation', 'Presentasi Solusi', 'Kesesuaian penjelasan fitur/manfaat dengan kebutuhan yang benar-benar ditemukan.'],
  ['objection_handling', 'Penanganan Keberatan', 'Klarifikasi, respons, dan konfirmasi penyelesaian keberatan tanpa mengarang.'],
  ['closing', 'Closing', 'Ketepatan waktu closing dan kejelasan langkah berikutnya tanpa tekanan.'],
  ['communication', 'Komunikasi', 'Kejelasan, struktur, empati, kemampuan mendengar, dan profesionalitas.'],
  ['compliance', 'Kepatuhan', 'Keamanan klaim, privasi, kejujuran dokumen, dan proses penjualan yang bertanggung jawab.'],
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
- Semua skor wajib berupa integer pada skala 0-100.
- Nilai setiap dimensi secara independen berdasarkan bukti. Sistem menghitung overall score berbobot secara deterministik dari skor dimensi.
- overallScore dari model adalah estimasi holistik untuk diagnostik dan bukan sumber skor akhir.
- Wajib kembalikan tepat satu skillScores untuk setiap dimensionKey yang ditentukan.
- Anchor skor: 0=tidak dilakukan/berbahaya, 25=sangat lemah, 50=sebagian/dasar, 70=kompeten, 85=kuat dan berbukti, 95-100=luar biasa dan konsisten.
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

DIMENSIONS DAN BOBOT (gunakan semua, persis key berikut)
${dimensions.map(([key, label, description]) => `- ${key} (${TRIAL_WEIGHTED_SCORING_PROFILE.weights[key]}%): ${label}. ${description}`).join('\n')}

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
