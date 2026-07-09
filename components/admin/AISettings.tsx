'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { Save, Server, Sparkles, Key, Globe, Clock, AlertTriangle } from 'lucide-react'
import { db, OperationType, handleFirestoreError } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/AuthContext'

interface AISettingsProps {
  currentSettings: any
  onSaved?: () => void
}

export function AISettings({ currentSettings, onSaved }: AISettingsProps) {
  const { user } = useAuth()
  const [provider, setProvider] = React.useState(currentSettings?.modelProvider || 'gemini')
  const [ollamaUrl, setOllamaUrl] = React.useState(currentSettings?.ollamaUrl || 'http://localhost:11434')
  const [ollamaModel, setOllamaModel] = React.useState(currentSettings?.ollamaModel || 'llama3')
  const [openRouterApiKey, setOpenRouterApiKey] = React.useState(currentSettings?.openRouterApiKey || '')
  const [openRouterModel, setOpenRouterModel] = React.useState(currentSettings?.openRouterModel || 'mistralai/mistral-7b-instruct:free')
  const [thinkingDelay, setThinkingDelay] = React.useState(currentSettings?.thinkingDelay || 1500)
  const [frustrationSensitivity, setFrustrationSensitivity] = React.useState(currentSettings?.frustrationSensitivity || 5)
  const [isSaving, setIsSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    setMessage(null)
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        modelProvider: provider,
        ollamaUrl,
        ollamaModel,
        openRouterApiKey,
        openRouterModel,
        thinkingDelay,
        frustrationSensitivity,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      })
      setMessage({ type: 'success', text: 'Settings berhasil disimpan!' })
      onSaved?.()
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings')
      setMessage({ type: 'error', text: 'Gagal menyimpan settings.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Provider Selection */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-muted font-heading flex items-center gap-2">
          <Server size={12} /> AI Provider
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setProvider('gemini')}
            className={`p-4 border-2 flex flex-col items-center gap-2 transition-all font-bold text-[10px] uppercase font-heading ${
              provider === 'gemini' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Sparkles size={20} /> Gemini
          </button>
          <button
            onClick={() => setProvider('ollama')}
            className={`p-4 border-2 flex flex-col items-center gap-2 transition-all font-bold text-[10px] uppercase font-heading ${
              provider === 'ollama' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Server size={20} /> Ollama
          </button>
          <button
            onClick={() => setProvider('openrouter')}
            className={`p-4 border-2 flex flex-col items-center gap-2 transition-all font-bold text-[10px] uppercase font-heading ${
              provider === 'openrouter' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15 hover:border-primary/30 text-muted'
            }`}
          >
            <Key size={20} /> OpenRouter
          </button>
        </div>
      </div>

      {/* Ollama Config */}
      {provider === 'ollama' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 p-5 bg-surface retro-panel">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted font-heading flex items-center gap-2">
              <Globe size={12} /> Ollama API URL
            </label>
            <input value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="retro-input bg-surface p-4" />
            <div className="bg-danger/5 border-2 border-danger/20 p-3 text-[10px] space-y-1">
              <p className="font-bold text-danger uppercase font-heading">Catatan Koneksi:</p>
              <p className="text-muted font-medium">Run: <code className="bg-white px-1 border border-dark/10">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code></p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted font-heading">Model Name</label>
            <input value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} className="retro-input bg-surface p-4" />
          </div>
        </motion.div>
      )}

      {/* OpenRouter Config */}
      {provider === 'openrouter' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 p-5 bg-surface retro-panel">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted font-heading flex items-center gap-2">
              <Key size={12} /> API Key
            </label>
            <input type="password" value={openRouterApiKey} onChange={e => setOpenRouterApiKey(e.target.value)} className="retro-input bg-surface p-4" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted font-heading">Model Name</label>
            <input value={openRouterModel} onChange={e => setOpenRouterModel(e.target.value)} className="retro-input bg-surface p-4" />
          </div>
        </motion.div>
      )}

      {/* Gemini Config */}
      {provider === 'gemini' && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-5 bg-surface retro-panel">
          <p className="text-sm font-semibold text-muted">Gemini dikonfigurasi via environment variables. Tidak perlu setup tambahan.</p>
        </motion.div>
      )}

      {/* Timing Controls */}
      <div className="p-5 bg-surface retro-panel space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-muted font-heading flex items-center gap-2">
            <Clock size={12} /> AI Response Delay
          </label>
          <div className="flex items-center gap-4">
            <input type="range" min="500" max="3000" step="100" value={thinkingDelay} onChange={e => setThinkingDelay(Number(e.target.value))} className="flex-1" />
            <span className="font-bold text-sm tabular-nums w-14 text-right">{(thinkingDelay / 1000).toFixed(1)}s</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-muted font-heading flex items-center gap-2">
            <AlertTriangle size={12} /> Frustration Sensitivity
          </label>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-bold text-muted">Calm</span>
            <input type="range" min="1" max="10" step="1" value={frustrationSensitivity} onChange={e => setFrustrationSensitivity(Number(e.target.value))} className="flex-1" />
            <span className="text-[9px] font-bold text-muted">Easily Frustrated</span>
          </div>
          <p className="text-[10px] font-semibold text-muted text-center">Sensitivity ({frustrationSensitivity}/10)</p>
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
          {isSaving ? 'MENYIMPAN...' : 'SIMPAN SETTINGS'}
        </button>
      </div>
    </div>
  )
}
