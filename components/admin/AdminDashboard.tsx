'use client'

import * as React from 'react'
import { Users, Activity, BarChart3, Target, AlertTriangle, TrendingUp, Zap, Brain, Calendar } from 'lucide-react'

interface AdminDashboardProps {
  sessions: Array<{
    id: string
    scenarioId: string
    salespersonName: string
    score: number
    userId: string
    createdAt: any
    feedback?: {
      overallScore: number
      salesPathEvaluation?: Record<string, 'Good' | 'Fair' | 'Poor' | 'Not Done'>
    }
  }>
  totalUsers: number
  loading?: boolean
}

export function AdminDashboard({ sessions, totalUsers, loading }: AdminDashboardProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sessionsToday = sessions.filter(s => {
    const d = s.createdAt?.toDate?.() || new Date(s.createdAt)
    return d >= today
  })

  const thisWeek = new Date()
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay())
  thisWeek.setHours(0, 0, 0, 0)

  const sessionsThisWeek = sessions.filter(s => {
    const d = s.createdAt?.toDate?.() || new Date(s.createdAt)
    return d >= thisWeek
  })

  const avgScore = sessions.length > 0
    ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length)
    : 0

  const failedAnalysis = sessions.filter(s => !s.feedback).length

  // Most used scenario
  const scenarioCounts: Record<string, number> = {}
  sessions.forEach(s => {
    scenarioCounts[s.scenarioId] = (scenarioCounts[s.scenarioId] || 0) + 1
  })
  const mostUsedScenario = Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1])[0]

  // Weakest team skill
  const skillTotals: Record<string, { sum: number; count: number }> = {}
  sessions.forEach(s => {
    if (s.feedback?.salesPathEvaluation) {
      Object.entries(s.feedback.salesPathEvaluation).forEach(([key, val]) => {
        if (!skillTotals[key]) skillTotals[key] = { sum: 0, count: 0 }
        const score = val === 'Good' ? 85 : val === 'Fair' ? 65 : val === 'Poor' ? 35 : 0
        skillTotals[key].sum += score
        skillTotals[key].count++
      })
    }
  })
  const skillAverages = Object.entries(skillTotals)
    .map(([key, data]) => ({ key, avg: Math.round(data.sum / data.count) }))
    .sort((a, b) => a.avg - b.avg)

  const weakestSkill = skillAverages[0]

  const recentSessions = [...sessions]
    .sort((a, b) => {
      const da = a.createdAt?.toDate?.() || new Date(a.createdAt)
      const db = b.createdAt?.toDate?.() || new Date(b.createdAt)
      return db.getTime() - da.getTime()
    })
    .slice(0, 10)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 retro-panel bg-primary text-dark">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} />
            <span className="text-[10px] font-bold uppercase text-dark/60 font-heading">Total Users</span>
          </div>
          <div className="text-3xl font-bold font-heading">{totalUsers}</div>
        </div>

        <div className="p-5 retro-panel bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-primary" />
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Sessions Today</span>
          </div>
          <div className="text-3xl font-bold font-heading">{sessionsToday.length}</div>
        </div>

        <div className="p-5 retro-panel bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={16} className="text-primary" />
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Avg Score</span>
          </div>
          <div className="text-3xl font-bold font-heading">{avgScore}</div>
        </div>

        <div className="p-5 retro-panel bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-warning" />
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Weakest Skill</span>
          </div>
          <div className="text-lg font-bold font-heading truncate">
            {weakestSkill ? `${weakestSkill.key} (${weakestSkill.avg})` : 'N/A'}
          </div>
        </div>

        <div className="p-5 retro-panel bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-danger" />
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Failed Analysis</span>
          </div>
          <div className="text-3xl font-bold font-heading text-danger">{failedAnalysis}</div>
        </div>

        <div className="p-5 retro-panel bg-surface">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-primary" />
            <span className="text-[10px] font-bold uppercase text-muted font-heading">Most Used</span>
          </div>
          <div className="text-lg font-bold font-heading truncate">
            {mostUsedScenario ? `${mostUsedScenario[0]} (${mostUsedScenario[1]})` : 'N/A'}
          </div>
        </div>
      </div>

      {/* This Week */}
      <div className="p-5 retro-panel bg-surface">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-primary" />
          <span className="text-[10px] font-bold uppercase text-muted font-heading">This Week</span>
          <span className="text-xs font-bold ml-auto">{sessionsThisWeek.length} sessions</span>
        </div>
        <div className="h-16 flex items-end gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const day = new Date(thisWeek)
            day.setDate(day.getDate() + i)
            const dayEnd = new Date(day)
            dayEnd.setHours(23, 59, 59, 999)
            const count = sessions.filter(s => {
              const d = s.createdAt?.toDate?.() || new Date(s.createdAt)
              return d >= day && d <= dayEnd
            }).length
            const maxSessions = Math.max(...Array.from({ length: 7 }, (_, j) => {
              const d = new Date(thisWeek)
              d.setDate(d.getDate() + j)
              const de = new Date(d)
              de.setHours(23, 59, 59, 999)
              return sessions.filter(s => {
                const sd = s.createdAt?.toDate?.() || new Date(s.createdAt)
                return sd >= d && sd <= de
              }).length
            }), 1)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/20" style={{ height: `${(count / maxSessions) * 100}%`, minHeight: count > 0 ? '8px' : '0' }} />
                <span className="text-[8px] font-bold text-muted">
                  {day.toLocaleDateString('id-ID', { weekday: 'short' })}
                </span>
                <span className="text-[8px] font-bold">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase font-heading flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          Recent Sessions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-dark/15">
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading">User</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading hidden sm:table-cell">Score</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading hidden md:table-cell">Status</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading hidden lg:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session) => (
                <tr key={session.id} className="border-b border-dark/10 hover:bg-primary/5">
                  <td className="p-3 font-bold text-sm">{session.salespersonName}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 font-bold text-xs font-heading ${
                      session.score >= 80 ? 'bg-success/10 text-success'
                      : session.score >= 60 ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                    }`}>{session.score}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 font-bold text-[10px] font-heading ${
                      session.feedback ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {session.feedback ? 'Analyzed' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted font-semibold hidden lg:table-cell">
                    {session.createdAt?.toDate?.().toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted font-semibold">No sessions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
