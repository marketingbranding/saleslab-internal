export type DataAccessErrorCategory =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'unavailable'
  | 'unknown'

export class DataAccessError extends Error {
  constructor(
    message: string,
    readonly category: DataAccessErrorCategory = 'unknown',
    readonly originalError?: unknown,
  ) {
    super(message)
    this.name = 'DataAccessError'
  }
}
