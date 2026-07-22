import { DatabaseConfigurationError } from './config'
import { getPostgresConnection } from './connection'

export interface PostgresHealthResult {
  ok: boolean
  status: 'healthy' | 'configuration-error' | 'unavailable'
  latencyMs: number
  message: string
}

export async function runPostgresHealthCheck(query: () => Promise<unknown>): Promise<PostgresHealthResult> {
  const startedAt = Date.now()
  try {
    await query()
    return { ok: true, status: 'healthy', latencyMs: Date.now() - startedAt, message: 'PostgreSQL is reachable.' }
  } catch (error) {
    return {
      ok: false,
      status: error instanceof DatabaseConfigurationError ? 'configuration-error' : 'unavailable',
      latencyMs: Date.now() - startedAt,
      message: error instanceof DatabaseConfigurationError
        ? error.message
        : 'PostgreSQL is unavailable.',
    }
  }
}

export function checkPostgresHealth() {
  return runPostgresHealthCheck(async () => {
    const { client } = getPostgresConnection()
    await client`select 1 as healthy`
  })
}
