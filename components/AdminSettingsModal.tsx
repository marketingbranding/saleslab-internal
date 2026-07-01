
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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="relative w-full max-w-lg bg-white border-8 border-black p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-8 pb-4 border-b-4 border-black">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black text-white">
                  <Settings size={24} />
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Admin Settings</h2>
              </div>
              <button onClick={onClose} className="hover:rotate-90 transition-transform">
                <X size={32} strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Provider Selection */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500">Pilih AI Provider</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProvider('gemini')}
                    className={`p-6 border-4 border-black flex flex-col items-center gap-3 transition-all ${provider === 'gemini' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <Sparkles size={32} />
                    <span className="font-black uppercase text-sm">Gemini AI</span>
                  </button>
                  <button
                    onClick={() => setProvider('ollama')}
                    className={`p-6 border-4 border-black flex flex-col items-center gap-3 transition-all ${provider === 'ollama' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <Server size={32} />
                    <span className="font-black uppercase text-sm">Ollama (Local)</span>
                  </button>
                  <button
                    onClick={() => setProvider('openrouter')}
                    className={`p-6 border-4 border-black flex flex-col items-center gap-3 transition-all ${provider === 'openrouter' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <Key size={32} />
                    <span className="font-black uppercase text-sm">OpenRouter</span>
                  </button>
                </div>
              </div>

              {provider === 'ollama' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-6 pt-4 border-t-2 border-black"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Globe size={12} /> Ollama API URL
                    </label>
                    <input
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full border-4 border-black p-4 font-black text-lg outline-none focus:bg-yellow-50"
                    />
                    <div className="bg-red-50 border-2 border-red-200 p-3 text-[10px] space-y-1">
                      <p className="font-extrabold text-red-600 uppercase">Penting - Masalah Koneksi:</p>
                      <p className="text-gray-600">1. Agar browser bisa mengakses Ollama, jalankan dengan:</p>
                      <code className="block bg-white p-1 border border-red-100 font-mono text-[9px]">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
                      <p className="text-gray-600 pt-1">2. Jika web ini diakses via <strong>HTTPS</strong>, gunakan URL <code>http://localhost:11434</code> (bukan IP) atau gunakan HTTPS Tunnel (ngrok).</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nama Model</label>
                    <input
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="e.g. gemma2, llama3, gemma4:e4b"
                      className="w-full border-4 border-black p-4 font-black text-lg outline-none focus:bg-yellow-50"
                    />
                  </div>
                </motion.div>
              )}

              {provider === 'openrouter' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="space-y-6 pt-4 border-t-2 border-black"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <Key size={12} /> OpenRouter API Key
                    </label>
                    <input
                      type="password"
                      value={openRouterApiKey}
                      onChange={(e) => setOpenRouterApiKey(e.target.value)}
                      placeholder="sk-or-..."
                      className="w-full border-4 border-black p-4 font-black text-lg outline-none focus:bg-yellow-50"
                    />
                    <div className="bg-blue-50 border-2 border-blue-200 p-3 text-[10px] space-y-1">
                      <p className="font-extrabold text-blue-600 uppercase">Cara Dapat API Key:</p>
                      <p className="text-gray-600">1. Buka <strong>openrouter.ai</strong> → Sign Up</p>
                      <p className="text-gray-600">2. Menuju <strong>Keys</strong> → Buat key baru</p>
                      <p className="text-gray-600">3. Model free: <code className="bg-white px-1 border">mistralai/mistral-7b-instruct:free</code></p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nama Model</label>
                    <input
                      value={openRouterModel}
                      onChange={(e) => setOpenRouterModel(e.target.value)}
                      placeholder="mistralai/mistral-7b-instruct:free"
                      className="w-full border-4 border-black p-4 font-black text-lg outline-none focus:bg-yellow-50"
                    />
                    <p className="text-[9px] text-gray-400 italic">
                      Lihat model gratis: openrouter.ai/models → filter <strong>Free</strong>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Thinking Delay */}
              <div className="space-y-4 pt-4 border-t-2 border-black">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
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
                    className="flex-1 accent-black"
                  />
                  <span className="font-black text-lg tabular-nums w-14 text-right">{(thinkingDelay / 1000).toFixed(1)}s</span>
                </div>
                <p className="text-[9px] text-gray-400 italic">
                  Simulasi waktu berpikir sebelum AI merespon ({thinkingDelay}ms)
                </p>
              </div>

              {/* Frustration Sensitivity */}
              <div className="space-y-4 pt-4 border-t-2 border-black">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Frustration Sensitivity
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black text-gray-400">Kalem</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={frustrationSensitivity}
                    onChange={(e) => setFrustrationSensitivity(Number(e.target.value))}
                    className="flex-1 accent-black"
                  />
                  <span className="text-[9px] font-black text-gray-400">Mudah Frustrasi</span>
                </div>
                <p className="text-[9px] text-gray-400 italic text-center">
                  Sensitivitas ({frustrationSensitivity}/10) — semakin tinggi, semakin cepat AI frustrasi
                </p>
              </div>

              <button
                disabled={isSaving}
                onClick={handleSave}
                className="w-full bg-black text-white border-4 border-black p-5 font-black uppercase italic text-xl tracking-tighter hover:bg-yellow-400 hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Save size={24} />
                {isSaving ? "SAVING..." : "SIMPAN PERUBAHAN"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
