'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SCENARIOS, SalesScenario } from '@/lib/gemini'
import { ScenarioCard } from '@/components/ScenarioCard'
import { CallInterface } from '@/components/CallInterface'
import { FeedbackView } from '@/components/FeedbackView'
import { CreateScenarioModal } from '@/components/CreateScenarioModal'
import { AllScenariosModal } from '@/components/AllScenariosModal'
import { Dashboard } from '@/components/Dashboard'
import { AdminSettingsModal } from '@/components/AdminSettingsModal'
import { CompleteProfileModal } from '@/components/CompleteProfileModal'
import { SyncIndicator, useSyncStatus } from '@/components/SyncIndicator'
import { TrendingUp, Target, Users, BarChart3, ChevronRight, Plus, LogIn, LogOut, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { loginWithGoogle, logout, db, handleFirestoreError, OperationType } from '@/lib/firebase'
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

export default function Home() {
  const { user, profile, loading: authLoading, syncStatus: authSyncStatus } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)
  const [customScenarios, setCustomScenarios] = React.useState<SalesScenario[]>([])
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isAllScenariosModalOpen, setIsAllScenariosModalOpen] = React.useState(false)
  const [editingScenario, setEditingScenario] = React.useState<SalesScenario | null>(null)
  const [isStartModalOpen, setIsStartModalOpen] = React.useState(false)
  const [salespersonName] = React.useState("")
  const [selectedScenario, setSelectedScenario] = React.useState<SalesScenario | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[] | null>(null)
  const [step, setStep] = React.useState<'selection' | 'roleplay' | 'feedback' | 'dashboard'>('selection')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = React.useState(false)
  const [settings, setSettings] = React.useState<any>({ modelProvider: 'gemini', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' })
  const [isMounted, setIsMounted] = React.useState(false)

  const isAdmin = user?.email?.toLowerCase().trim() === "faizalsyahiddin@gmail.com" || user?.email?.toLowerCase().trim() === "groupmarketing.mbn@gmail.com"

  const [globalStats, setGlobalStats] = React.useState({ totalSessions: 0, topSalesperson: '-', activeScenarios: 0, winRate: 0 })
  const [statsLoaded, setStatsLoaded] = React.useState(false)
  const { status: dataSyncStatus, startSync, endSync } = useSyncStatus()

  // Combined sync status - syncing if either auth or data is syncing
  const syncStatus = authSyncStatus === 'syncing' || dataSyncStatus === 'syncing'
    ? 'syncing'
    : authSyncStatus === 'error' || dataSyncStatus === 'error'
    ? 'error'
    : authSyncStatus === 'offline' || dataSyncStatus === 'offline'
    ? 'offline'
    : 'synced'

  // Prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load settings
  React.useEffect(() => {
    if (!user) return
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data())
      }
    })
    return () => unsubSettings()
  }, [user])

  // Load global stats from Firestore
  React.useEffect(() => {
    startSync()

    let firstDataReceived = false

    // Total Scenarios
    const qScenarios = query(collection(db, 'scenarios'))
    const unsubScenarios = onSnapshot(qScenarios, (snapshot) => {
      // Total = Built-in + Firestore Custom
      setGlobalStats(prev => ({ ...prev, activeScenarios: SCENARIOS.length + snapshot.size }))
      setStatsLoaded(true)

      // End sync after first data received
      if (!firstDataReceived) {
        firstDataReceived = true
        endSync()
      }
    })

    // Total Sessions & Leaderboard
    const qSessions = query(collection(db, 'sessions'))
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessions = snapshot.docs.map(doc => doc.data())
      const counts: Record<string, number> = {}
      let wins = 0

      sessions.forEach(s => {
        counts[s.salespersonName] = (counts[s.salespersonName] || 0) + 1
        // Define a "win" as overall score >= 70
        if (s.score >= 70) wins++
      })

      let topName = '-'
      let maxCount = 0
      Object.entries(counts).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count
          topName = name
        }
      })

      const winRate = snapshot.size > 0 ? Math.round((wins / snapshot.size) * 100) : 0

      setGlobalStats(prev => ({
        ...prev,
        totalSessions: snapshot.size,
        topSalesperson: topName,
        winRate
      }))
      setStatsLoaded(true)

      // End sync after first data received
      if (!firstDataReceived) {
        firstDataReceived = true
        endSync()
      }
    })

    return () => {
      unsubScenarios()
      unsubSessions()
    }
  }, [startSync, endSync])

  // Load custom scenarios from Firestore
  React.useEffect(() => {
    // We allow public read for scenarios
    const q = query(collection(db, 'scenarios'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalesScenario[]
      setCustomScenarios(docs)
    }, (err) => {
      // Only log error if it's not a permission error or if user is logged in
      if (!err.message.includes('permission-denied')) {
        handleFirestoreError(err, OperationType.LIST, 'scenarios')
      }
    })

    return () => unsubscribe()
  }, [])

  const handleCreateScenario = async (newScenario: SalesScenario) => {
    if (!user) {
      alert("Please login first to save scenarios.")
      return
    }

    const path = 'scenarios'
    try {
      const scenarioId = newScenario.id || `custom_${Date.now()}`
      await setDoc(doc(db, path, scenarioId), {
        ...newScenario,
        id: scenarioId,
        userId: user.uid,
        createdAt: serverTimestamp()
      })
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path)
    } finally {
      setEditingScenario(null)
    }
  }

  const handleDeleteScenario = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isAdmin) {
      alert("Only admins can delete scenarios.")
      return
    }

    if (!confirm("Are you sure you want to delete this scenario?")) {
      return
    }

    try {
      await deleteDoc(doc(db, 'scenarios', scenarioId))
      alert("Scenario deleted successfully!")
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'scenarios')
      alert("Failed to delete scenario: " + (err as Error).message)
    }
  }

  const handleEditScenario = (scenario: SalesScenario, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingScenario(scenario)
    setIsModalOpen(true)
  }

  const allScenarios = React.useMemo(() => {
    const merged = [...SCENARIOS];
    customScenarios.forEach(cs => {
      const idx = merged.findIndex(s => s.id === cs.id);
      if (idx !== -1) {
        merged[idx] = cs;
      } else {
        merged.push(cs);
      }
    });
    return merged;
  }, [customScenarios]);

  const handleSelectScenario = (scenario: SalesScenario) => {
    if (!user) {
      if (isLoggingIn) return
      setIsLoggingIn(true)
      loginWithGoogle().then((res) => {
        if (res) {
          setSelectedScenario(scenario)
          setIsStartModalOpen(true)
        }
      }).catch(err => {
        if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
          alert("Login error: " + err.message)
        }
      }).finally(() => {
        setIsLoggingIn(false)
      })
      return
    }
    setSelectedScenario(scenario)
    setIsStartModalOpen(true)
  }

  const handleStartSim = () => {
    setStep('roleplay')
    setIsStartModalOpen(false)
  }

  const handleFinishRoleplay = (finalTranscript: { role: 'user' | 'model'; text: string }[]) => {
    setTranscript(finalTranscript)
    setStep('feedback')
  }

  const handleRestart = () => {
    setTranscript(null)
    setStep('roleplay')
  }

  const effectiveSalespersonName = profile?.displayName || salespersonName

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-white text-black font-sans select-none" suppressHydrationWarning>
        <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning>
          <div className="text-2xl font-black tracking-tighter uppercase italic" suppressHydrationWarning>Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-black font-sans select-none" suppressHydrationWarning>
      {user && !authLoading && !profile && (
        <CompleteProfileModal 
          isOpen={true} 
          user={user} 
          onComplete={() => {}} 
        />
      )}
      {/* Navigation */}
      <nav className="min-h-16 h-auto py-2 sm:h-20 sm:py-0 border-b-4 border-black flex items-center justify-between px-4 sm:px-8 bg-white sticky top-0 z-50">
        <div className="flex items-baseline space-x-2 cursor-pointer" onClick={() => {
          setStep('selection');
          setIsMobileMenuOpen(false);
        }}>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase leading-none italic">SalesLab</h1>
          <span className="text-[8px] sm:text-[10px] font-bold bg-black text-white px-1.5 sm:px-2 py-0.5 uppercase tracking-widest leading-none">Internal Hub</span>
        </div>

        <div className="hidden lg:flex space-x-8 font-black uppercase text-sm tracking-widest">
          <a href="#" onClick={() => setStep('selection')} className={step === 'selection' ? 'border-b-2 border-black' : 'text-gray-400 hover:text-black transition-colors'}>Simulation</a>
          <button onClick={() => alert('Feature Tactics coming soon! Fokus dulu ke Simulasi.')} className="text-gray-400 hover:text-black transition-colors font-black uppercase">Tactics</button>
          <button onClick={() => alert('Feature History coming soon! Hasil simpanan lokal ada di Dashboard.')} className="text-gray-400 hover:text-black transition-colors font-black uppercase">History</button>
        </div>

        <div className="flex items-center gap-3">
          <SyncIndicator status={syncStatus} />
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('dashboard')}
                  className="hidden sm:block bg-black text-white px-4 sm:px-6 py-2 font-black uppercase tracking-tighter text-xs sm:text-sm border-2 border-black hover:bg-white hover:text-black transition-all shrink-0"
                >
                  DASHBOARD
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setIsAdminSettingsOpen(true)}
                    className="p-1 sm:p-2 border-2 border-black hover:bg-black hover:text-white transition-all text-black"
                    title="Settings Admin"
                  >
                    <SettingsIcon size={18} />
                  </button>
                )}
                <button
                  onClick={() => logout()}
                  className="p-1 sm:p-2 border-2 border-black hover:bg-black hover:text-white transition-all text-black"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                id="masuk-button"
                disabled={isLoggingIn}
                onClick={() => {
                  setIsLoggingIn(true)
                  loginWithGoogle()
                    .catch(err => {
                      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
                        alert("Login error: " + err.message)
                      }
                    })
                    .finally(() => setIsLoggingIn(false))
                }}
                className="flex bg-yellow-400 text-black px-4 sm:px-6 py-2 font-black uppercase tracking-tighter text-xs sm:text-sm border-2 border-black hover:bg-black hover:text-white transition-all items-center gap-2 disabled:opacity-50"
              >
                <LogIn size={16} /> <span className="hidden xs:inline">{isLoggingIn ? "MENGHUBUNGKAN..." : "MASUK"}</span>
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-all transition-colors"
          >
            <div className="w-5 h-5 relative flex flex-col justify-between">
              <span className={`w-full h-1 bg-current transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-full h-1 bg-current transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`w-full h-1 bg-current transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-white border-b-4 border-black overflow-hidden sticky top-16 sm:top-20 z-40"
          >
            <div className="flex flex-col p-4 space-y-4 font-black uppercase text-xs tracking-widest">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[10px]">Server Status</span>
                <SyncIndicator status={syncStatus} />
              </div>
              <button onClick={() => { setStep('selection'); setIsMobileMenuOpen(false); }} className={`p-3 text-left border-l-8 ${step === 'selection' ? 'border-black bg-yellow-400' : 'border-gray-200 text-gray-400'}`}>Simulation</button>
              <button onClick={() => { alert('Durung Rampung Bolo'); setIsMobileMenuOpen(false); }} className="p-3 text-left border-l-8 border-gray-100 text-gray-400">Tactics</button>
              <button onClick={() => { alert('Sejarah Diubah Oleh Yang Menang'); setIsMobileMenuOpen(false); }} className="p-3 text-left border-l-8 border-gray-100 text-gray-400">History</button>
              {user && <button onClick={() => { setStep('dashboard'); setIsMobileMenuOpen(false); }} className="p-3 text-left border-l-8 border-black bg-black text-white">DASHBOARD KITA</button>}
              {isAdmin && <button onClick={() => { setIsAdminSettingsOpen(true); setIsMobileMenuOpen(false); }} className="p-3 text-left border-l-8 border-yellow-400 bg-yellow-400 text-black flex items-center gap-2 font-black uppercase"><SettingsIcon size={16} /> Admin Settings</button>}
              {!user && <button 
                disabled={isLoggingIn}
                onClick={() => { 
                  setIsLoggingIn(true)
                  loginWithGoogle()
                    .catch(err => {
                      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
                        alert("Login error: " + err.message)
                      }
                    })
                    .finally(() => {
                      setIsLoggingIn(false)
                      setIsMobileMenuOpen(false)
                    })
                }} 
                className="p-3 text-left border-l-8 border-yellow-400 bg-yellow-400 text-black disabled:opacity-50"
              >
                {isLoggingIn ? "MENGHUBUNGKAN..." : "MASUK / LOGIN"}
              </button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero */}
              <div className="max-w-3xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white border-2 border-black text-[10px] font-black tracking-widest uppercase italic">
                  <Target size={12} />
                  Training Ground Sales Kita
                </div>
                <h1 className="text-4xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase italic">
                  AI Consumer Status : <span className="text-green-500">Online</span>
                </h1>
              </div>

              {/* Stats Bar */}
              {statsLoaded && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 py-6 sm:py-10 border-y-8 border-black bg-gray-50/50">
                  {[
                    { icon: <Users size={16}/>, label: "Total Sims", value: globalStats.totalSessions.toLocaleString() },
                    { icon: <TrendingUp size={16}/>, label: "Top Sales", value: globalStats.topSalesperson },
                    { icon: <Target size={16}/>, label: "Scenarios", value: globalStats.activeScenarios.toString() },
                    { icon: <BarChart3 size={16}/>, label: "Win Rate", value: `${globalStats.winRate}%` },
                  ].map((stat, i) => (
                    <div key={i} className={`space-y-1 relative group ${i === 1 ? 'bg-yellow-400 -mx-4 px-4 py-2 sm:bg-yellow-400 sm:-mx-0 sm:px-6 sm:py-4 border-l-4 border-black' : 'px-4 sm:px-6'}`}>
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="p-1 bg-black text-white rounded-none group-hover:rotate-12 transition-transform">{stat.icon}</div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${i === 1 ? 'text-black' : 'text-gray-900'}`}>{stat.label}</span>
                      </div>
                      <div className="text-2xl sm:text-5xl font-black italic tracking-tighter truncate leading-none">{stat.value}</div>
                      {i !== 3 && <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-black/10" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Grid */}
              <div className="space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-4 border-black pb-4 gap-4">
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase italic">Pilih Skenario</h2>
                  <div className="flex gap-2 sm:gap-4">
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black text-white bg-black px-3 sm:px-4 py-2 hover:bg-yellow-400 hover:text-black transition-all tracking-widest uppercase italic border-2 border-black"
                    >
                      <Plus size={14} strokeWidth={3} /> TAMBAH PERSONA
                    </button>
                    <button 
                      onClick={() => setIsAllScenariosModalOpen(true)}
                      className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-black cursor-pointer hover:underline underline-offset-4 tracking-widest uppercase"
                    >
                      LIHAT SEMUA <ChevronRight size={14} className="border-2 border-black" />
                    </button>
                  </div>
                </div>
                <div id="scenarios-list" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {allScenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onSelect={handleSelectScenario}
                      onEdit={handleEditScenario}
                      onDelete={handleDeleteScenario}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>

              <CreateScenarioModal 
                isOpen={isModalOpen} 
                onClose={() => {
                  setIsModalOpen(false)
                  setEditingScenario(null)
                }} 
                onCreated={handleCreateScenario} 
                editingScenario={editingScenario}
              />

              <AdminSettingsModal 
                key={settings.updatedAt?.toString() || 'initial'}
                isOpen={isAdminSettingsOpen}
                onClose={() => setIsAdminSettingsOpen(false)}
                currentSettings={settings}
              />

              <AllScenariosModal
                isOpen={isAllScenariosModalOpen}
                onClose={() => setIsAllScenariosModalOpen(false)}
                scenarios={allScenarios}
                onSelect={handleSelectScenario}
                onEdit={handleEditScenario}
                onDelete={handleDeleteScenario}
                isAdmin={isAdmin}
              />

              <AnimatePresence>
                {isStartModalOpen && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsStartModalOpen(false)}
                      className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative w-full max-w-md bg-white border-8 border-black p-8 shadow-[20px_20px_0px_0px_rgba(255,255,255,0.2)]"
                    >
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-6 bg-black text-white p-4 rotate-[-1deg]">MULAI PANGGILAN</h2>
                      <p className="font-bold mb-6 text-gray-600 text-sm italic">Halo, {profile?.displayName || salespersonName}. Siap melakukan simulasi panggilan dengan persona ini?</p>

                      <button
                        onClick={handleStartSim}
                        className="w-full bg-black text-white border-4 border-black p-5 font-black uppercase italic text-xl tracking-tighter hover:bg-yellow-400 hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                      >
                        MULAI PANGGILAN
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {step === 'roleplay' && selectedScenario && (
            <motion.div
              key="roleplay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-6xl mx-auto"
            >
              <div className="mb-8 flex items-end justify-between border-b-4 border-black pb-6">
                <div className="space-y-2">
                  <button 
                    onClick={() => setStep('selection')}
                    className="text-[10px] font-black tracking-widest uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-1 transition-colors"
                  >
                   <ChevronRight size={12} className="rotate-180 border border-gray-400" /> Balik ke Menu
                  </button>
                  <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase mb-2">{selectedScenario.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black tracking-widest uppercase text-white bg-black px-2 py-1 italic">Persona: {selectedScenario.name}</span>
                    <span className="text-[10px] font-black tracking-widest uppercase text-black border border-black px-2 py-1 italic">Sales: {effectiveSalespersonName}</span>
                  </div>
                </div>
              </div>
              <CallInterface 
                scenario={selectedScenario} 
                salespersonName={effectiveSalespersonName}
                onFinish={handleFinishRoleplay} 
                onExit={() => setStep('selection')}
              />
            </motion.div>
          )}

          {step === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Dashboard onBack={() => setStep('selection')} isAdmin={isAdmin} />
            </motion.div>
          )}

          {step === 'feedback' && selectedScenario && transcript && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FeedbackView 
                scenario={selectedScenario} 
                salespersonName={effectiveSalespersonName}
                transcript={transcript} 
                onRestart={handleRestart}
                onHome={() => setStep('selection')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      <footer className="border-t-4 border-black py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-8 mt-12 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">SalesLab</h1>
          <div className="w-1 h-8 bg-black"></div>
          <span className="font-bold text-[10px] tracking-widest text-gray-400 uppercase italic">Internal Company Tool © 2026</span>
        </div>
      </footer>
    </main>
  )
}
