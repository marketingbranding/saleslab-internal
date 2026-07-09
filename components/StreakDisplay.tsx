'use client'

import { Flame } from 'lucide-react'
import { motion } from 'motion/react'

interface StreakDisplayProps {
  currentStreak: number
  longestStreak?: number
}

export default function StreakDisplay({ currentStreak, longestStreak }: StreakDisplayProps) {
  const hasStreak = currentStreak > 0
  const showBest = longestStreak !== undefined && longestStreak > currentStreak

  return (
    <div className="bg-surface retro-panel p-4">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-3">
        {hasStreak ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Flame size={16} className="text-warning" />
          </motion.div>
        ) : (
          <Flame size={16} className="text-muted" />
        )}
        <span className="text-[10px] font-bold uppercase text-muted">STREAK</span>
      </div>

      {/* Main display */}
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${hasStreak ? 'text-warning' : 'text-muted'}`}>
          {currentStreak}
        </span>
        <span className="text-sm font-bold uppercase text-muted">hari</span>
      </div>

      {/* Zero-state message */}
      {!hasStreak && (
        <p className="text-muted text-xs mt-2">
          Mulai mission untuk memulai streak Anda!
        </p>
      )}

      {/* Best streak */}
      {showBest && (
        <p className="text-[10px] font-bold text-muted mt-2">
          Terbaik: {longestStreak} hari
        </p>
      )}
    </div>
  )
}
