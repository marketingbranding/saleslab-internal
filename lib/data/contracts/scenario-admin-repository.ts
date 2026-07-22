import type { ScenarioRecord } from '../types/records'

export interface ScenarioAdminRepository {
  save(input: { scenario: ScenarioRecord; hiddenRules?: string }): Promise<void>
  remove(id: string): Promise<void>
}
