import type { DataAccessError } from '../errors/data-access-error'
import type { ScenarioRecord } from '../types/records'

export interface ScenarioListOptions {
  includeArchived?: boolean
}

export interface ScenarioRepository {
  list(options?: ScenarioListOptions): Promise<ScenarioRecord[]>
  subscribe(
    options: ScenarioListOptions,
    callback: (items: ScenarioRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getById(id: string): Promise<ScenarioRecord | null>
}
