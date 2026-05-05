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

  React.useEffect(() => {
    console.log("Dashboard mounted, isAdmin:", isAdmin, "User:", user?.email)
  }, [isAdmin, user])

  React.useEffect(() => {
    if (!user) return

    const path = 'sessions'
    let q;
    
    if (isAdmin && viewMode === 'all') {
      // Admins see everything
      q = query(
        collection(db, path),
        orderBy('createdAt', 'desc')
      )
    } else {
      // Normal users (or admin in personal mode) see only their own
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
    console.log("Delete button clicked for session:", sessionId)
    // Removing confirm() because it might be blocked in iframe
    // if (!confirm('Hapus riwayat sesi ini? Tindakan ini tidak bisa dibatalkan.')) return

    try {
      console.log("Calling deleteDoc for sessions/", sessionId)
      await deleteDoc(doc(db, 'sessions', sessionId))
      console.log("Delete call completed")
    } catch (err) {
      console.error("Delete operation failed error stack:", err)
      handleFirestoreError(err, OperationType.DELETE, `sessions/${sessionId}`)
      alert('Gagal menghapus sesi. Cek konsol.')
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
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-4 border-black pb-4 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-[10px] font-black tracking-widest uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-1 transition-colors"
          >
            <ChevronRight size={12} className="rotate-180 border border-gray-400" /> Balik ke Menu
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase">DASHBOARD KITA</h2>
            <SyncIndicator status={loading ? 'syncing' : 'synced'} />
          </div>
          {isAdmin && viewMode === 'all' && (
            <span className="text-[10px] font-black uppercase bg-black text-yellow-400 px-2 py-0.5 mt-1 inline-block w-fit">ADMIN VIEW</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
            <div className="flex bg-gray-100 border-2 border-black p-1">
              <button 
                onClick={() => setViewMode('all')}
                className={`px-4 py-1 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'all' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
              >
                All Users
              </button>
              <button 
                onClick={() => setViewMode('personal')}
                className={`px-4 py-1 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
              >
                Personal
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400 border-4 border-black font-black uppercase text-xs italic">
            <Trophy size={16} /> Skor Rata-rata: {avgScore}
          </div>
        </div>
      </div>

      {isAdmin && viewMode === 'all' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Search by Salesperson Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-4 border-4 border-black font-bold uppercase text-xs focus:ring-0 focus:outline-none placeholder:text-gray-300"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="p-8 bg-black text-white border-4 border-black space-y-4">
          <BarChart2 className="text-yellow-400" size={32} />
          <div className="text-4xl font-black italic tracking-tighter text-white">{sessions.length}</div>
          <div className="text-[10px] font-black uppercase tracking-widest">Total Simulasi</div>
        </div>
        
        <div className="p-8 bg-white border-4 border-black space-y-4">
          <Calendar className="text-black" size={32} />
          <div className="text-4xl font-black italic tracking-tighter text-black">
            {sessions.length > 0 ? new Date(sessions[0].createdAt?.toDate()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest">Simulasi Terakhir</div>
        </div>

        <div className="p-8 bg-white border-4 border-black space-y-4">
          <User className="text-black" size={32} />
          <div className="text-xl font-black italic tracking-tighter text-black truncate">
            {isAdmin && viewMode === 'all' ? `${uniqueSalespeople} Salespeople` : (user?.displayName || user?.email?.split('@')[0] || 'User')}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest">
            {isAdmin && viewMode === 'all' ? 'Total Sales Tertunda' : 'Profil Aktif'}
          </div>
        </div>
      </div>

      {isAdmin && viewMode === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 border-4 border-black bg-white space-y-6">
            <h3 className="text-xl font-black uppercase italic tracking-tighter border-b-2 border-black pb-2">Top Objections (Global)</h3>
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
                        <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black italic text-[10px] shrink-0">{i + 1}</div>
                        <span className="font-bold text-xs uppercase tracking-tight truncate">{obj}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">{count}x</span>
                    </div>
                  ));
              })()}
              {filteredSessions.length === 0 && <p className="text-gray-400 italic">Belum ada data objection.</p>}
            </div>
          </div>
          <div className="p-8 border-4 border-black bg-white space-y-6">
            <h3 className="text-xl font-black uppercase italic tracking-tighter border-b-2 border-black pb-2">Common Weaknesses</h3>
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
                        <div className="w-6 h-6 bg-red-400 border-2 border-black flex items-center justify-center font-black italic text-[10px] shrink-0">{i + 1}</div>
                        <span className="font-bold text-xs uppercase tracking-tight truncate">{weak}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-400">{count}x</span>
                    </div>
                  ));
              })()}
              {filteredSessions.length === 0 && <p className="text-gray-400 italic">Belum ada data kekurangan.</p>}
            </div>
          </div>
        </div>
      )}

      {isAdmin && viewMode === 'all' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase italic tracking-tighter border-b-2 border-black pb-2">Sales Leaderboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaderboard.map((item, i) => (
              <div key={item.name} className="p-4 border-4 border-black bg-white flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">#{i + 1}</span>
                    <div className={`px-2 py-0.5 border-2 border-black font-black text-[10px] italic ${
                      item.avg >= 80 ? 'bg-green-400' : item.avg >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}>
                      AVG: {item.avg}
                    </div>
                  </div>
                  <div className="text-lg font-black italic uppercase tracking-tighter truncate leading-none">{item.name}</div>
                </div>
                <div className="mt-4 flex justify-between items-end">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">
                    {item.total} Sesi
                  </div>
                  <div className="text-[8px] font-bold text-gray-300 leading-none">
                    Last: {item.lastSeen?.toDate().toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-2xl font-black uppercase italic tracking-tighter border-b-2 border-gray-200 pb-2">Riwayat Sesi</h3>
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin"></div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 border-4 border-black border-dashed text-center">
            <p className="font-bold text-gray-400 italic">Belum ada riwayat simulasi sesuai pencarian. Gas latihan!</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div 
                key={session.id} 
                onClick={() => setSelectedSession(session)}
                className="p-4 border-4 border-black bg-white hover:bg-yellow-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    {session.createdAt?.toDate().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </div>
                  <div className="text-lg font-black italic uppercase tracking-tighter truncate max-w-[250px]">
                    {session.salespersonName}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-3 py-1 border-2 border-black font-black text-sm italic ${
                    session.score >= 80 ? 'bg-green-400' : session.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}>
                    {session.score}
                  </div>
                  { isAdmin && (
                    <button 
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-2 bg-white border-2 border-black hover:bg-red-500 hover:text-white transition-all group/del"
                      title="Hapus Sesi"
                    >
                      <Trash2 size={16} className="group-hover/del:scale-110 transition-transform" />
                    </button>
                  )}
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-black transition-colors" />
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSession(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b-4 border-black bg-yellow-400 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter">HASIL SIMULASI</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">
                  {selectedSession.salespersonName} • {selectedSession.createdAt?.toDate().toLocaleString('id-ID')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="bg-black text-white p-2 border-2 border-black hover:bg-white hover:text-black transition-all font-black"
              >
                CLOSE
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
              {/* Score Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 p-6 border-4 border-black">
                <div className="space-y-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Skor Keseluruhan</div>
                  <div className={`text-7xl font-black italic tracking-tighter ${
                    selectedSession.score >= 80 ? 'text-green-500' : selectedSession.score >= 60 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {selectedSession.score}
                  </div>
                  <p className="font-bold text-sm leading-relaxed">{selectedSession.feedback?.verdict}</p>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest bg-green-400 inline-block px-2 py-1 border-2 border-black mb-2 italic">Kekuatan</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback?.strengths.map((s, i) => (
                        <li key={i} className="text-xs font-bold leading-tight flex items-start gap-2">
                          <span className="shrink-0 text-green-600">✓</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest bg-red-400 inline-block px-2 py-1 border-2 border-black mb-2 italic">Perbaikan</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback?.weaknesses.map((w, i) => (
                        <li key={i} className="text-xs font-bold leading-tight flex items-start gap-2">
                          <span className="shrink-0 text-red-600">!</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Analysis Details */}
              {selectedSession.feedback?.salesPathEvaluation && (
                <div className="p-6 border-4 border-black bg-white">
                  <h4 className="text-xs font-black uppercase tracking-widest text-black mb-4 italic">Sales Path Checklist</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(selectedSession.feedback.salesPathEvaluation).map(([stage, status]) => (
                      <div key={stage} className="flex flex-col gap-1">
                        <span className="text-[8px] font-black uppercase tracking-tighter text-gray-400">{stage}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black inline-block text-center ${
                          status === 'Good' ? 'bg-green-400' : status === 'Fair' ? 'bg-yellow-400' : status === 'Poor' ? 'bg-red-400' : 'bg-gray-100'
                        }`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-8 bg-black text-white p-6 border-4 border-black">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest bg-yellow-400 text-black inline-block px-2 py-1 border-2 border-black italic">Objections Handled</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.keyObjectionsHandled?.map((obj, i) => (
                      <li key={i} className="text-sm font-bold flex gap-2">
                        <span className="text-yellow-400 font-black">»</span> {obj}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest bg-gray-600 text-white inline-block px-2 py-1 border-2 border-white italic">Opportunities Missed</h4>
                  <ul className="space-y-1">
                    {selectedSession.feedback?.missedOpportunities?.map((opp, i) => (
                      <li key={i} className="text-sm font-bold flex gap-2 opacity-80">
                        <span className="text-red-400 font-black">!</span> {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tips Section */}
              <div className="p-6 border-4 border-black bg-black text-white">
                <h4 className="text-xs font-black uppercase tracking-widest text-yellow-400 mb-2 italic">Pro Tips</h4>
                <ul className="space-y-2">
                  {selectedSession.feedback?.actionableTips.map((tip, i) => (
                    <li key={i} className="font-bold text-sm italic flex gap-2">
                      <span className="text-yellow-400">#</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Transcript Section */}
              <div className="space-y-4">
                <h4 className="text-xl font-black uppercase italic tracking-tighter border-b-2 border-black pb-2">Transkrip Percakapan</h4>
                <div className="space-y-4">
                  {selectedSession.transcript?.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-4 border-4 border-black font-bold text-sm ${
                        msg.role === 'user' ? 'bg-yellow-400' : 'bg-white'
                      }`}>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
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
