'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { Save, Server, Sparkles, Key, Clock, AlertTriangle } from 'lucide-react'
import { getSettingsRepository } from '@/lib/data'

interface AISettingsProps {
  currentSettings: any
  onSaved?: () => void
}

export function AISettings({ currentSettings, onSaved }: AISettingsProps) {
  const [provider, setProvider] = React.useState(currentSettings?.modelProvider || 'gemini')
  const [ollamaModel, setOllamaModel] = React.useState(currentSettings?.ollamaModel || 'llama3')
  const [openRouterModel, setOpenRouterModel] = React.useState(currentSettings?.openRouterModel || 'mistralai/mistral-7b-instruct:free')
  const [thinkingDelay, setThinkingDelay] = React.useState(currentSettings?.thinkingDelay || 1500)
  const [frustrationSensitivity, setFrustrationSensitivity] = React.useState(currentSettings?.frustrationSensitivity || 5)
  const [isSaving, setIsSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      await getSettingsRepository().updateGlobal({
        modelProvider: provider,
        ollamaModel,
        openRouterModel,
        thinkingDelay,
        frustrationSensitivity,
      })
      setMessage({ type: 'success', text: 'Pengaturan berhasil disimpan!' })
      onSaved?.()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl min-w-0 space-y-6 sm:space-y-8">
      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase text-muted font-heading flex items-center gap-2">
          <Server size={12} /> Penyedia AI
        </label>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => setProvider('gemini')}
            className={`min-h-11 p-3 sm:p-4 border-2 flex min-w-0 flex-row min-[360px]:flex-col items-center justify-center gap-2 transition-all font-bold text-[11px] uppercase font-heading ${
              provider === 'gemini' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Sparkles size={20} /> Gemini
          </button>
          <button
            onClick={() => setProvider('ollama')}
            className={`min-h-11 p-3 sm:p-4 border-2 flex min-w-0 flex-row min-[360px]:flex-col items-center justify-center gap-2 transition-all font-bold text-[11px] uppercase font-heading ${
              provider === 'ollama' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Server size={20} /> Ollama
          </button>
          <button
            onClick={() => setProvider('openrouter')}
            className={`min-h-11 p-3 sm:p-4 border-2 flex min-w-0 flex-row min-[360px]:flex-col items-center justify-center gap-2 transition-all font-bold text-[11px] uppercase font-heading leading-tight break-words ${
              provider === 'openrouter' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Key size={20} /> OpenRouter
          </button>
        </div>
      </div>

      {/* Ollama Config */}
      {provider === 'ollama' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 p-4 sm:p-5 bg-surface retro-panel min-w-0">
          <p className="text-sm font-semibold text-muted">Alamat Ollama dikonfigurasi lewat environment variable server agar browser tidak bisa menentukan target request.</p>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-muted font-heading">Nama Model</label>
            <input value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} className="retro-input bg-surface p-3 sm:p-4 min-w-0" />
          </div>
        </motion.div>
      )}

      {/* OpenRouter Config */}
      {provider === 'openrouter' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 p-4 sm:p-5 bg-surface retro-panel min-w-0">
          <p className="text-sm font-semibold text-muted">API key OpenRouter sekarang dikonfigurasi lewat environment variable server.</p>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase text-muted font-heading">Nama Model</label>
            <input value={openRouterModel} onChange={e => setOpenRouterModel(e.target.value)} className="retro-input bg-surface p-3 sm:p-4 min-w-0" />
          </div>
        </motion.div>
      )}

      {/* Gemini Config */}
      {provider === 'gemini' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-4 sm:p-5 bg-surface retro-panel">
          <p className="text-sm font-semibold text-muted">Gemini dikonfigurasi via environment variables. Tidak perlu setup tambahan.</p>
        </motion.div>
      )}

      {/* Timing Controls */}
      <div className="p-4 sm:p-5 bg-surface retro-panel space-y-6 min-w-0">
        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase text-muted font-heading flex items-center gap-2">
            <Clock size={12} /> Jeda Respons AI
          </label>
          <div className="flex items-center gap-4">
            <input type="range" min="500" max="3000" step="100" value={thinkingDelay} onChange={e => setThinkingDelay(Number(e.target.value))} className="flex-1" />
            <span className="font-bold text-sm tabular-nums w-14 text-right">{(thinkingDelay / 1000).toFixed(1)}s</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase text-muted font-heading flex items-center gap-2">
            <AlertTriangle size={12} /> Sensitivitas Frustrasi
          </label>
          <div className="space-y-2">
            <input type="range" min="1" max="10" step="1" value={frustrationSensitivity} onChange={e => setFrustrationSensitivity(Number(e.target.value))} className="w-full" />
            <div className="flex justify-between gap-3 text-[11px] font-bold text-muted">
              <span>Tenang</span>
              <span className="text-right">Mudah Frustrasi</span>
            </div>
          </div>
          <p className="text-[11px] font-semibold text-muted text-center">Sensitivitas ({frustrationSensitivity}/10)</p>
        </div>
      </div>

      {/* Save */}
      <div className="space-y-3">
        {message && (
          <div className={`p-3 border-2 font-bold text-xs ${
            message.type === 'success' ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
          }`}>
            {message.text}
          </div>
        )}
        <button
          disabled={isSaving}
          onClick={handleSave}
          className="retro-btn retro-btn-primary flex items-center justify-center gap-2 text-[11px] w-full"
        >
          <Save size={16} />
          {isSaving ? 'MENYIMPAN...' : 'SIMPAN PENGATURAN'}
        </button>
      </div>
    </div>
  )
}
