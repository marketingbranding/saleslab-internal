
'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Settings, Save, X, Server, Sparkles, Globe, Key } from 'lucide-react'
import { db, OperationType, handleFirestoreError } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/lib/AuthContext'

interface AdminSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentSettings: any
}

export function AdminSettingsModal({ isOpen, onClose, currentSettings }: AdminSettingsModalProps) {
  const { user } = useAuth()
  const [provider, setProvider] = React.useState(currentSettings?.modelProvider || 'gemini')
  const [ollamaUrl, setOllamaUrl] = React.useState(currentSettings?.ollamaUrl || 'http://localhost:11434')
  const [ollamaModel, setOllamaModel] = React.useState(currentSettings?.ollamaModel || 'llama3')
  const [openRouterApiKey, setOpenRouterApiKey] = React.useState(currentSettings?.openRouterApiKey || '')
  const [openRouterModel, setOpenRouterModel] = React.useState(currentSettings?.openRouterModel || 'mistralai/mistral-7b-instruct:free')
  const [thinkingDelay, setThinkingDelay] = React.useState(currentSettings?.thinkingDelay || 1500)
  const [frustrationSensitivity, setFrustrationSensitivity] = React.useState(currentSettings?.frustrationSensitivity || 5)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    const path = 'settings'
    try {
      await setDoc(doc(db, path, 'global'), {
        modelProvider: provider,
        ollamaUrl,
        ollamaModel,
        openRouterApiKey,
        openRouterModel,
        thinkingDelay,
        frustrationSensitivity,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      })
      onClose()
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80"
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="relative w-full max-w-lg bg-surface retro-dialog p-8"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b-[3px] border-dark/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary text-black">
                  <Settings size={22} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Admin Settings</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-dark/5 transition-colors">
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Pilih AI Provider</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setProvider('gemini')}
                    className={`p-4 border-3 flex flex-col items-center gap-2 transition-all ${provider === 'gemini' ? 'bg-primary text-black border-primary' : 'bg-surface border-dark/15 hover:border-primary/30'}`}
                  >
                    <Sparkles size={24} strokeWidth={2} />
                    <span className="font-bold uppercase text-[10px] tracking-wider">Gemini</span>
                  </button>
                  <button
                    onClick={() => setProvider('ollama')}
                    className={`p-4 border-3 flex flex-col items-center gap-2 transition-all ${provider === 'ollama' ? 'bg-primary text-black border-primary' : 'bg-surface border-dark/15 hover:border-primary/30'}`}
                  >
                    <Server size={24} strokeWidth={2} />
                    <span className="font-bold uppercase text-[10px] tracking-wider">Ollama</span>
                  </button>
                  <button
                    onClick={() => setProvider('openrouter')}
                    className={`p-4 border-3 flex flex-col items-center gap-2 transition-all ${provider === 'openrouter' ? 'bg-primary text-black border-primary' : 'bg-surface border-dark/15 hover:border-primary/30'}`}
                  >
                    <Key size={24} strokeWidth={2} />
                    <span className="font-bold uppercase text-[10px] tracking-wider">OpenRouter</span>
                  </button>
                </div>
              </div>

              {provider === 'ollama' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-4 pt-4 border-t border-dark/10"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                      <Globe size={12} /> Ollama API URL
                    </label>
                    <input
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full retro-input bg-surface p-4"
                    />
                    <div className="bg-danger/5 border-2 border-danger/20 p-3 text-[10px] space-y-1">
                      <p className="font-bold text-danger uppercase">Penting - Masalah Koneksi:</p>
                      <p className="text-muted font-medium">1. Agar browser bisa mengakses Ollama, jalankan dengan:</p>
                      <code className="block bg-white p-1.5 rounded-lg border border-dark/10 font-mono text-[9px]">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
                      <p className="text-muted font-medium pt-1">2. Jika web ini diakses via <strong>HTTPS</strong>, gunakan URL <code>http://localhost:11434</code> (bukan IP) atau gunakan HTTPS Tunnel (ngrok).</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Nama Model</label>
                    <input
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="e.g. gemma2, llama3, gemma4:e4b"
                      className="w-full retro-input bg-surface p-4"
                    />
                  </div>
                </motion.div>
              )}

              {provider === 'openrouter' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-4 pt-4 border-t border-dark/10"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                      <Key size={12} /> OpenRouter API Key
                    </label>
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="sk-or-..."
                      className="w-full retro-input bg-surface p-4"
                    />
                    <div className="bg-primary/5 border-2 border-primary/20 p-3 text-[10px] space-y-1">
                      <p className="font-bold text-primary uppercase">Cara Dapat API Key:</p>
                      <p className="text-muted font-medium">1. Buka <strong>openrouter.ai</strong> → Sign Up</p>
                      <p className="text-muted font-medium">2. Menuju <strong>Keys</strong> → Buat key baru</p>
                      <p className="text-muted font-medium">3. Model free: <code className="bg-white px-1.5 rounded-md border border-dark/10">mistralai/mistral-7b-instruct:free</code></p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Nama Model</label>
                    <input
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      placeholder="mistralai/mistral-7b-instruct:free"
                      className="w-full retro-input bg-surface p-4"
                    />
                    <p className="text-[9px] text-muted font-medium">
                      Lihat model gratis: openrouter.ai/models → filter <strong>Free</strong>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Thinking Delay */}
              <div className="space-y-3 pt-4 border-t border-dark/10">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  AI Response Delay
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="500"
                    max="3000"
                    step="100"
                    value={thinkingDelay}
                    onChange={(e) => setThinkingDelay(Number(e.target.value))}
                    className="flex-1 accent-cyan"
                  />
                  <span className="font-bold text-sm tabular-nums w-14 text-right text-dark">{(thinkingDelay / 1000).toFixed(1)}s</span>
                </div>
                <p className="text-[9px] text-muted font-medium">
                  Simulasi waktu berpikir sebelum AI merespon ({thinkingDelay}ms)
                </p>
              </div>

              {/* Frustration Sensitivity */}
              <div className="space-y-3 pt-4 border-t border-dark/10">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Frustration Sensitivity
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-bold text-muted">Kalem</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={frustrationSensitivity}
                    onChange={(e) => setFrustrationSensitivity(Number(e.target.value))}
                    className="flex-1 accent-cyan"
                  />
                  <span className="text-[9px] font-bold text-muted">Mudah Frustrasi</span>
                </div>
                <p className="text-[9px] text-muted font-medium text-center">
                  Sensitivitas ({frustrationSensitivity}/10) — semakin tinggi, semakin cepat AI frustrasi
                </p>
              </div>

              <button
                disabled={isSaving}
                onClick={handleSave}
                className="w-full retro-button retro-button-gold p-5 text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save size={20} strokeWidth={2.5} />
                {isSaving ? "SAVING..." : "SIMPAN PERUBAHAN"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
