'use client'

import { motion } from "motion/react"
import { SalesScenario } from "@/lib/gemini"
import * as LucideIcons from "lucide-react"
import { LucideIcon, Edit2, MessageSquare, User, Trash2 } from "lucide-react"

interface ScenarioCardProps {
  scenario: SalesScenario
  onSelect: (scenario: SalesScenario) => void
  onEdit?: (scenario: SalesScenario, e: React.MouseEvent) => void
  onDelete?: (scenarioId: string, e: React.MouseEvent) => void
  isAdmin?: boolean
}

export function ScenarioCard({ scenario, onSelect, onEdit, onDelete, isAdmin }: ScenarioCardProps) {
  const Icon = (LucideIcons as any)[scenario.icon] as LucideIcon

  return (
    <motion.div
      whileHover={{ x: -2, y: -2 }}
      whileTap={{ x: 2, y: 2 }}
      onClick={() => onSelect(scenario)}
      className="group relative bg-surface retro-panel p-6 cursor-pointer flex flex-col min-h-[280px] hover:bg-primary/5"
      suppressHydrationWarning
    >
      <div className="flex justify-between items-start mb-6 gap-2">
        <div className="p-3 sm:p-4 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-dark shrink-0">
          {Icon && <Icon size={24} className="sm:w-8 sm:h-8" strokeWidth={2} />}
        </div>
        <div className="flex flex-col items-end gap-1.5 min-w-0">
          <span className={`retro-badge ${scenario.difficulty === 'Easy' ? 'bg-success/10 text-success border-success/30' :
            scenario.difficulty === 'Medium' ? 'bg-warning/10 text-warning border-warning/30' :
            'bg-danger/10 text-danger border-danger/30'
          }`}>
            {scenario.difficulty}
          </span>
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => onEdit(scenario, e)}
                className="p-1.5 sm:p-2 border-2 border-dark/15 bg-surface hover:bg-dark/5"
                aria-label={`Edit ${scenario.title}`}
              >
                <Edit2 size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={(e) => onDelete(scenario.id, e)}
                className="p-1.5 sm:p-2 border-2 border-danger/30 bg-danger/10 hover:bg-danger hover:text-white"
                title="Hapus skenario"
                aria-label={`Delete ${scenario.title}`}
              >
                <Trash2 size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-bold font-heading mb-1 tracking-tight uppercase leading-none group-hover:text-primary break-words">
        {scenario.title}
      </h3>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="retro-badge bg-dark text-surface">
          {scenario.name} ({scenario.gender === 'Pria' ? 'L' : 'P'})
        </span>
        <span className="retro-badge bg-surface text-dark">
          {scenario.firstSpeaker === 'AI' ? <MessageSquare size={10} /> : <User size={10} />}
          DULUAN
        </span>
      </div>
      <p className="text-muted text-sm mb-6 leading-tight font-medium">
        {scenario.description}
      </p>

      <div className="mt-auto pt-4 border-t-2 border-dark/10 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-muted uppercase tracking-tight font-heading">Agresivitas</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 ${i < Math.round(scenario.aggressiveness/2) ? 'bg-danger' : 'bg-dark/10'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-muted uppercase tracking-tight font-heading">Kesabaran</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 ${i < Math.round(scenario.patience / 2) ? 'bg-primary' : 'bg-dark/10'}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center text-[10px] font-bold uppercase text-dark font-heading">
          Gaya: {scenario.responseStyle}
          <LucideIcons.ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  )
}
