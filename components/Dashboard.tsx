'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import { handleFirestoreError, OperationType } from '@/lib/firebase'
import { BarChart2, Calendar, Trophy, ChevronRight, User, Trash2 } from 'lucide-react'
import { SalesScenario } from '@/lib/gemini'
import { SyncIndicator } from '@/components/SyncIndicator'

interface DashboardProps {
  onBack: () => void
  isAdmin?: boolean
}

interface Session {
  id: string
  scenarioId: string
  salespersonName: string
  score: number
  userId: string
  createdAt: any
  transcript?: { role: 'user' | 'model'; text: string }[]
  feedback?: {
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    keyObjectionsHandled: string[]
    missedOpportunities: string[]
    verdict: string
    actionableTips: string[]
    salesPathEvaluation?: Record<string, 'Good' | 'Fair' | 'Poor' | 'Not Done'>
  }
}

export function Dashboard({ onBack, isAdmin }: DashboardProps) {
  const { user } = useAuth()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSession, setSelectedSession] = React.useState<Session | null>(null)
  const [viewMode, setViewMode] = React.useState<'personal' | 'all'>(isAdmin ? 'all' : 'personal')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  React.useEffect(() => {
    console.log("Dashboard mounted, isAdmin:", isAdmin, "User:", user?.email)
  }, [isAdmin, user])

  React.useEffect(() => {
    if (!user) return

    const path = 'sessions'
    let q;
    
    if (isAdmin && viewMode === 'all') {
      q = query(
        collection(db, path),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Session[]
      setSessions(data)
      setLoading(false)
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, isAdmin, viewMode])

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteError(null)

    try {
      await deleteDoc(doc(db, 'sessions', sessionId))
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sessions/${sessionId}`)
      setDeleteError('Gagal menghapus sesi. Cek konsol.')
    }
  }

  const filteredSessions = sessions.filter(s => 
    s.salespersonName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const uniqueSalespeople = new Set(filteredSessions.map(s => s.salespersonName)).size

  const leaderboard = React.useMemo(() => {
    if (viewMode !== 'all') return []
    const stats: Record<string, { total: number, sum: number, lastSeen: any }> = {}
    filteredSessions.forEach(s => {
      if (!stats[s.salespersonName]) {
        stats[s.salespersonName] = { total: 0, sum: 0, lastSeen: s.createdAt }
      }
      stats[s.salespersonName].total += 1
      stats[s.salespersonName].sum += s.score
      if (!stats[s.salespersonName].lastSeen || (s.createdAt?.toDate() > stats[s.salespersonName].lastSeen?.toDate())) {
        stats[s.salespersonName].lastSeen = s.createdAt
      }
    })
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        avg: Math.round(data.sum / data.total),
        total: data.total,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [filteredSessions, viewMode])

  const avgScore = filteredSessions.length > 0 
    ? Math.round(filteredSessions.reduce((acc, s) => acc + s.score, 0) / filteredSessions.length)
    : 0

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-4 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-[10px] font-bold uppercase text-muted hover:text-dark mb-2 flex items-center gap-1 font-heading"
          >
            <ChevronRight size={12} className="rotate-180" /> Balik ke Menu
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold font-heading">DASHBOARD KITA</h2>
            <SyncIndicator status={loading ? 'syncing' : 'synced'} />
          </div>
          {isAdmin && viewMode === 'all' && (
            <span className="text-[10px] font-bold uppercase bg-primary text-dark px-2.5 py-0.5 mt-1 inline-block font-heading">ADMIN VIEW</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <div className="flex bg-surface border-2 border-dark/15 p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-1.5 font-bold text-[10px] uppercase font-heading ${viewMode === 'all' ? 'bg-primary text-dark' : 'text-muted hover:text-dark'}`}
              >
                All Users
              </button>
              <button
                onClick={() => setViewMode('personal')}
                className={`px-4 py-1.5 font-bold text-[10px] uppercase font-heading ${viewMode === 'personal' ? 'bg-primary text-dark' : 'text-muted hover:text-dark'}`}
              >
                Personal
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-warning/10 border-2 border-warning/20 text-warning font-bold text-xs uppercase font-heading">
            <Trophy size={14} /> Skor Rata-rata: {avgScore}
          </div>
        </div>
      </div>

      {deleteError && (
        <div className="p-4 bg-danger/10 border-2 border-danger/30 text-danger font-bold text-xs uppercase" role="alert">
          {deleteError}
        </div>
      )}
      {isAdmin && viewMode === 'all' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Cari nama salesperson..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-4 retro-input bg-surface font-semibold text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-primary text-dark space-y-3 retro-panel">
          <BarChart2 className="text-dark/80" size={28} />
          <div className="text-4xl font-bold font-heading">{sessions.length}</div>
          <div className="text-[10px] font-bold uppercase text-dark/60 font-heading">Total Missions</div>
        </div>

        <div className="p-6 bg-surface retro-panel space-y-3">
          <Calendar className="text-primary" size={28} />
          <div className="text-4xl font-bold text-dark font-heading">
            {sessions.length > 0 ? new Date(sessions[0].createdAt?.toDate()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
          </div>
          <div className="text-[10px] font-bold uppercase text-muted font-heading">Last Mission</div>
        </div>

        <div className="p-6 bg-surface retro-panel space-y-3">
          <User className="text-primary" size={28} />
          <div className="text-lg font-bold text-dark truncate font-heading">
            {isAdmin && viewMode === 'all' ? `${uniqueSalespeople} Salespeople` : (user?.displayName || user?.email?.split('@')[0] || 'User')}
          </div>
          <div className="text-[10px] font-bold uppercase text-muted font-heading">
            {isAdmin && viewMode === 'all' ? 'Total Sales Tertunda' : 'Profil Aktif'}
          </div>
        </div>
      </div>

      {isAdmin && viewMode === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-surface retro-panel space-y-5">
            <h3 className="text-lg font-bold font-heading uppercase border-b border-dark/10 pb-2">Top Objections (Global)</h3>
            <div className="space-y-3">
              {(() => {
                const objections = filteredSessions.flatMap(s => s.feedback?.keyObjectionsHandled || []);
                const counts: Record<string, number> = {};
                objections.forEach(obj => counts[obj] = (counts[obj] || 0) + 1);
                return Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([obj, count], i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-6 h-6 bg-primary text-dark flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</div>
                        <span className="font-semibold text-xs truncate">{obj}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted">{count}x</span>
                    </div>
                  ));
              })()}
              {filteredSessions.length === 0 && <p className="text-muted text-sm">Belum ada data objection.</p>}
            </div>
          </div>
          <div className="p-6 bg-surface retro-panel space-y-5">
            <h3 className="text-lg font-bold font-heading uppercase border-b border-dark/10 pb-2">Common Weaknesses</h3>
            <div className="space-y-3">
              {(() => {
                const weaknesses = filteredSessions.flatMap(s => s.feedback?.weaknesses || []);
                const counts: Record<string, number> = {};
                weaknesses.forEach(w => counts[w] = (counts[w] || 0) + 1);
                return Object.entries(counts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([weak, count], i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-6 h-6 bg-danger text-surface flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</div>
                        <span className="font-semibold text-xs truncate">{weak}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted">{count}x</span>
                    </div>
                  ));
              })()}
              {filteredSessions.length === 0 && <p className="text-muted text-sm">Belum ada data kekurangan.</p>}
            </div>
          </div>
        </div>
      )}

      {isAdmin && viewMode === 'all' && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold font-heading uppercase border-b border-dark/10 pb-2">Sales Leaderboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaderboard.map((item, i) => (
              <div key={item.name} className="p-4 bg-surface retro-panel flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold uppercase text-muted font-heading">#{i + 1}</span>
                    <div className={`px-2 py-0.5 font-bold text-[10px] font-heading ${
                      item.avg >= 80 ? 'bg-success/10 text-success' : item.avg >= 60 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                    }`}>
                      AVG: {item.avg}
                    </div>
                  </div>
                  <div className="text-base font-bold uppercase truncate leading-none font-heading">{item.name}</div>
                </div>
                <div className="mt-4 flex justify-between items-end">
                  <div className="text-[10px] font-bold uppercase text-muted leading-none font-heading">
                    {item.total} Missions
                  </div>
                  <div className="text-[8px] font-semibold text-muted/50 leading-none">
                    Last: {item.lastSeen?.toDate().toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <h3 className="text-xl font-bold font-heading uppercase border-b border-dark/10 pb-2">Mission History</h3>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-[3px] border-dark/20 border-t-primary animate-spin"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 border-2 border-dashed border-dark/15 text-center">
            <p className="font-semibold text-muted">Belum ada riwayat simulasi sesuai pencarian. Gas latihan!</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="p-4 bg-surface retro-panel hover:bg-primary/5 flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase mb-1 font-heading">
                    {session.createdAt?.toDate().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </div>
                  <div className="text-base font-bold truncate max-w-[250px] font-heading">
                    {session.salespersonName}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 font-bold text-sm font-heading ${
                    session.score >= 80 ? 'bg-success/10 text-success' : session.score >= 60 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                  }`}>
                    {session.score}
                  </div>
                    {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-2 border-2 border-danger/30 bg-danger/10 hover:bg-danger hover:text-surface group/del"
                      title="Hapus Sesi"
                      aria-label={`Delete session for ${session.salespersonName}`}
                    >
                      <Trash2 size={14} className="group-hover/del:scale-110 transition-transform" />
                    </button>
                  )}
                  <ChevronRight size={18} className="text-dark/15 group-hover:text-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
            className="relative w-full max-w-4xl max-h-[90vh] bg-surface retro-panel overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b-2 border-dark/15 bg-primary text-dark flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold font-heading">HASIL SIMULASI</h3>
                <p className="text-[10px] font-bold uppercase text-dark/60 font-heading">
                  {selectedSession.salespersonName} • {selectedSession.createdAt?.toDate().toLocaleString('id-ID')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="bg-dark/20 text-dark p-2 hover:bg-dark/30 font-bold text-xs"
              >
                CLOSE
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
              {/* Score Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface p-6 border border-dark/10">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase text-muted font-heading">Skor Keseluruhan</div>
                  <div className={`text-7xl font-bold font-heading ${
                    selectedSession.score >= 80 ? 'text-success' : selectedSession.score >= 60 ? 'text-warning' : 'text-danger'
                  }`}>
                    {selectedSession.score}
                  </div>
                  <p className="font-medium text-sm leading-relaxed">{selectedSession.feedback?.verdict}</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold uppercase bg-success/10 text-success inline-block px-2.5 py-1 mb-2 font-heading">Kekuatan</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback?.strengths.map((s, i) => (
                        <li key={i} className="text-xs font-semibold leading-tight flex items-start gap-2">
                          <span className="shrink-0 text-success font-bold">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase bg-danger/10 text-danger inline-block px-2.5 py-1 mb-2 font-heading">Perbaikan</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback?.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs font-semibold leading-tight flex items-start gap-2">
                          <span className="shrink-0 text-danger font-bold">!</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Analysis Details */}
              {selectedSession.feedback?.salesPathEvaluation && (
                <div className="p-6 bg-surface border-2 border-dark/15">
                  <h4 className="text-xs font-bold uppercase text-dark mb-4 font-heading">Sales Path Checklist</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(selectedSession.feedback.salesPathEvaluation).map(([stage, status]) => (
                      <div key={stage} className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold uppercase text-muted font-heading">{stage}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 inline-block text-center font-heading ${
                          status === 'Good' ? 'bg-success/10 text-success' : status === 'Fair' ? 'bg-warning/10 text-warning' : status === 'Poor' ? 'bg-danger/10 text-danger' : 'bg-surface text-muted'
                        }`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6 bg-bg text-dark p-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-warning inline-block px-2.5 py-1 font-heading">Objections Handled</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.keyObjectionsHandled?.map((obj, i) => (
                      <li key={i} className="text-sm font-semibold flex gap-2">
                        <span className="text-warning font-bold">»</span> {obj}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase bg-dark/10 text-dark inline-block px-2.5 py-1 font-heading">Opportunities Missed</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.missedOpportunities?.map((opp, i) => (
                      <li key={i} className="text-sm font-semibold flex gap-2 opacity-80">
                        <span className="text-danger font-bold">!</span> {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tips Section */}
              <div className="p-6 bg-primary/5 border-2 border-primary/15">
                <h4 className="text-xs font-bold uppercase text-primary mb-3 font-heading">Pro Tips</h4>
                <ul className="space-y-2">
                  {selectedSession.feedback?.actionableTips.map((tip, i) => (
                    <li key={i} className="font-semibold text-sm flex gap-2 text-dark">
                      <span className="text-primary font-bold">#</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transcript Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold font-heading uppercase border-b border-dark/10 pb-2">Transkrip Percakapan</h4>
                <div className="space-y-3">
                  {selectedSession.transcript?.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-4 font-semibold text-sm border-2 ${
                        msg.role === 'user' ? 'bg-primary/10 text-dark border-primary/20' : 'bg-surface text-dark border-dark/10'
                      }`}>
                        <div className="text-[10px] font-bold uppercase mb-1 text-muted font-heading">
                          {msg.role === 'user' ? selectedSession.salespersonName : 'Customer'}
                        </div>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
