'use client'

import * as React from 'react'
import { Trophy, Lock, Star, Zap, Clock, Award } from 'lucide-react'
import { ACHIEVEMENTS, AchievementDef } from '@/lib/gamification'

interface AchievementsScreenProps {
  sessions: Array<{
    id: string
    score: number
    createdAt: any
    feedback?: {
      overallScore: number
      salesPathEvaluation?: Record<string, 'Good' | 'Fair' | 'Poor' | 'Not Done'>
    }
  }>
  loading?: boolean
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  starter: { icon: <Star size={14} />, label: 'Starter' },
  skill: { icon: <Zap size={14} />, label: 'Skill' },
  consistency: { icon: <Clock size={14} />, label: 'Consistency' },
}

function computeProgress(
  achievement: AchievementDef,
  sessions: AchievementsScreenProps['sessions'],
): { earned: boolean; progress: number; current: number; max: number } {
  const totalSessions = sessions.length
  const bestScore = sessions.length > 0 ? Math.max(...sessions.map(s => s.score)) : 0
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0

  switch (achievement.key) {
    case 'first_mission':
      return { earned: totalSessions >= 1, progress: totalSessions >= 1 ? 100 : 0, current: totalSessions, max: 1 }
    case 'first_a_grade':
      return { earned: bestScore >= 85, progress: bestScore >= 85 ? 100 : Math.round((Math.min(bestScore, 85) / 85) * 100), current: bestScore, max: 85 }
    case 'three_day_streak':
      return { earned: false, progress: 0, current: 0, max: 3 }
    case 'ten_sessions':
      return { earned: totalSessions >= 10, progress: Math.min(Math.round((totalSessions / 10) * 100), 100), current: totalSessions, max: 10 }
    case 'perfect_empathy':
      return { earned: false, progress: 0, current: 0, max: 100 }
    case 'closer_i':
      return { earned: avgScore >= 80, progress: Math.min(Math.round((avgScore / 80) * 100), 100), current: avgScore, max: 80 }
    case 'closer_ii':
      return { earned: avgScore >= 95, progress: Math.min(Math.round((avgScore / 95) * 100), 100), current: avgScore, max: 95 }
    case 'objection_master':
      return { earned: avgScore >= 90, progress: Math.min(Math.round((avgScore / 90) * 100), 100), current: avgScore, max: 90 }
    case 'discovery_agent':
      return { earned: avgScore >= 90, progress: Math.min(Math.round((avgScore / 90) * 100), 100), current: avgScore, max: 90 }
    case 'weekly_training':
      return { earned: false, progress: 0, current: 0, max: 7 }
    case 'monthly_operator':
      return { earned: false, progress: 0, current: 0, max: 30 }
    case 'streak_7':
      return { earned: false, progress: 0, current: 0, max: 7 }
    case 'streak_30':
      return { earned: false, progress: 0, current: 0, max: 30 }
    default:
      return { earned: false, progress: 0, current: 0, max: 0 }
  }
}

export function AchievementsScreen({ sessions, loading }: AchievementsScreenProps) {
  const totalEarned = ACHIEVEMENTS.filter(a => computeProgress(a, sessions).earned).length
  const totalXP = ACHIEVEMENTS.filter(a => computeProgress(a, sessions).earned).reduce((sum, a) => sum + a.xpReward, 0)

  const grouped = ACHIEVEMENTS.reduce<Record<string, AchievementDef[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-dark/15 pb-4">
        <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Pencapaian</h2>
        <p className="text-muted font-semibold text-sm mt-1">
          Buka badge dan dapatkan XP seiring peningkatan Anda
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 retro-panel bg-primary text-dark">
              <div className="text-3xl font-bold font-heading">{totalEarned} / {ACHIEVEMENTS.length}</div>
              <div className="text-[10px] font-bold uppercase text-dark/60 font-heading">Pencapaian Unlocked</div>
            </div>
            <div className="p-4 retro-panel bg-surface">
              <div className="text-3xl font-bold font-heading text-dark">+{totalXP} XP</div>
              <div className="text-[10px] font-bold uppercase text-muted font-heading">Total XP Earned</div>
            </div>
            <div className="p-4 retro-panel bg-surface">
              <div className="text-3xl font-bold font-heading text-dark">{sessions.length}</div>
              <div className="text-[10px] font-bold uppercase text-muted font-heading">Missions Completed</div>
            </div>
          </div>

          {/* Categories */}
          {Object.entries(grouped).map(([category, achievements]) => {
            const config = CATEGORY_CONFIG[category] || { icon: <Trophy size={14} />, label: category }
            const earned = achievements.filter(a => computeProgress(a, sessions).earned).length
            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-dark/15 pb-2">
                  <div className="p-1.5 bg-primary/10 text-primary">{config.icon}</div>
                  <h3 className="text-lg font-bold uppercase font-heading">{config.label}</h3>
                  <span className="text-[10px] font-bold text-muted">{earned}/{achievements.length} unlocked</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => {
                    const progress = computeProgress(achievement, sessions)
                    return (
                      <div
                        key={achievement.key}
                        className={`p-5 retro-panel ${
                          progress.earned
                            ? 'bg-surface border-primary/30'
                            : 'bg-dark/5 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 ${
                            progress.earned ? 'bg-warning/20 text-warning' : 'bg-dark/10 text-muted'
                          }`}>
                            {progress.earned ? <Award size={20} /> : <Lock size={20} />}
                          </div>
                          <div className={`px-2 py-0.5 text-[10px] font-bold font-heading ${
                            progress.earned
                              ? 'bg-success/10 text-success border-2 border-success/20'
                              : 'bg-dark/10 text-muted border-2 border-dark/10'
                          }`}>
                            +{achievement.xpReward} XP
                          </div>
                        </div>
                        <h4 className="font-bold font-heading text-sm mb-1">{achievement.name}</h4>
                        <p className="text-xs font-semibold text-muted mb-3">{achievement.description}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-muted">Progress</span>
                            <span className={progress.earned ? 'text-success' : 'text-muted'}>
                              {progress.current}/{progress.max}
                            </span>
                          </div>
                          <div className="h-2 bg-dark/10 border border-dark/20">
                            <div
                              className={`h-full transition-all duration-500 ${
                                progress.earned ? 'bg-success' : 'bg-muted/50'
                              }`}
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
