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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl bg-white border-8 border-black p-8 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="bg-black text-white px-4 py-2 border-4 border-black rotate-[-1deg]">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                  {editingScenario ? "Edit Persona" : "Bikin Persona Baru"}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 border-4 border-black hover:bg-red-500 hover:text-white transition-colors"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Home size={14} /> Nama Skenario
                  </label>
                  <input
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Keberatan BI Checking"
                    className="w-full border-4 border-black p-4 font-bold text-lg uppercase tracking-tight focus:bg-yellow-50 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Users size={14} /> Nama Persona
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pak Budi"
                    className="w-full border-4 border-black p-4 font-bold text-lg uppercase tracking-tight focus:bg-yellow-50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Siapa yang Ngomong Duluan?</label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, firstSpeaker: "AI" })}
                      className={`flex-1 p-4 border-4 border-black font-black italic text-[10px] sm:text-xs uppercase tracking-widest transition-all ${formData.firstSpeaker === 'AI' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                    >
                      AI DULUAN
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, firstSpeaker: "Sales" })}
                      className={`flex-1 p-4 border-4 border-black font-black italic text-[10px] sm:text-xs uppercase tracking-widest transition-all ${formData.firstSpeaker === 'Sales' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                    >
                      SALES DULUAN
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Gaya Respon</label>
                  <select
                    value={formData.responseStyle}
                    onChange={e => setFormData({ ...formData, responseStyle: e.target.value as any })}
                    className="w-full border-4 border-black p-4 font-black uppercase tracking-widest focus:bg-yellow-50 outline-none"
                  >
                    <option value="To the point">TO THE POINT</option>
                    <option value="Banyak Tanya">BANYAK TANYA</option>
                    <option value="Ragu-ragu">RAGU-RAGU</option>
                    <option value="Cerewet">CEREWET</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full border-4 border-black p-4 font-black uppercase tracking-widest focus:bg-yellow-50 outline-none"
                  >
                    <option value="Pria">PRIA</option>
                    <option value="Wanita">WANITA</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as any })}
                    className="w-full border-4 border-black p-4 font-black uppercase tracking-widest focus:bg-yellow-50 outline-none"
                  >
                    <option value="Easy">EASY</option>
                    <option value="Medium">MEDIUM</option>
                    <option value="Hard">HARD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Agresivitas ({formData.aggressiveness}/10)</label>
                  <input
                    type="range" min="1" max="10"
                    value={formData.aggressiveness}
                    onChange={e => setFormData({ ...formData, aggressiveness: parseInt(e.target.value) })}
                    className="w-full h-8 accent-black"
                  />
                  <div className="flex justify-between text-[10px] font-black"><span>SOPAN</span><span>GALAK</span></div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">Kesabaran ({formData.patience}/10)</label>
                  <input
                    type="range" min="1" max="10"
                    value={formData.patience}
                    onChange={e => setFormData({ ...formData, patience: parseInt(e.target.value) })}
                    className="w-full h-8 accent-black"
                  />
                  <div className="flex justify-between text-[10px] font-black"><span>CEPET EMOSI</span><span>SABAR BANGET</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} /> Deskripsi Skenario
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Latar belakang masalahnya apa?"
                  className="w-full border-4 border-black p-4 font-bold text-lg italic tracking-tight focus:bg-yellow-50 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Users size={14} /> Profil Konsumen (Brief Tambahan untuk AI)
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.consumerProfile}
                  onChange={e => setFormData({ ...formData, consumerProfile: e.target.value })}
                  placeholder="Detail sifat atau situasi khusus dia..."
                  className="w-full border-4 border-black p-4 font-bold text-lg italic tracking-tight focus:bg-yellow-50 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white border-4 border-black p-6 font-black uppercase italic text-2xl tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] hover:bg-yellow-400 hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none mt-4 flex items-center justify-center gap-4"
              >
                {editingScenario ? <RefreshCcw size={24} strokeWidth={4} /> : <Plus size={24} strokeWidth={4} />}
                {editingScenario ? "UPDATE PERSONA" : "SIMPAN PERSONA"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

