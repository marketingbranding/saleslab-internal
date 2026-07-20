'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { ChevronRight, Search, Calendar } from 'lucide-react'
import { scoreToGrade } from '@/lib/gamification'

interface HistorySession {
  id: string
  scenarioId: string
  salespersonName: string
  score: number
  createdAt: any
  feedback?: {
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    verdict: string
  }
  transcript?: { role: 'user' | 'model'; text: string }[]
}

interface MissionHistoryProps {
  sessions: HistorySession[]
  loading?: boolean
}

export function MissionHistory({ sessions, loading }: MissionHistoryProps) {
  const [search, setSearch] = React.useState('')
  const [difficultyFilter, setDifficultyFilter] = React.useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all')
  const [scoreFilter, setScoreFilter] = React.useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [selectedSession, setSelectedSession] = React.useState<HistorySession | null>(null)

  const filtered = sessions.filter(s => {
    const matchesSearch = s.salespersonName.toLowerCase().includes(search.toLowerCase())
    const matchesDifficulty = difficultyFilter === 'all' || true
    const matchesScore = scoreFilter === 'all'
      || (scoreFilter === 'high' && s.score >= 80)
      || (scoreFilter === 'medium' && s.score >= 60 && s.score < 80)
      || (scoreFilter === 'low' && s.score < 60)
    return matchesSearch && matchesDifficulty && matchesScore
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-dark/15 pb-4">
        <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Riwayat Misi</h2>
        <p className="text-muted font-semibold text-sm mt-1">
          Tinjau semua misi training yang sudah selesai
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="retro-input pl-10 bg-surface"
          />
        </div>
        <select
          value={difficultyFilter}
          onChange={e => setDifficultyFilter(e.target.value as any)}
          className="retro-input bg-surface text-sm font-bold w-full sm:w-auto"
        >
          <option value="all">Semua Kesulitan</option>
          <option value="Easy">Mudah</option>
          <option value="Medium">Sedang</option>
          <option value="Hard">Sulit</option>
        </select>
        <select
          value={scoreFilter}
          onChange={e => setScoreFilter(e.target.value as any)}
          className="retro-input bg-surface text-sm font-bold w-full sm:w-auto"
        >
          <option value="all">Semua Score</option>
          <option value="high">High (80+)</option>
          <option value="medium">Medium (60-79)</option>
          <option value="low">Low (below 60)</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 retro-panel bg-primary text-dark">
          <div className="text-2xl font-bold font-heading">{sessions.length}</div>
          <div className="text-[10px] font-bold uppercase text-dark/60 font-heading">Total Misi</div>
        </div>
        <div className="p-4 retro-panel bg-surface">
          <div className="text-2xl font-bold font-heading text-dark">
            {sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length) : '-'}
          </div>
          <div className="text-[10px] font-bold uppercase text-muted font-heading">Rata-rata Skor</div>
        </div>
        <div className="p-4 retro-panel bg-surface">
          <div className="text-2xl font-bold font-heading text-dark">
            {sessions.length > 0 ? scoreToGrade(Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length)) : '-'}
          </div>
          <div className="text-[10px] font-bold uppercase text-muted font-heading">Rata-rata Grade</div>
        </div>
        <div className="p-4 retro-panel bg-surface">
          <div className="text-2xl font-bold font-heading text-dark">
            {sessions.length > 0 ? Math.max(...sessions.map(s => s.score)) : '-'}
          </div>
          <div className="text-[10px] font-bold uppercase text-muted font-heading">Skor Tertinggi</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-dark/15 text-center space-y-4">
          <Calendar size={40} className="mx-auto text-muted/40" />
          <p className="font-bold text-muted text-lg">Belum ada riwayat misi</p>
          <p className="text-muted text-sm max-w-md mx-auto">
            Selesaikan panggilan pertama Anda untuk menghasilkan laporan.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-dark/15">
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading">Tanggal</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading">Skenario</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading hidden sm:table-cell">Skor</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading hidden sm:table-cell">Grade</th>
                <th className="p-3 text-[10px] font-bold uppercase text-muted font-heading">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => (
                <tr
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="border-b border-dark/10 hover:bg-primary/5 cursor-pointer"
                >
                  <td className="p-3 font-semibold text-sm">
                    {session.createdAt?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-3 font-bold text-sm">{session.salespersonName}</td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 font-bold text-xs font-heading ${
                      session.score >= 80 ? 'bg-success/10 text-success'
                      : session.score >= 60 ? 'bg-warning/10 text-warning'
                      : 'bg-danger/10 text-danger'
                    }`}>
                      {session.score}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-sm hidden sm:table-cell">{scoreToGrade(session.score)}</td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-primary font-heading">
                      Review <ChevronRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-dark/80"
            onClick={() => setSelectedSession(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-surface retro-panel overflow-y-auto"
          >
            <div className="p-6 border-b-2 border-dark/15 bg-primary text-dark sticky top-0 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-heading">Laporan Misi</h3>
                <p className="text-[10px] font-bold uppercase text-dark/60 font-heading">
                  {selectedSession.salespersonName} • {selectedSession.createdAt?.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="bg-dark/20 text-dark px-3 py-1.5 hover:bg-dark/30 font-bold text-xs"
              >
                CLOSE
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`text-6xl font-bold font-heading ${
                  selectedSession.score >= 80 ? 'text-success'
                  : selectedSession.score >= 60 ? 'text-warning'
                  : 'text-danger'
                }`}>
                  {selectedSession.score}
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-heading">{scoreToGrade(selectedSession.score)}</div>
                  <div className="text-[10px] font-bold uppercase text-muted font-heading">Skor Keseluruhan</div>
                </div>
              </div>

              {selectedSession.feedback?.verdict && (
                <p className="font-semibold text-sm leading-relaxed p-4 bg-bg border-2 border-dark/10">
                  {selectedSession.feedback.verdict}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase bg-success/10 text-success inline-block px-2 py-1 font-heading">Kekuatan</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.strengths?.map((s, i) => (
                      <li key={i} className="text-xs font-semibold flex items-start gap-2">
                        <span className="text-success shrink-0">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase bg-danger/10 text-danger inline-block px-2 py-1 font-heading">Perbaikan</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.weaknesses?.map((w, i) => (
                      <li key={i} className="text-xs font-semibold flex items-start gap-2">
                        <span className="text-danger shrink-0">!</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
