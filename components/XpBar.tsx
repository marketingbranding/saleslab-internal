'use client'

import { Star, Zap } from 'lucide-react'
import { motion } from 'motion/react'
import { calculateLevelInfo, getRank } from '@/lib/gamification'
import type { LevelInfo } from '@/lib/gamification'

interface XpBarProps {
  xpTotal: number
}

export default function XpBar({ xpTotal }: XpBarProps) {
  const { level, xpCurrent, xpNext, progress } = calculateLevelInfo(xpTotal)
  const rank = getRank(level)

  return (
    <div className="bg-surface retro-panel p-4">
      {/* Top row: Star + Level + Rank */}
      <div className="flex items-center gap-2 mb-2">
        <Star size={16} className="text-warning" />
        <span className="text-lg font-bold">Lv.{level}</span>
        <span className="text-[10px] uppercase text-muted">{rank}</span>
      </div>

      {/* Progress bar row */}
      <div className="relative">
        <div className="h-3 bg-dark/10 relative overflow-hidden">
          <motion.div
            className="bg-primary h-full"
            animate={{ width: `${progress}%` }}
          />
        </div>
        {/* XP text overlay right */}
        <div className="absolute right-0 top-4 text-[10px] font-bold text-muted">
          {xpCurrent} / {xpNext} XP
        </div>
      </div>

      {/* Bottom label */}
      <div className="flex items-center gap-1 mt-1">
        <Zap size={12} className="text-primary" />
        <span className="text-[10px] uppercase font-bold text-muted">
          {progress}% ke level berikutnya
        </span>
      </div>
    </div>
  )
}
