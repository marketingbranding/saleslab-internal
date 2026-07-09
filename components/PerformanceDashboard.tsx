'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { TrendingUp, BarChart3, Target, Award, Calendar, ChevronRight } from 'lucide-react'

interface PerformanceDashboardProps {
  sessions: Array<{
    id: string
    score: number
    scenarioId: string
    salespersonName: string
    createdAt: any
    feedback?: {
      overallScore: number
      strengths: string[]
      weaknesses: string[]
    }
  }>
}

export default function PerformanceDashboard({ sessions }: PerformanceDashboardProps) {
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        totalSessions: 0,
        recentSessions: [],
        scoreDistribution: [],
        averageTrend: 'stable' as const,
      }
    }

    const scores = sessions.map((s) => s.score)
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const bestScore = Math.max(...scores)
    const worstScore = Math.min(...scores)
    const totalSessions = sessions.length

    const sorted = [...sessions].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()
      const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()
      return dateB - dateA
    })
    const recentSessions = sorted.slice(0, 5)

    const bins = [
      { label: '0-49', min: 0, max: 49, count: 0, color: 'bg-danger' },
      { label: '50-59', min: 50, max: 59, count: 0, color: 'bg-danger' },
      { label: '60-69', min: 60, max: 69, count: 0, color: 'bg-warning' },
      { label: '70-79', min: 70, max: 79, count: 0, color: 'bg-warning' },
      { label: '80-89', min: 80, max: 89, count: 0, color: 'bg-success' },
      { label: '90-100', min: 90, max: 100, count: 0, color: 'bg-success' },
    ]

    scores.forEach((score) => {
      const bin = bins.find((b) => score >= b.min && score <= b.max)
      if (bin) bin.count++
    })

    const maxCount = Math.max(...bins.map((b) => b.count), 1)
    const scoreDistribution = bins.map((b) => ({
      ...b,
      percentage: Math.round((b.count / maxCount) * 100),
    }))

    let averageTrend: 'improving' | 'declining' | 'stable' = 'stable'
    if (scores.length >= 2) {
      const mid = Math.floor(scores.length / 2)
      const sortedByDate = [...scores].reverse()
      const firstHalfAvg = sortedByDate.slice(0, mid).reduce((a, b) => a + b, 0) / mid
      const secondHalfAvg = sortedByDate.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid)
      if (secondHalfAvg - firstHalfAvg > 3) averageTrend = 'improving'
      else if (firstHalfAvg - secondHalfAvg > 3) averageTrend = 'declining'
    }

    return {
      averageScore,
      bestScore,
      worstScore,
      totalSessions,
      recentSessions,
      scoreDistribution,
      averageTrend,
    }
  }, [sessions])

  if (sessions.length === 0) {
    return (
      <div className="p-6 bg-surface retro-panel space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold uppercase">IKHTISAR PERFORMANCE</h2>
        </div>
        <div className="py-12 text-center text-muted">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">Belum ada mission yang selesai. Mulai mission pertama Anda untuk melihat performa.</p>
        </div>
      </div>
    )
  }

  const trendColors = {
    improving: 'text-success',
    declining: 'text-danger',
    stable: 'text-muted',
  }

  const trendLabels = {
    improving: '▲ Improving',
    declining: '▼ Declining',
    stable: '— Stable',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold uppercase">Ikhtisar Performance</h2>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-primary text-black retro-panel p-4"
        >
          <p className="text-xs font-bold uppercase opacity-70">Avg Score</p>
          <p className="text-3xl font-bold mt-1">{stats.averageScore}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface retro-panel p-4"
        >
          <p className="text-xs font-bold uppercase text-muted">Best</p>
          <p className="text-3xl font-bold mt-1 text-success">{stats.bestScore}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-surface retro-panel p-4"
        >
          <p className="text-xs font-bold uppercase text-muted">Missions</p>
          <p className="text-3xl font-bold mt-1">{stats.totalSessions}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface retro-panel p-4"
        >
          <p className="text-xs font-bold uppercase text-muted">Trend</p>
          <p className={`text-lg font-bold mt-1 ${trendColors[stats.averageTrend]}`}>
            {trendLabels[stats.averageTrend]}
          </p>
        </motion.div>
      </div>

      {/* Row 2: Score Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-surface retro-panel p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase">Score Distribution</h3>
        </div>

        <div className="space-y-2">
          {stats.scoreDistribution.map((bin) => (
            <div key={bin.label} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted w-12 shrink-0">{bin.label}</span>
              <div className="flex-1 h-5 bg-dark/10 retro-panel overflow-hidden">
                <div
                  className={`h-full ${bin.color} transition-all duration-500`}
                  style={{ width: `${Math.max(bin.percentage, bin.count > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-xs font-bold w-6 text-right shrink-0">{bin.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Row 3: Mission Terbaru */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface retro-panel p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase">Mission Terbaru</h3>
        </div>

        <div className="space-y-2">
          {stats.recentSessions.map((session) => {
            const date = session.createdAt?.toDate?.()
              ? session.createdAt.toDate()
              : new Date(session.createdAt)

            const scoreBadgeColor =
              session.score >= 80
                ? 'bg-success/10 text-success'
                : session.score >= 60
                ? 'bg-warning/10 text-warning'
                : 'bg-danger/10 text-danger'

            return (
              <div
                key={session.id}
                className="flex items-center justify-between py-2 px-3 bg-dark/10 retro-panel"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-3 h-3 text-muted" />
                  <span className="text-xs text-muted">
                    {date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                    {session.salespersonName}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 retro-panel ${scoreBadgeColor}`}
                  >
                    {session.score}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted" />
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
