'use client'

import { ACHIEVEMENTS, AchievementDef } from '@/lib/gamification'
import { Trophy, Medal, Flame, Target, Lock } from 'lucide-react'
import { motion } from 'motion/react'

interface AchievementGridProps {
  earnedKeys: string[]
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  starter: <Trophy className="w-4 h-4" />,
  skill: <Medal className="w-4 h-4" />,
  consistency: <Flame className="w-4 h-4" />,
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  starter: <Trophy className="w-5 h-5" />,
  skill: <Medal className="w-5 h-5" />,
  consistency: <Flame className="w-5 h-5" />,
}

const CATEGORY_LABELS: Record<string, string> = {
  starter: 'Pemula',
  skill: 'Keterampilan',
  consistency: 'Konsistensi',
}

function groupByCategory(achievements: AchievementDef[]) {
  const grouped: Record<string, AchievementDef[]> = {}
  for (const a of achievements) {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  }
  return grouped
}

export default function AchievementGrid({ earnedKeys }: AchievementGridProps) {
  const grouped = groupByCategory(ACHIEVEMENTS)

  return (
    <div className="space-y-5">
      {/* Section Title */}
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-warning" />
        <span className="text-[10px] font-bold uppercase text-muted tracking-wider">
          Achievements
        </span>
      </div>

      {/* Empty state */}
      {earnedKeys.length === 0 && (
        <div className="bg-surface retro-card p-6 text-center">
          <Target className="w-8 h-8 text-muted mx-auto mb-2 opacity-40" />
          <p className="text-xs text-muted">
            Belum ada pencapaian terbuka. Mulai misi pertama Anda!
          </p>
        </div>
      )}

      {/* Category groups */}
      {Object.entries(grouped).map(([category, achievements]) => (
        <div key={category} className="space-y-2">
          {/* Category header */}
          <div className="flex items-center gap-1.5">
            <span className="text-warning">{CATEGORY_ICONS[category]}</span>
            <span className="text-[9px] font-bold uppercase text-muted tracking-wider">
              {CATEGORY_LABELS[category] ?? category}
            </span>
          </div>

          {/* Badge grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((achievement, idx) => {
              const unlocked = earnedKeys.includes(achievement.key)

              return (
                <motion.div
                  key={achievement.key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04, duration: 0.2 }}
                  className={[
                    'retro-card p-3',
                    unlocked
                      ? 'bg-surface border border-gold/40'
                      : 'bg-surface opacity-50 grayscale',
                  ].join(' ')}
                >
                  {/* Icon */}
                  <div className="mb-2">
                    {unlocked ? (
                      <span className="text-warning">
                        {BADGE_ICONS[category] ?? <Trophy className="w-5 h-5" />}
                      </span>
                    ) : (
                      <Lock className="w-5 h-5 text-muted" />
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-xs font-bold uppercase leading-tight mb-0.5">
                    {achievement.name}
                  </div>

                  {/* Description */}
                  <div className="text-[9px] text-muted leading-snug mb-1.5">
                    {achievement.description}
                  </div>

                  {/* XP reward */}
                  <div
                    className={[
                      'text-[10px] font-bold',
                      unlocked ? 'text-warning' : 'text-muted',
                    ].join(' ')}
                  >
                    +{achievement.xpReward} XP
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
