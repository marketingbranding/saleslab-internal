'use client'

import * as React from 'react'
import { BarChart3, MessageCircle, Plus, Search, ShieldQuestion, Target, Trophy, Users } from 'lucide-react'
import { SalesScenario } from '@/lib/gemini'
import { ScenarioCard } from '@/components/ScenarioCard'

interface TrainingScreenProps {
  scenarios: SalesScenario[]
  isAdmin?: boolean
  sessions: Array<{
    id: string
    scenarioId: string
    score: number
    createdAt: any
  }>
  onSelect: (scenario: SalesScenario) => void
  onCreateScenario: () => void
  onEditScenario?: (scenario: SalesScenario, e: React.MouseEvent) => void
  onDeleteScenario?: (scenarioId: string, e: React.MouseEvent) => void
}

const MODULES = [
  {
    key: 'opening',
    label: 'Opening Call',
    description: 'Bangun rapport, atur konteks, dan mulai percakapan dengan kontrol.',
    icon: MessageCircle,
    difficulty: 'Starter',
  },
  {
    key: 'discovery',
    label: 'Discovery',
    description: 'Ajukan pertanyaan tajam dan temukan hambatan pelanggan yang sebenarnya.',
    icon: Search,
    difficulty: 'Core',
  },
  {
    key: 'objection',
    label: 'Objection Handling',
    description: 'Tangani keraguan, tekanan harga, BI checking, dan masalah kepercayaan.',
    icon: ShieldQuestion,
    difficulty: 'Advanced',
  },
  {
    key: 'closing',
    label: 'Closing',
    description: 'Arahkan pelanggan ke langkah konkret berikutnya.',
    icon: Target,
    difficulty: 'Core',
  },
]

export function TrainingScreen({
  scenarios,
  isAdmin,
  sessions,
  onSelect,
  onCreateScenario,
  onEditScenario,
  onDeleteScenario,
}: TrainingScreenProps) {
  const [query, setQuery] = React.useState('')
  const [difficulty, setDifficulty] = React.useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All')

  const completedScenarioIds = React.useMemo(
    () => new Set(sessions.map(session => session.scenarioId)),
    [sessions],
  )

  const recommended = React.useMemo(() => {
    const notCompleted = scenarios.filter(scenario => !completedScenarioIds.has(scenario.id))
    return (notCompleted.length > 0 ? notCompleted : scenarios).slice(0, 3)
  }, [completedScenarioIds, scenarios])

  const filtered = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return scenarios.filter(scenario => {
      const matchesDifficulty = difficulty === 'All' || scenario.difficulty === difficulty
      const matchesQuery = !normalizedQuery
        || scenario.title.toLowerCase().includes(normalizedQuery)
        || scenario.description.toLowerCase().includes(normalizedQuery)
        || scenario.name.toLowerCase().includes(normalizedQuery)
      return matchesDifficulty && matchesQuery
    })
  }, [difficulty, query, scenarios])

  const bestScore = sessions.length > 0 ? Math.max(...sessions.map(session => session.score || 0)) : 0

  return (
    <div className="space-y-10">
      <section className="retro-panel bg-surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border-2 border-primary/20 text-[10px] font-bold uppercase font-heading">
              <Target size={12} />
              Training Module
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-heading uppercase leading-none">
              Pilih skill yang ingin Anda latih selanjutnya.
            </h2>
            <p className="text-muted font-semibold text-sm sm:text-base max-w-2xl">
              Latih percakapan sales yang fokus, lalu langsung terjun ke mission roleplay AI live.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[360px] lg:min-w-[420px]">
            <Metric label="Missions" value={sessions.length.toString()} icon={<BarChart3 size={16} />} />
            <Metric label="Best" value={bestScore.toString()} icon={<Trophy size={16} />} />
            <Metric label="Library" value={scenarios.length.toString()} icon={<Users size={16} />} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b-2 border-dark/15 pb-3">
          <h3 className="text-xl font-bold font-heading uppercase">Skill Tracks</h3>
          <span className="text-[10px] font-bold uppercase text-muted font-heading">4 modul</span>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODULES.map(module => {
            const Icon = module.icon
            return (
              <div key={module.key} className="retro-panel bg-surface p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3 bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <span className="retro-badge bg-bg text-muted">{module.difficulty}</span>
                </div>
                <div>
                  <h4 className="font-bold font-heading uppercase text-base leading-tight">{module.label}</h4>
                  <p className="text-xs font-semibold text-muted mt-2 leading-tight">{module.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {recommended.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-dark/15 pb-3">
            <h3 className="text-xl font-bold font-heading uppercase">Recommended Next</h3>
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Berdasarkan mission yang belum selesai</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {recommended.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={onSelect}
                onEdit={isAdmin ? onEditScenario : undefined}
                onDelete={onDeleteScenario}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b-2 border-dark/15 pb-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold font-heading uppercase">Scenario Library</h3>
            <p className="text-sm font-semibold text-muted">Filter mission berdasarkan topik, persona, atau kesulitan.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 lg:min-w-[520px]">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Cari skenario..."
                className="retro-input bg-surface pl-10"
              />
            </div>
            <select
              value={difficulty}
              onChange={event => setDifficulty(event.target.value as 'All' | 'Easy' | 'Medium' | 'Hard')}
              className="retro-input bg-surface sm:w-40"
            >
              <option value="All">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            {isAdmin && (
              <button onClick={onCreateScenario} className="retro-btn retro-btn-primary px-4 py-3 font-bold uppercase text-xs flex items-center justify-center gap-2">
                <Plus size={14} /> New
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-dark/15 text-center">
            <p className="font-bold text-muted">Tidak ada skenario training yang cocok.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filtered.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={onSelect}
                onEdit={isAdmin ? onEditScenario : undefined}
                onDelete={onDeleteScenario}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-bg border-2 border-dark/10 space-y-2">
      <div className="text-primary">{icon}</div>
      <div className="text-2xl font-bold font-heading leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase text-muted font-heading">{label}</div>
    </div>
  )
}
