import type { GlobalSettingsRecord, ModelProvider } from '../types/records'

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettingsRecord = {
  modelProvider: 'gemini',
  thinkingDelay: 1500,
  frustrationSensitivity: 5,
}

export function isModelProvider(value: unknown): value is ModelProvider {
  return value === 'gemini' || value === 'ollama' || value === 'openrouter'
}
