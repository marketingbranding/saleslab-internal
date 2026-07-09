'use client'

import * as React from 'react'
import { Plus, Search, Copy, Archive, Trash2, Edit3 } from 'lucide-react'
import { PersonaBuilder, PersonaData } from './PersonaBuilder'

interface PersonaListProps {
  personas: PersonaData[]
  onSave: (persona: PersonaData) => Promise<void>
  onDelete: (id: string) => Promise<void>
  loading?: boolean
}

export function PersonaList({ personas, onSave, onDelete, loading }: PersonaListProps) {
  const [search, setSearch] = React.useState('')
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editingPersona, setEditingPersona] = React.useState<PersonaData | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filtered = personas.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (persona: PersonaData) => {
    await onSave(persona)
    setBuilderOpen(false)
    setEditingPersona(null)
  }

  const duplicateCountRef = React.useRef(0)

  const handleDuplicate = (persona: PersonaData) => {
    duplicateCountRef.current++
    const dup: PersonaData = {
      ...persona,
      id: `persona-copy-${duplicateCountRef.current}-${persona.id}`,
      name: `${persona.name} (Copy)`,
    }
    onSave(dup)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari persona..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="retro-input pl-10 bg-surface w-full"
          />
        </div>
        <button
          onClick={() => { setEditingPersona(null); setBuilderOpen(true) }}
          className="retro-btn retro-btn-primary flex items-center gap-2 text-[10px]"
        >
          <Plus size={14} /> Persona Baru
        </button>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((persona) => (
          <div key={persona.id} className="p-5 retro-panel bg-surface space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold font-heading">{persona.name}</h4>
                <p className="text-[10px] font-bold uppercase text-muted font-heading">
                  {persona.gender} • {persona.occupation || 'N/A'}
                </p>
              </div>
              <div className={`px-2 py-0.5 text-[10px] font-bold font-heading border-2 ${
                persona.personality === 'Friendly' ? 'bg-success/10 text-success border-success/20'
                : persona.personality === 'Aggressive' ? 'bg-danger/10 text-danger border-danger/20'
                : 'bg-warning/10 text-warning border-warning/20'
              }`}>
                {persona.personality}
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-semibold text-muted">
              <span>S: {persona.speechStyle}</span>
              <span>|</span>
              <span>Agg: {persona.aggressiveness}/10</span>
              <span>|</span>
              <span>Pat: {persona.patience}/10</span>
            </div>
            <div className="flex gap-1 pt-2">
              <button onClick={() => { setEditingPersona(persona); setBuilderOpen(true) }} className="flex-1 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-dark font-bold text-[10px] uppercase font-heading flex items-center justify-center gap-1">
                <Edit3 size={12} /> Edit
              </button>
              <button onClick={() => handleDuplicate(persona)} className="px-3 bg-dark/5 text-muted hover:bg-dark/20" title="Duplicate" aria-label={`Duplicate ${persona.name}`}>
                <Copy size={14} />
              </button>
              <button onClick={() => handleDelete(persona.id)} disabled={deletingId === persona.id} className="px-3 bg-danger/10 text-danger hover:bg-danger hover:text-surface" title="Delete" aria-label={`Delete ${persona.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted font-semibold border-2 border-dashed border-dark/15">
            Tidak ada persona. Buat satu untuk memulai.
          </div>
        )}
      </div>

      {/* Builder Modal */}
      {builderOpen && (
        <PersonaBuilder
          editingPersona={editingPersona}
          onSave={handleSave}
          onClose={() => { setBuilderOpen(false); setEditingPersona(null) }}
        />
      )}
    </div>
  )
}
