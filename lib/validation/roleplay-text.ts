export interface ValidatedRoleplayTextRequest {
  scenario: Record<string, unknown>
  history: Array<{ role: 'user' | 'model'; text: string }>
}

export class RoleplayTextValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateRoleplayTextRequest(body: unknown): ValidatedRoleplayTextRequest {
  if (!isRecord(body) || !isRecord(body.scenario) || !Array.isArray(body.history)) {
    throw new RoleplayTextValidationError('Data roleplay tidak valid.')
  }
  const scenario = body.scenario
  for (const key of ['id', 'title', 'description', 'target', 'consumerProfile', 'name', 'gender', 'responseStyle', 'firstSpeaker']) {
    if (typeof scenario[key] !== 'string' || String(scenario[key]).length === 0 || String(scenario[key]).length > 5_000) {
      throw new RoleplayTextValidationError(`Field scenario.${key} tidak valid.`)
    }
  }
  if (!Number.isInteger(scenario.aggressiveness) || Number(scenario.aggressiveness) < 1 || Number(scenario.aggressiveness) > 10) {
    throw new RoleplayTextValidationError('Agresivitas persona tidak valid.')
  }
  if (!Number.isInteger(scenario.patience) || Number(scenario.patience) < 1 || Number(scenario.patience) > 10) {
    throw new RoleplayTextValidationError('Kesabaran persona tidak valid.')
  }
  if (body.history.length > 200) throw new RoleplayTextValidationError('Riwayat roleplay terlalu panjang.')

  let totalCharacters = 0
  const history = body.history.map((turn, index) => {
    if (!isRecord(turn) || !['user', 'model'].includes(String(turn.role)) || typeof turn.text !== 'string' || turn.text.length > 5_000) {
      throw new RoleplayTextValidationError(`Pesan ke-${index + 1} tidak valid.`)
    }
    totalCharacters += turn.text.length
    return { role: turn.role as 'user' | 'model', text: turn.text }
  })
  if (totalCharacters > 100_000) throw new RoleplayTextValidationError('Riwayat roleplay terlalu panjang.')

  return { scenario, history }
}
