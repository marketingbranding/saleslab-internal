'use client'

import { motion } from 'motion/react'
import { Target, Clock, Star, User, ListChecks } from 'lucide-react'
import { SalesScenario } from '@/lib/gemini'

interface ScenarioBriefingProps {
  scenario: SalesScenario
  salespersonName: string
  onStart: () => void
  onBack: () => void
}

export function ScenarioBriefing({ scenario, salespersonName, onStart, onBack }: ScenarioBriefingProps) {
  const difficultyColor = scenario.difficulty === 'Easy' ? 'text-success bg-success/10 border-success/20'
    : scenario.difficulty === 'Hard' ? 'text-danger bg-danger/10 border-danger/20'
    : 'text-warning bg-warning/10 border-warning/20'

  const xpReward = scenario.difficulty === 'Easy' ? 50
    : scenario.difficulty === 'Hard' ? 120
    : 80

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="space-y-2">
        <button
          onClick={onBack}
          className="text-[10px] font-bold uppercase text-muted hover:text-dark mb-2 flex items-center gap-1 font-heading"
        >
          ← Kembali ke Library
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border-2 border-primary/20 text-[10px] font-bold uppercase font-heading">
          <Target size={12} />
          Mission Briefing
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-heading leading-[0.9] uppercase">
          {scenario.title}
        </h1>
        <p className="text-muted text-base font-semibold max-w-xl">
          {scenario.description}
        </p>
      </div>

      {/* Info Bar */}
      <div className="flex flex-wrap gap-3">
        <div className={`px-3 py-1.5 border-2 font-bold text-[10px] uppercase font-heading ${difficultyColor}`}>
          {scenario.difficulty}
        </div>
        <div className="px-3 py-1.5 bg-dark/5 border-2 border-dark/10 font-bold text-[10px] uppercase font-heading text-muted flex items-center gap-1.5">
          <Star size={12} /> +{xpReward} XP
        </div>
        <div className="px-3 py-1.5 bg-dark/5 border-2 border-dark/10 font-bold text-[10px] uppercase font-heading text-muted flex items-center gap-1.5">
          <Clock size={12} /> ~10 min
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Objective */}
        <div className="p-6 retro-panel bg-surface space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Target size={18} />
            <h2 className="text-sm font-bold uppercase font-heading">Objective</h2>
          </div>
          <p className="font-semibold text-base leading-relaxed">
            {scenario.description}
          </p>
        </div>

        {/* Persona */}
        <div className="p-6 retro-panel bg-surface space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <User size={18} />
            <h2 className="text-sm font-bold uppercase font-heading">Persona</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted font-heading">Name</span>
              <span className="font-bold">{scenario.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted font-heading">Gender</span>
              <span className="font-bold">{scenario.gender}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted font-heading">Mood</span>
              <span className="font-bold">{scenario.responseStyle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted font-heading">Patience</span>
              <span className="font-bold">{scenario.patience}/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Criteria */}
      <div className="p-6 retro-panel bg-surface space-y-4">
        <div className="flex items-center gap-2 text-warning">
          <ListChecks size={18} />
          <h2 className="text-sm font-bold uppercase font-heading">Success Criteria</h2>
        </div>
        <ul className="space-y-3">
          {[
            'Pahami kekhawatiran utama pelanggan\'s main concern',
            'Bangun rapport dan kepercayaan',
            'Sajikan solusi yang relevan',
            'Tangani objection secara profesional',
            'Tutup dengan langkah selanjutnya yang jelas',
          ].map((criterion, i) => (
            <li key={i} className="flex items-start gap-3 font-semibold text-sm">
              <span className="w-6 h-6 bg-warning/10 text-warning border-2 border-warning/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                {i + 1}
              </span>
              {criterion}
            </li>
          ))}
        </ul>
      </div>

      {/* Tip */}
      <div className="p-4 bg-primary/5 border-2 border-primary/15">
        <p className="text-xs font-semibold text-muted">
          <span className="font-bold text-primary uppercase">Tip:</span> Focus on discovery questions first. Let the customer speak — your job is to guide, not dominate.
        </p>
      </div>

      {/* Start Call */}
      <button
        onClick={onStart}
        className="w-full retro-btn retro-btn-accent p-6 font-bold uppercase text-2xl flex items-center justify-center gap-3"
      >
        <Target size={28} strokeWidth={3} />
        MULAI Panggilan
      </button>
    </motion.div>
  )
}
