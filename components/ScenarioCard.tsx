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
      whileHover={{ y: -8, x: -4, boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)", transition: { duration: 0.1 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(scenario)}
      className="group relative bg-white border-4 border-black p-6 cursor-pointer hover:bg-yellow-50 transition-all flex flex-col min-h-[280px]"
      suppressHydrationWarning
    >
      <div className="flex justify-between items-start mb-6 gap-2">
        <div className="p-3 sm:p-4 bg-black text-white border-2 border-black group-hover:bg-white group-hover:text-black transition-colors shrink-0">
          {Icon && <Icon size={24} className="sm:w-8 sm:h-8" strokeWidth={2.5} />}
        </div>
        <div className="flex flex-col items-end gap-1.5 min-w-0">
          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 sm:py-1 border-2 border-black italic shrink-0 ${
            scenario.difficulty === 'Easy' ? 'bg-green-400' :
            scenario.difficulty === 'Medium' ? 'bg-yellow-400' :
            'bg-red-400'
          }`}>
            {scenario.difficulty}
          </span>
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => onEdit(scenario, e)}
                className="p-1.5 sm:p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
              >
                <Edit2 size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={(e) => onDelete(scenario.id, e)}
                className="p-1.5 sm:p-2 border-2 border-black bg-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                title="Delete scenario"
              >
                <Trash2 size={10} className="sm:w-3 sm:h-3" strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <h3 className="text-xl sm:text-2xl font-black mb-1 italic tracking-tighter uppercase leading-none group-hover:underline decoration-4 break-words">
        {scenario.title}
      </h3>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[9px] sm:text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 shrink-0">
          {scenario.name} ({scenario.gender === 'Pria' ? 'L' : 'P'})
        </span>
        <span className="text-[8px] sm:text-[9px] font-black uppercase border border-black bg-gray-100 px-1.5 py-0.5 flex items-center gap-1 shrink-0">
          {scenario.firstSpeaker === 'AI' ? <MessageSquare size={10} /> : <User size={10} />}
          DULUAN
        </span>
      </div>
      <p className="text-black text-sm mb-6 leading-tight font-bold italic opacity-70">
        {scenario.description}
      </p>
      
      <div className="mt-auto pt-4 border-t-2 border-black space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Agresivitas</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 border border-black ${i < Math.round(scenario.aggressiveness/2) ? 'bg-black' : 'bg-gray-100'}`} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Kesabaran</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 border border-black ${i < Math.round((11 - scenario.patience) / 2) ? 'bg-blue-400' : 'bg-gray-100'}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center text-[10px] font-black uppercase italic tracking-widest text-black">
          Gaya: {scenario.responseStyle}
          <LucideIcons.ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform stroke-[3]" />
        </div>
      </div>
    </motion.div>
  )
}
