'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { X, Save, User, BookOpen, Heart, MessageSquare, AlertTriangle, Eye, Mic } from 'lucide-react'
import { DEFAULT_PERSONA, PersonaData } from '@/lib/personas'
export type { PersonaData } from '@/lib/personas'

type BuilderTab = 'identity' | 'background' | 'personality' | 'speech' | 'objections' | 'hidden' | 'voice'

interface PersonaBuilderProps {
  editingPersona?: PersonaData | null
  onSave: (persona: PersonaData) => void | Promise<void>
  onClose: () => void
  allowInternalFields?: boolean
  submitLabel?: string
}

const TABS: { key: BuilderTab; label: string; icon: React.ReactNode }[] = [
  { key: 'identity', label: 'Identitas', icon: <User size={14} /> },
  { key: 'background', label: 'Latar Belakang', icon: <BookOpen size={14} /> },
  { key: 'personality', label: 'Kepribadian', icon: <Heart size={14} /> },
  { key: 'speech', label: 'Gaya Bicara', icon: <MessageSquare size={14} /> },
  { key: 'objections', label: 'Keberatan', icon: <AlertTriangle size={14} /> },
  { key: 'hidden', label: 'Aturan Tersembunyi', icon: <Eye size={14} /> },
  { key: 'voice', label: 'Suara', icon: <Mic size={14} /> },
]

export function PersonaBuilder({ editingPersona, onSave, onClose, allowInternalFields = true, submitLabel }: PersonaBuilderProps) {
  const [tab, setTab] = React.useState<BuilderTab>('identity')
  const [data, setData] = React.useState<PersonaData>(() => editingPersona || { ...DEFAULT_PERSONA, id: `persona-${Date.now()}` })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const update = (partial: Partial<PersonaData>) => setData(prev => ({ ...prev, ...partial }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.name || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(data)
    } catch (err) {
      console.error('Persona save failed:', err)
      setError(err instanceof Error ? err.message : 'Persona gagal disimpan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const renderTab = () => {
    switch (tab) {
      case 'identity':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Nama *</label>
                <input value={data.name} onChange={e => update({ name: e.target.value })} placeholder="Contoh: Ibu Siti" className="retro-input bg-surface p-4" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Jenis Kelamin</label>
                <select value={data.gender} onChange={e => update({ gender: e.target.value as any })} className="retro-input bg-surface p-4">
                  <option value="Pria">Pria</option>
                  <option value="Wanita">Wanita</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Usia</label>
                <input type="number" value={data.age} onChange={e => update({ age: parseInt(e.target.value) || 0 })} className="retro-input bg-surface p-4" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Pekerjaan</label>
                <input value={data.occupation} onChange={e => update({ occupation: e.target.value })} placeholder="Contoh: Guru" className="retro-input bg-surface p-4" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Status Keluarga</label>
                <input value={data.familyStatus} onChange={e => update({ familyStatus: e.target.value })} placeholder="Contoh: Menikah, 2 anak" className="retro-input bg-surface p-4" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Pendapatan</label>
                <input value={data.incomeRange} onChange={e => update({ incomeRange: e.target.value })} placeholder="Contoh: Rp 5-10 juta" className="retro-input bg-surface p-4" />
              </div>
            </div>
          </div>
        )

      case 'background':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Cerita Latar Belakang</label>
              <textarea value={data.backgroundStory} onChange={e => update({ backgroundStory: e.target.value })} rows={3} placeholder="Persona's background..." className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Situasi Saat Ini</label>
              <textarea value={data.currentSituation} onChange={e => update({ currentSituation: e.target.value })} rows={2} placeholder="What's happening now?" className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Tujuan</label>
                <textarea value={data.goals} onChange={e => update({ goals: e.target.value })} rows={2} placeholder="What do they want?" className="retro-input bg-surface p-4 resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Ketakutan</label>
                <textarea value={data.painPoints} onChange={e => update({ painPoints: e.target.value })} rows={2} placeholder="Apa yang mereka takuti?" className="retro-input bg-surface p-4 resize-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Motivasi</label>
              <textarea value={data.motivations} onChange={e => update({ motivations: e.target.value })} rows={2} placeholder="What drives their decisions?" className="retro-input bg-surface p-4 resize-none" />
            </div>
          </div>
        )

      case 'personality':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Tipe Kepribadian</label>
              <select value={data.personality} onChange={e => update({ personality: e.target.value })} className="retro-input bg-surface p-4">
                <option value="Friendly">Ramah</option>
                <option value="Neutral">Neutral</option>
                <option value="Skeptical">Skeptis</option>
                <option value="Aggressive">Agresif</option>
                <option value="Anxious">Cemas</option>
              </select>
            </div>
            {[
              { key: 'emotionalLevel', label: 'Emotional Level', low: 'Stoic', high: 'Emotional' },
              { key: 'aggressiveness', label: 'Aggressiveness', low: 'Passive', high: 'Aggressive' },
              { key: 'patience', label: 'Patience', low: 'Impatient', high: 'Patient' },
              { key: 'trustLevel', label: 'Trust Level', low: 'Suspicious', high: 'Trusting' },
              { key: 'curiosityLevel', label: 'Curiosity Level', low: 'Indifferent', high: 'Curious' },
            ].map(trait => (
              <div key={trait.key} className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">{trait.label} ({data[trait.key as keyof PersonaData] as number}/10)</label>
                <input
                  type="range" min="1" max="10"
                  value={data[trait.key as keyof PersonaData] as number}
                  onChange={e => update({ [trait.key]: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] font-bold text-muted">
                  <span>{trait.low}</span>
                  <span>{trait.high}</span>
                </div>
              </div>
            ))}
          </div>
        )

      case 'speech':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Gaya Bicara</label>
                <select value={data.speechStyle} onChange={e => update({ speechStyle: e.target.value })} className="retro-input bg-surface p-4">
                  <option value="To the point">To the point</option>
                  <option value="Banyak Tanya">Banyak Tanya</option>
                  <option value="Ragu-ragu">Ragu-ragu</option>
                  <option value="Cerewet">Cerewet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Nada Bicara</label>
                <select value={data.tone} onChange={e => update({ tone: e.target.value })} className="retro-input bg-surface p-4">
                  <option value="Warm">Hangat</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Formal">Formal</option>
                  <option value="Sarcastic">Sarkastis</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Formalitas</label>
                <select value={data.formality} onChange={e => update({ formality: e.target.value })} className="retro-input bg-surface p-4">
                  <option value="Very Formal">Sangat Formal</option>
                  <option value="Formal">Formal</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Casual">Santai</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Kecepatan Bicara</label>
                <select value={data.speakingSpeed} onChange={e => update({ speakingSpeed: e.target.value })} className="retro-input bg-surface p-4">
                  <option value="Slow">Lambat</option>
                  <option value="Normal">Normal</option>
                  <option value="Fast">Cepat</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Ungkapan Umum</label>
              <textarea value={data.commonPhrases} onChange={e => update({ commonPhrases: e.target.value })} rows={2} placeholder="Phrases the persona uses often..." className="retro-input bg-surface p-4 resize-none" />
            </div>
          </div>
        )

      case 'objections':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Keberatan Umum</label>
              <textarea value={data.commonObjections} onChange={e => update({ commonObjections: e.target.value })} rows={3} placeholder="What does this persona typically object to?" className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Kondisi Pemicu</label>
              <textarea value={data.triggerConditions} onChange={e => update({ triggerConditions: e.target.value })} rows={2} placeholder="What triggers their objections?" className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Perilaku Eskalasi</label>
              <textarea value={data.escalationBehavior} onChange={e => update({ escalationBehavior: e.target.value })} rows={2} placeholder="How do they react when pushed?" className="retro-input bg-surface p-4 resize-none" />
            </div>
          </div>
        )

      case 'hidden':
        return (
          <div className="space-y-5">
            <div className="p-4 bg-warning/5 border-2 border-warning/20">
              <p className="text-[10px] font-bold text-warning uppercase font-heading flex items-center gap-1">
                <Eye size={12} /> Tersembunyi dari pengguna
              </p>
              <p className="text-[10px] font-semibold text-muted mt-1">These fields are never shown to normal users.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Instruksi Tersembunyi untuk AI</label>
              <textarea value={data.hiddenInstructions} onChange={e => update({ hiddenInstructions: e.target.value })} rows={4} placeholder="Internal behavior instructions for this persona..." className="retro-input bg-surface p-4 resize-none border-warning/50 bg-warning/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Yang DIKETAHUI Persona</label>
                <textarea value={data.personaKnowledge} onChange={e => update({ personaKnowledge: e.target.value })} rows={3} placeholder="Information the persona has..." className="retro-input bg-surface p-4 resize-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Yang TIDAK Diketahui Persona</label>
                <textarea value={data.personaUnknowns} onChange={e => update({ personaUnknowns: e.target.value })} rows={3} placeholder="Information withheld from the persona..." className="retro-input bg-surface p-4 resize-none" />
              </div>
            </div>
          </div>
        )

      case 'voice':
        return (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-muted">Voice settings for this persona. Configure provider-specific settings here.</p>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Penyedia Suara</label>
              <select className="retro-input bg-surface p-4">
                <option value="default">Default (Sistem)</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="google">Google Cloud TTS</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Model Suara</label>
              <input placeholder="e.g. en-US-Neural2-F" className="retro-input bg-surface p-4" />
            </div>
            <div className="p-4 bg-primary/5 border-2 border-primary/15">
              <p className="text-xs font-semibold text-muted">Integrasi suara dikonfigurasi di tingkat sistem pada Pengaturan AI.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-dark/80"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-3xl max-h-[90vh] bg-surface retro-panel overflow-hidden flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b-2 border-dark/15 bg-primary text-dark flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold font-heading">
            {editingPersona ? 'Edit Persona' : 'Persona Baru'}
          </h3>
          <button onClick={onClose} className="p-2 bg-dark/20 hover:bg-dark/30">
            <X size={18} />
          </button>
        </div>

        <div className="flex overflow-x-auto border-b-2 border-dark/15 bg-bg shrink-0">
          {TABS.filter(t => allowInternalFields || (t.key !== 'hidden' && t.key !== 'voice')).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`min-h-11 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase font-heading whitespace-nowrap border-b-2 -mb-[2px] transition-none ${
                tab === t.key ? 'border-primary bg-primary/10 text-dark' : 'border-transparent text-muted hover:text-dark'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-w-0">
          {error && <div role="alert" className="p-3 border-2 border-danger/30 bg-danger/10 text-danger text-xs font-bold">{error}</div>}
          {renderTab()}

          <div className="flex flex-col min-[360px]:flex-row gap-3 pt-4 border-t-2 border-dark/15">
            <button type="submit" disabled={saving} className="retro-btn retro-btn-primary flex items-center gap-2 text-[11px] flex-1 justify-center disabled:opacity-50">
              <Save size={16} /> {saving ? 'Menyimpan...' : submitLabel || (editingPersona ? 'Update Persona' : 'Create Persona')}
            </button>
            <button type="button" onClick={onClose} className="retro-btn retro-btn-ghost text-[11px]">Batal</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
