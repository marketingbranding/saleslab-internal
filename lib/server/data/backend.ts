export type DataBackend = 'firestore' | 'postgres' | 'dual-write'

export class DataBackendConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataBackendConfigurationError'
  }
}

export function resolveDataBackend(value = process.env.DATA_BACKEND): DataBackend {
  if (!value || value === 'firestore') return 'firestore'
  if (value === 'postgres' || value === 'dual-write') return value
  throw new DataBackendConfigurationError('DATA_BACKEND must be firestore, postgres, or dual-write.')
}

export interface BackendLoaders<T> {
  firestore: () => Promise<T>
  postgres: () => Promise<T>
  dualWrite: () => Promise<T>
}

export function createBackendLoader<T>(loaders: BackendLoaders<T>) {
  let loaded: Promise<T> | undefined
  return (backend = resolveDataBackend()) => {
    loaded ??= backend === 'postgres'
      ? loaders.postgres()
      : backend === 'dual-write'
        ? loaders.dualWrite()
        : loaders.firestore()
    return loaded
  }
}
