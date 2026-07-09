'use client'

import * as React from 'react'
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, Zap, Brain } from 'lucide-react'
import { scoreToGrade } from '@/lib/gamification'

interface PerfSession {
  id: string
  score: number
  scenarioId: string
  salespersonName: string
  createdAt: any
  feedback?: {
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    salesPathEvaluation?: Record<string, 'Good' | 'Fair' | 'Poor' | 'Not Done'>
  }
}

interface PerformanceScreenProps {
  sessions: PerfSession[]
  loading?: boolean
}

function getTrend(sessions: PerfSession[]): 'improving' | 'declining' | 'stable' {
  if (sessions.length < 3) return 'stable'
  const recent = sessions.slice(0, 5)
  const scores = recent.map(s => s.score)
  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2))
  const secondHalf = scores.slice(Math.ceil(scores.length / 2))
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  const diff = secondAvg - firstAvg
  if (diff > 3) return 'improving'
  if (diff < -3) return 'declining'
  return 'stable'
}

function getScoreDistribution(sessions: PerfSession[]) {
  if (sessions.length === 0) return []
  const buckets = [
    { label: '0-49', min: 0, max: 49, count: 0 },
    { label: '50-59', min: 50, max: 59, count: 0 },
    { label: '60-69', min: 60, max: 69, count: 0 },
    { label: '70-79', min: 70, max: 79, count: 0 },
    { label: '80-89', min: 80, max: 89, count: 0 },
    { label: '90-100', min: 90, max: 100, count: 0 },
  ]
  sessions.forEach(s => {
    const bucket = buckets.find(b => s.score >= b.min && s.score <= b.max)
    if (bucket) bucket.count++
  })
  return buckets
}

// Skill names mapped from feedback evaluation keys
const SKILL_LABELS: Record<string, string> = {
  'Salam Pembuka': 'Opening',
  'Discovery': 'Discovery',
  'Presentasi': 'Presentation',
  'Handling Objection': 'Objection Handling',
  'Closing': 'Closing',
  'Follow Up': 'Follow Up',
}

export function PerformanceScreen({ sessions, loading }: PerformanceScreenProps) {
  const avg = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : 0
  const best = sessions.length > 0 ? Math.max(...sessions.map(s => s.score)) : 0
  const worst = sessions.length > 0 ? Math.min(...sessions.map(s => s.score)) : 0
  const trend = getTrend(sessions)
  const distribution = getScoreDistribution(sessions)
  const maxCount = Math.max(...distribution.map(d => d.count), 1)

  // Compute skill averages from salesPathEvaluation
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
    .map(([key, data]) => ({ key, label: SKILL_LABELS[key] || key, avg: Math.round(data.sum / data.count) }))
    .sort((a, b) => b.avg - a.avg)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-dark/15 pb-4">
        <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Performance</h2>
        <p className="text-muted font-semibold text-sm mt-1">
          Lacak progress dan pertumbuhan skill Anda dari waktu ke waktu
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-dark/15 text-center space-y-4">
          <BarChart3 size={40} className="mx-auto text-muted/40" />
          <p className="font-bold text-muted text-lg">Belum ada data performa</p>
          <p className="text-muted text-sm max-w-md mx-auto">
            Selesaikan mission training untuk membangun profile performa Anda.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 retro-panel bg-primary text-dark">
              <div className="text-3xl font-bold font-heading">{avg}</div>
              <div className="text-[10px] font-bold uppercase text-dark/60 font-heading">Avg Score</div>
              <div className="mt-2">
                {trend === 'improving' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-dark/70"><TrendingUp size={12} /> Improving</span>
                ) : trend === 'declining' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-dark/70"><TrendingDown size={12} /> Declining</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-dark/70"><Minus size={12} /> Stable</span>
                )}
              </div>
            </div>
            <div className="p-4 retro-panel bg-surface">
              <div className="text-3xl font-bold font-heading text-dark">{best}</div>
              <div className="text-[10px] font-bold uppercase text-muted font-heading">Best Score</div>
              <div className="mt-2 text-[10px] font-bold text-success uppercase">{scoreToGrade(best)}</div>
            </div>
            <div className="p-4 retro-panel bg-surface">
              <div className="text-3xl font-bold font-heading text-dark">{worst}</div>
              <div className="text-[10px] font-bold uppercase text-muted font-heading">Worst Score</div>
              <div className="mt-2 text-[10px] font-bold text-danger uppercase">{scoreToGrade(worst)}</div>
            </div>
            <div className="p-4 retro-panel bg-surface">
              <div className="text-3xl font-bold font-heading text-dark">{sessions.length}</div>
              <div className="text-[10px] font-bold uppercase text-muted font-heading">Total Missions</div>
            </div>
          </div>

          {/* Distribusi Score */}
          <div className="p-6 retro-panel bg-surface space-y-4">
            <h3 className="text-sm font-bold uppercase font-heading flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Distribusi Score
            </h3>
            <div className="space-y-2">
              {distribution.map((bucket) => (
                <div key={bucket.label} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted w-12 font-heading">{bucket.label}</span>
                  <div className="flex-1 h-6 bg-dark/5 border-2 border-dark/10">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(bucket.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-6 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skill Averages */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-6 retro-panel bg-surface space-y-4">
              <h3 className="text-sm font-bold uppercase font-heading flex items-center gap-2">
                <Zap size={16} className="text-success" />
                Strongest Skills
              </h3>
              {skillAverages.filter(s => s.avg >= 70).length === 0 ? (
                <p className="text-muted text-sm font-semibold">Belum cukup data</p>
              ) : (
                <div className="space-y-3">
                  {skillAverages.filter(s => s.avg >= 70).slice(0, 3).map(skill => (
                    <div key={skill.key} className="flex items-center justify-between">
                      <span className="font-bold text-sm">{skill.label}</span>
                      <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5">{skill.avg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 retro-panel bg-surface space-y-4">
              <h3 className="text-sm font-bold uppercase font-heading flex items-center gap-2">
                <Brain size={16} className="text-danger" />
                Needs Improvement
              </h3>
              {skillAverages.filter(s => s.avg < 70).length === 0 ? (
                <p className="text-muted text-sm font-semibold">Semua skill baik-baik saja!</p>
              ) : (
                <div className="space-y-3">
                  {skillAverages.filter(s => s.avg < 70).slice(0, 3).map(skill => (
                    <div key={skill.key} className="flex items-center justify-between">
                      <span className="font-bold text-sm">{skill.label}</span>
                      <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-0.5">{skill.avg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Trend */}
          <div className="p-6 retro-panel bg-surface space-y-4">
            <h3 className="text-sm font-bold uppercase font-heading flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Recent Scores
            </h3>
            <div className="flex items-end gap-2 h-32">
              {sessions.slice(0, 10).reverse().map((session, i) => (
                <div key={session.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] font-bold text-muted">{session.score}</span>
                  <div
                    className={`w-full transition-all duration-500 ${
                      session.score >= 80 ? 'bg-success'
                      : session.score >= 60 ? 'bg-warning'
                      : 'bg-danger'
                    }`}
                    style={{ height: `${(session.score / 100) * 100}%`, minHeight: '4px' }}
                  />
                  <span className="text-[8px] font-bold text-muted">
                    {session.createdAt?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
