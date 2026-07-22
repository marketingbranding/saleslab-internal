export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseConfigurationError'
  }
}

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new DatabaseConfigurationError(`${name} must be a positive integer.`)
  return parsed
}

export function validateDatabaseUrl(value: string | undefined) {
  if (!value) throw new DatabaseConfigurationError('DATABASE_URL is required when PostgreSQL is enabled.')
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new DatabaseConfigurationError('DATABASE_URL must be a valid PostgreSQL connection URL.')
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new DatabaseConfigurationError('DATABASE_URL must use the postgres or postgresql protocol.')
  }
  if (!parsed.hostname || parsed.pathname === '/' || !parsed.pathname) {
    throw new DatabaseConfigurationError('DATABASE_URL must include a host and database name.')
  }
  return value
}

export interface PostgresEnvironment {
  DATABASE_URL?: string
  POSTGRES_POOL_MAX?: string
  POSTGRES_IDLE_TIMEOUT_SECONDS?: string
}

export function readPostgresConfig(env?: PostgresEnvironment) {
  const source = env || {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_POOL_MAX: process.env.POSTGRES_POOL_MAX,
    POSTGRES_IDLE_TIMEOUT_SECONDS: process.env.POSTGRES_IDLE_TIMEOUT_SECONDS,
  }
  return {
    url: validateDatabaseUrl(source.DATABASE_URL),
    max: positiveInteger(source.POSTGRES_POOL_MAX, 1, 'POSTGRES_POOL_MAX'),
    idleTimeout: positiveInteger(source.POSTGRES_IDLE_TIMEOUT_SECONDS, 20, 'POSTGRES_IDLE_TIMEOUT_SECONDS'),
  }
}
