const ruleLabels: Record<string, string> = {
  DOCUMENT_MANIPULATION: 'Saran manipulasi dokumen',
  DISCRIMINATORY_LANGUAGE: 'Bahasa diskriminatif',
  PRIVACY_RISK: 'Risiko privasi data konsumen',
  GUARANTEE_LANGUAGE: 'Janji kepastian persetujuan',
  PRESSURE_TACTIC: 'Tekanan berlebihan kepada konsumen',
  NO_MEANINGFUL_DISCOVERY: 'Tidak ada penggalian kebutuhan yang memadai',
  MATERIAL_COST_OMITTED: 'Biaya penting tidak dijelaskan',
  CLOSING_BEFORE_DISCOVERY: 'Closing dilakukan terlalu awal',
  UNVERIFIED_CLAIM: 'Klaim belum terverifikasi',
}

const severityLabels: Record<string, string> = {
  critical: 'Kritis',
  serious: 'Serius',
  warning: 'Perlu Perhatian',
}

const transcriptReasonLabels: Record<string, string> = {
  NO_VALID_TURNS: 'Tidak ada percakapan valid yang dapat dianalisis.',
  NO_CUSTOMER_TURNS: 'Respons calon konsumen tidak cukup terekam.',
  INSUFFICIENT_SALES_TURNS: 'Jumlah respons sales belum cukup untuk penilaian menyeluruh.',
  TRANSCRIPT_TOO_SHORT: 'Percakapan terlalu singkat untuk penilaian yang kuat.',
}

export const HOME_CATEGORY_KEYS = ['housing', 'occupation', 'money', 'eligibility'] as const
export type HomeCategoryKey = typeof HOME_CATEGORY_KEYS[number]

export interface HomeCategoryView {
  key: HomeCategoryKey
  label: string
  description: string
}

const homeCategories: Record<HomeCategoryKey, HomeCategoryView> = {
  housing: { key: 'housing', label: 'Kondisi Tempat Tinggal', description: 'Kondisi tempat tinggal' },
  occupation: { key: 'occupation', label: 'Pekerjaan', description: 'Pekerjaan' },
  money: { key: 'money', label: 'Kemampuan Finansial', description: 'Kemampuan finansial' },
  eligibility: { key: 'eligibility', label: 'Kelayakan Dasar', description: 'Kelayakan dasar' },
}

function normalizedCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function evaluationRuleLabel(ruleId: unknown): string {
  return ruleLabels[normalizedCode(ruleId).toUpperCase()] ?? 'Temuan evaluasi penting'
}

export function evaluationSeverityLabel(severity: unknown): string {
  return severityLabels[normalizedCode(severity).toLowerCase()] ?? 'Perlu Ditinjau'
}

export function transcriptReasonLabel(reason: unknown): string {
  return transcriptReasonLabels[normalizedCode(reason).toUpperCase()] ?? 'Data percakapan belum cukup untuk evaluasi menyeluruh.'
}

export function uniqueTranscriptReasonLabels(reasons: unknown): string[] {
  const values = Array.isArray(reasons)
    ? reasons.filter((reason): reason is string => typeof reason === 'string')
    : []
  const labels = values.map(transcriptReasonLabel)
  return [...new Set(labels.length > 0 ? labels : [transcriptReasonLabel('')])]
}

export function homeCategoryPresentation(key: unknown): HomeCategoryView | null {
  const normalized = normalizedCode(key).toLowerCase() as HomeCategoryKey
  return homeCategories[normalized] ?? null
}

export function knownMissingHomeCategories(categories: unknown): HomeCategoryKey[] {
  if (!Array.isArray(categories)) return []
  const normalized = categories
    .filter((category): category is string => typeof category === 'string')
    .map(homeCategoryPresentation)
    .filter((category): category is HomeCategoryView => category !== null)
    .map(category => category.key)
  return [...new Set(normalized)]
}

export function allHomeCategoryPresentations(): HomeCategoryView[] {
  return HOME_CATEGORY_KEYS.map(key => homeCategories[key])
}
