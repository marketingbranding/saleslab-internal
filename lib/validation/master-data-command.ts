import type { BranchRecord, GlobalSettingsRecord, ModelProvider } from '@/lib/data/types/records'
import type { BranchSeed } from '@/lib/data/contracts/branch-repository'
import type { MasterDataCommand } from '@/lib/data/master-data-commands'

export class MasterDataCommandValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MasterDataCommandValidationError'
  }
}

function objectValue(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MasterDataCommandValidationError(`${name} tidak valid.`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], name: string) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new MasterDataCommandValidationError(`${name} memiliki field yang tidak diizinkan.`)
}

function idValue(value: unknown, name: string) {
  if (typeof value !== 'string' || value.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new MasterDataCommandValidationError(`${name} tidak valid.`)
  }
  return value
}

function textValue(value: unknown, name: string, maximum = 100) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new MasterDataCommandValidationError(`${name} tidak valid.`)
  return value.trim()
}

function branchType(value: unknown) {
  if (value !== 'KC' && value !== 'KCP') throw new MasterDataCommandValidationError('Tipe cabang tidak valid.')
  return value
}

function branchSeed(value: unknown): BranchSeed {
  const input = objectValue(value, 'Cabang')
  exactKeys(input, ['id', 'name', 'normalizedName', 'type'], 'Cabang')
  const name = textValue(input.name, 'Nama cabang')
  const normalizedName = textValue(input.normalizedName, 'Nama normal cabang').toLowerCase()
  if (normalizedName !== name.toLowerCase()) throw new MasterDataCommandValidationError('Nama normal cabang tidak konsisten.')
  return { id: idValue(input.id, 'ID cabang'), name, normalizedName, ...(input.type ? { type: branchType(input.type) } : {}) }
}

function branchRecord(value: unknown): BranchRecord {
  const input = objectValue(value, 'Cabang')
  exactKeys(input, ['id', 'name', 'normalizedName', 'type', 'status', 'createdBy', 'createdAt', 'updatedAt'], 'Cabang')
  const name = textValue(input.name, 'Nama cabang')
  const normalizedName = textValue(input.normalizedName, 'Nama normal cabang').toLowerCase()
  if (normalizedName !== name.toLowerCase()) throw new MasterDataCommandValidationError('Nama normal cabang tidak konsisten.')
  if (input.status !== 'active' && input.status !== 'archived') throw new MasterDataCommandValidationError('Status cabang tidak valid.')
  return {
    id: idValue(input.id, 'ID cabang'),
    name,
    normalizedName,
    ...(input.type ? { type: branchType(input.type) } : {}),
    status: input.status,
  }
}

function modelProvider(value: unknown): ModelProvider {
  if (value !== 'gemini' && value !== 'ollama' && value !== 'openrouter') throw new MasterDataCommandValidationError('Penyedia model tidak valid.')
  return value
}

function settingsPatch(value: unknown): Partial<GlobalSettingsRecord> {
  const input = objectValue(value, 'Pengaturan')
  const allowed = ['modelProvider', 'geminiModel', 'ollamaModel', 'openRouterModel', 'thinkingDelay', 'frustrationSensitivity', 'ollamaUrl']
  exactKeys(input, allowed, 'Pengaturan')
  if (Object.keys(input).length === 0) throw new MasterDataCommandValidationError('Pengaturan tidak boleh kosong.')
  const output: Partial<GlobalSettingsRecord> = {}
  if (input.modelProvider !== undefined) output.modelProvider = modelProvider(input.modelProvider)
  for (const key of ['geminiModel', 'ollamaModel', 'openRouterModel'] as const) {
    if (input[key] !== undefined) output[key] = textValue(input[key], key, 200)
  }
  if (input.ollamaUrl !== undefined) output.ollamaUrl = textValue(input.ollamaUrl, 'ollamaUrl', 500)
  if (input.thinkingDelay !== undefined) {
    if (!Number.isInteger(input.thinkingDelay) || Number(input.thinkingDelay) < 0 || Number(input.thinkingDelay) > 30_000) throw new MasterDataCommandValidationError('Jeda respons tidak valid.')
    output.thinkingDelay = Number(input.thinkingDelay)
  }
  if (input.frustrationSensitivity !== undefined) {
    if (typeof input.frustrationSensitivity !== 'number' || input.frustrationSensitivity < 1 || input.frustrationSensitivity > 10) throw new MasterDataCommandValidationError('Sensitivitas frustrasi tidak valid.')
    output.frustrationSensitivity = input.frustrationSensitivity
  }
  return output
}

export function validateMasterDataCommand(value: unknown): MasterDataCommand {
  const input = objectValue(value, 'Perintah')
  exactKeys(input, ['schemaVersion', 'commandId', 'type', 'payload'], 'Perintah')
  if (input.schemaVersion !== 1) throw new MasterDataCommandValidationError('Versi perintah tidak didukung.')
  const commandId = idValue(input.commandId, 'ID perintah')
  const payload = objectValue(input.payload, 'Payload')

  switch (input.type) {
    case 'branch.save':
      exactKeys(payload, ['branch'], 'Payload')
      return { schemaVersion: 1, commandId, type: input.type, payload: { branch: branchRecord(payload.branch) } }
    case 'branch.seed': {
      exactKeys(payload, ['defaults'], 'Payload')
      if (!Array.isArray(payload.defaults) || payload.defaults.length > 100) throw new MasterDataCommandValidationError('Daftar cabang tidak valid.')
      const defaults = payload.defaults.map(branchSeed)
      const ids = new Set(defaults.map(item => item.id))
      const names = new Set(defaults.map(item => item.normalizedName))
      if (ids.size !== defaults.length || names.size !== defaults.length) throw new MasterDataCommandValidationError('Daftar cabang memiliki duplikat.')
      return { schemaVersion: 1, commandId, type: input.type, payload: { defaults } }
    }
    case 'branch.rename': {
      exactKeys(payload, ['branchId', 'name', 'type', 'normalizedName'], 'Payload')
      const name = textValue(payload.name, 'Nama cabang')
      const normalizedName = textValue(payload.normalizedName, 'Nama normal cabang').toLowerCase()
      if (normalizedName !== name.toLowerCase()) throw new MasterDataCommandValidationError('Nama normal cabang tidak konsisten.')
      return { schemaVersion: 1, commandId, type: input.type, payload: { branchId: idValue(payload.branchId, 'ID cabang'), name, normalizedName, type: branchType(payload.type) } }
    }
    case 'branch.remove':
      exactKeys(payload, ['branchId'], 'Payload')
      return { schemaVersion: 1, commandId, type: input.type, payload: { branchId: idValue(payload.branchId, 'ID cabang') } }
    case 'settings.update':
      exactKeys(payload, ['settings'], 'Payload')
      return { schemaVersion: 1, commandId, type: input.type, payload: { settings: settingsPatch(payload.settings) } }
    default:
      throw new MasterDataCommandValidationError('Tipe perintah tidak didukung.')
  }
}
