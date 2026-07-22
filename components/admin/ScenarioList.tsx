'use client'

import * as React from 'react'
import { Plus, Search, Copy, Trash2, Edit3 } from 'lucide-react'
import { ScenarioBuilder } from './ScenarioBuilder'
import { duplicateScenario, type PersonaRecord, type ScenarioEditorRecord } from '@/lib/data'

interface ScenarioListProps {
  scenarios: ScenarioEditorRecord[]
  onSave: (scenario: ScenarioEditorRecord) => Promise<void>
  onDelete: (id: string) => Promise<void>
  loading?: boolean
  personas?: PersonaRecord[]
}

export function ScenarioList({ scenarios, onSave, onDelete, loading, personas = [] }: ScenarioListProps) {
  const [search, setSearch] = React.useState('')
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editingScenario, setEditingScenario] = React.useState<ScenarioEditorRecord | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const filtered = scenarios.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (scenario: ScenarioEditorRecord) => {
    await onSave(scenario)
    setBuilderOpen(false)
    setEditingScenario(null)
  }

  const handleDuplicate = (scenario: ScenarioEditorRecord) => {
    void onSave(duplicateScenario(scenario)).catch(error => console.error('Scenario duplication failed:', error))
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const difficultyColor = (d: string) =>
    d === 'Easy' ? 'bg-success/10 text-success border-success/20'
    : d === 'Hard' ? 'bg-danger/10 text-danger border-danger/20'
    : 'bg-warning/10 text-warning border-warning/20'

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari skenario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="retro-input pl-10 bg-surface w-full"
          />
        </div>
        <button
          onClick={() => { setEditingScenario(null); setBuilderOpen(true) }}
          className="retro-btn retro-btn-primary min-h-11 w-full sm:w-auto flex items-center justify-center gap-2 text-xs"
        >
          <Plus size={14} /> Skenario Baru
        </button>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.map((scenario) => (
          <article key={scenario.id} className="p-4 retro-panel bg-surface space-y-4 min-w-0">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <h3 className="font-bold text-base font-heading break-words">{scenario.title}</h3>
                <p className="text-xs font-semibold text-muted break-words mt-1">{scenario.name}</p>
              </div>
              <span className={`shrink-0 px-2 py-1 font-bold text-[11px] font-heading border-2 ${difficultyColor(scenario.difficulty)}`}>
                {scenario.difficulty}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => { setEditingScenario(scenario); setBuilderOpen(true) }}
                className="min-h-11 bg-primary/10 text-primary hover:bg-primary hover:text-dark flex items-center justify-center"
                aria-label={`Edit ${scenario.title}`}
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => handleDuplicate(scenario)}
                className="min-h-11 bg-dark/5 text-muted hover:bg-dark/20 flex items-center justify-center"
                aria-label={`Duplikasi ${scenario.title}`}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={() => handleDelete(scenario.id)}
                disabled={deletingId === scenario.id}
                className="min-h-11 bg-danger/10 text-danger hover:bg-danger hover:text-surface flex items-center justify-center disabled:opacity-50"
                aria-label={`Hapus ${scenario.title}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-muted font-semibold border-2 border-dashed border-dark/15">Tidak ada skenario</div>
        )}
      </div>

      {/* Tablet and desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-dark/15">
              <th className="p-3 text-[11px] font-bold uppercase text-muted font-heading">Judul</th>
              <th className="p-3 text-[11px] font-bold uppercase text-muted font-heading">Kesulitan</th>
              <th className="p-3 text-[11px] font-bold uppercase text-muted font-heading hidden md:table-cell">Persona</th>
              <th className="p-3 text-[11px] font-bold uppercase text-muted font-heading hidden lg:table-cell">Pembicara Pertama</th>
              <th className="p-3 text-[11px] font-bold uppercase text-muted font-heading">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((scenario) => (
              <tr key={scenario.id} className="border-b border-dark/10 hover:bg-primary/5">
                <td className="p-3 font-bold text-sm">{scenario.title}</td>
                <td className="p-3 hidden sm:table-cell">
                  <span className={`px-2 py-0.5 font-bold text-[10px] font-heading border-2 ${difficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty}
                  </span>
                </td>
                <td className="p-3 font-semibold text-sm text-muted hidden md:table-cell">{scenario.name}</td>
                <td className="p-3 text-xs font-semibold hidden lg:table-cell">{scenario.firstSpeaker}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingScenario(scenario); setBuilderOpen(true) }}
                      className="h-11 w-11 bg-primary/10 text-primary hover:bg-primary hover:text-dark flex items-center justify-center"
                      title="Edit"
                      aria-label={`Edit ${scenario.title}`}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(scenario)}
                      className="h-11 w-11 bg-dark/5 text-muted hover:bg-dark/20 flex items-center justify-center"
                      title="Duplikat"
                      aria-label={`Duplikat ${scenario.title}`}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id)}
                      disabled={deletingId === scenario.id}
                      className="h-11 w-11 bg-danger/10 text-danger hover:bg-danger hover:text-surface flex items-center justify-center"
                      title="Hapus"
                      aria-label={`Hapus ${scenario.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted font-semibold">Tidak ada skenario</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Builder Modal */}
      {builderOpen && (
        <ScenarioBuilder
          editingScenario={editingScenario}
          onSave={handleSave}
          onClose={() => { setBuilderOpen(false); setEditingScenario(null) }}
          personas={personas}
        />
      )}
    </div>
  )
}
