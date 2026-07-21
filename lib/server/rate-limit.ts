export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export interface RateLimiter {
  consume(key: string): Promise<RateLimitResult>
}

interface MemoryRateLimiterOptions {
  limit: number
  windowMs: number
  namespace: string
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const globalStore = globalThis as typeof globalThis & {
  __saleslabRateLimits?: Map<string, RateLimitEntry>
}

function store() {
  globalStore.__saleslabRateLimits ??= new Map<string, RateLimitEntry>()
  return globalStore.__saleslabRateLimits
}

export function createMemoryRateLimiter(options: MemoryRateLimiterOptions): RateLimiter {
  const limit = Math.max(1, Math.floor(options.limit))
  const windowMs = Math.max(1000, Math.floor(options.windowMs))

  return {
    async consume(key) {
      const now = Date.now()
      const storageKey = `${options.namespace}:${key}`
      const current = store().get(storageKey)
      const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current

      if (entry.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
        }
      }

      entry.count += 1
      store().set(storageKey, entry)
      return {
        allowed: true,
        remaining: Math.max(0, limit - entry.count),
        retryAfterSeconds: 0,
      }
    },
  }
}

export function rateLimitFromEnv(namespace: string, prefix: string, defaults: { limit: number; windowSeconds: number }) {
  const configuredLimit = Number(process.env[`${prefix}_RATE_LIMIT_MAX`])
  const configuredWindow = Number(process.env[`${prefix}_RATE_LIMIT_WINDOW_SECONDS`])
  return createMemoryRateLimiter({
    namespace,
    limit: Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : defaults.limit,
    windowMs: 1000 * (Number.isFinite(configuredWindow) && configuredWindow > 0 ? configuredWindow : defaults.windowSeconds),
  })
}

export function resetMemoryRateLimitsForTests() {
  store().clear()
}
