import type { DataAccessError } from '../errors/data-access-error'
import type { ScenarioRecord } from '../types/records'

export interface ScenarioListOptions {
  includeArchived?: boolean
}

export interface ScenarioRepository {
  list(options?: ScenarioListOptions): Promise<ScenarioRecord[]>
  subscribe(
    callback: (items: ScenarioRecord[]) => void,
    onError?: (error: DataAccessError) => void,
  ): () => void
  getById(id: string): Promise<ScenarioRecord | null>
  save(scenario: ScenarioRecord): Promise<void>
  remove(id: string): Promise<void>
}
