'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { SalesScenario } from "@/lib/gemini"
import { X, Plus, Home, Target, Users, AlertCircle, RefreshCcw } from "lucide-react"

interface CreateScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (scenario: SalesScenario) => void
  editingScenario?: SalesScenario | null
}

export function CreateScenarioModal({ isOpen, onClose, onCreated, editingScenario }: CreateScenarioModalProps) {
  const [formData, setFormData] = React.useState<Omit<SalesScenario, 'id' | 'icon'>>({
    title: editingScenario?.title || "",
    description: editingScenario?.description || "",
    target: editingScenario?.target || "Bikin dia mau lanjut proses berkas",
    consumerProfile: editingScenario?.consumerProfile || "",
    difficulty: editingScenario?.difficulty || "Medium",
    name: editingScenario?.name || "",
    gender: editingScenario?.gender || "Pria",
    aggressiveness: editingScenario?.aggressiveness || 5,
    patience: editingScenario?.patience || 5,
    responseStyle: editingScenario?.responseStyle || "Banyak Tanya",
    firstSpeaker: editingScenario?.firstSpeaker || "AI"
  })

  // Sync with editingScenario when it changes
  React.useEffect(() => {
    if (editingScenario) {
      const timer = setTimeout(() => {
        setFormData({
          title: editingScenario.title,
          description: editingScenario.description,
          target: editingScenario.target,
          consumerProfile: editingScenario.consumerProfile,
          difficulty: editingScenario.difficulty,
          name: editingScenario.name,
          gender: editingScenario.gender,
          aggressiveness: editingScenario.aggressiveness,
          patience: editingScenario.patience,
          responseStyle: editingScenario.responseStyle,
          firstSpeaker: editingScenario.firstSpeaker
        })
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [editingScenario])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.description || !formData.name) return

    const newScenario: SalesScenario = {
      id: editingScenario?.id || `custom-${Date.now()}`,
      ...formData,
      icon: editingScenario?.icon || "UserPlus"
    }

    onCreated(newScenario)
    onClose()
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl bg-surface retro-dialog p-8 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="bg-primary text-black px-5 py-2.5">
                <h2 className="text-xl font-bold tracking-tight">
                  {editingScenario ? "Edit Persona" : "Bikin Persona Baru"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark/5 transition-colors"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted flex items-center gap-2">
                    <Home size={12} /> Nama Skenario
                  </label>
                  <input
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Keberatan BI Checking"
                    className="w-full retro-input bg-surface p-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted flex items-center gap-2">
                    <Users size={12} /> Nama Persona
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pak Budi"
                    className="w-full retro-input bg-surface p-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Siapa yang Ngomong Duluan?</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, firstSpeaker: "AI" })}
                      className={`flex-1 p-4 border-3 font-bold text-[10px] sm:text-xs uppercase transition-all ${formData.firstSpeaker === 'AI' ? 'bg-primary text-black border-primary' : 'bg-surface text-dark border-dark/10 hover:border-primary/30'}`}
                    >
                      AI DULUAN
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, firstSpeaker: "Sales" })}
                      className={`flex-1 p-4 border-3 font-bold text-[10px] sm:text-xs uppercase transition-all ${formData.firstSpeaker === 'Sales' ? 'bg-primary text-black border-primary' : 'bg-surface text-dark border-dark/10 hover:border-primary/30'}`}
                    >
                      SALES DULUAN
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Gaya Respon</label>
                  <select
                    value={formData.responseStyle}
                    onChange={e => setFormData({ ...formData, responseStyle: e.target.value as any })}
                    className="w-full retro-input bg-surface p-4 uppercase"
                  >
                    <option value="To the point">To the point</option>
                    <option value="Banyak Tanya">Banyak Tanya</option>
                    <option value="Ragu-ragu">Ragu-ragu</option>
                    <option value="Cerewet">Cerewet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full retro-input bg-surface p-4 uppercase"
                  >
                    <option value="Pria">Pria</option>
                    <option value="Wanita">Wanita</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full retro-input bg-surface p-4 uppercase"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Agresivitas ({formData.aggressiveness}/10)</label>
                  <input
                    type="range" min="1" max="10"
                    value={formData.aggressiveness}
                    onChange={e => setFormData({ ...formData, aggressiveness: parseInt(e.target.value) })}
                    className="w-full accent-cyan"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted"><span>SOPAN</span><span>GALAK</span></div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-muted">Kesabaran ({formData.patience}/10)</label>
                  <input
                    type="range" min="1" max="10"
                    value={formData.patience}
                    onChange={e => setFormData({ ...formData, patience: parseInt(e.target.value) })}
                    className="w-full accent-cyan"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted"><span>SABAR BANGET</span><span>CEPET EMOSI</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted flex items-center gap-2">
                  <AlertCircle size={12} /> Deskripsi Skenario
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Latar belakang masalahnya apa?"
                  className="w-full retro-input bg-surface p-4 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted flex items-center gap-2">
                  <Users size={12} /> Profil Konsumen (Brief Tambahan untuk AI)
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.consumerProfile}
                  onChange={e => setFormData({ ...formData, consumerProfile: e.target.value })}
                  placeholder="Detail sifat atau situasi khusus dia..."
                  className="w-full retro-input bg-surface p-4 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full retro-button retro-button-gold p-5 text-sm mt-4 flex items-center justify-center gap-3"
              >
                {editingScenario ? <RefreshCcw size={20} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={2.5} />}
                {editingScenario ? "UPDATE PERSONA" : "SIMPAN PERSONA"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

