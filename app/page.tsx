'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { SCENARIOS, SalesScenario } from '@/lib/gemini'
import { ScenarioCard } from '@/components/ScenarioCard'
import { ScenarioBriefing } from '@/components/ScenarioBriefing'
import { CallInterface } from '@/components/CallInterface'
import { FeedbackView } from '@/components/FeedbackView'
import { MissionHistory } from '@/components/MissionHistory'
import { PerformanceScreen } from '@/components/PerformanceScreen'
import { AchievementsScreen } from '@/components/AchievementsScreen'
import { CreateScenarioModal } from '@/components/CreateScenarioModal'
import { AllScenariosModal } from '@/components/AllScenariosModal'
import { Dashboard } from '@/components/Dashboard'
import { AdminSettingsModal } from '@/components/AdminSettingsModal'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { ScenarioList } from '@/components/admin/ScenarioList'
import { PersonaList } from '@/components/admin/PersonaList'
import { PersonaData } from '@/components/admin/PersonaBuilder'
import { AISettings } from '@/components/admin/AISettings'
import { ProfileScreen } from '@/components/ProfileScreen'
import { SettingsScreen } from '@/components/SettingsScreen'
import { TrainingScreen } from '@/components/TrainingScreen'
import { CompleteProfileModal } from '@/components/CompleteProfileModal'
import { LoginScreen } from '@/components/LoginScreen'
import type { LoginVisualState } from '@/components/LoginScreen'
import ConfirmDialog from '@/components/ConfirmDialog'
import { SyncIndicator, useSyncStatus } from '@/components/SyncIndicator'
import { AppLayout } from '@/components/layout/AppLayout'
import type { AdminTab } from '@/components/admin/AdminLayout'
import { TrendingUp, Target, Users, BarChart3, ChevronRight, Plus, LayoutDashboard, UserSquare2 } from 'lucide-react'
import { calculateLevelInfo, calculateStreak, calculateXpEarned, checkAchievements, getRank } from '@/lib/gamification'
import { useAuth } from '@/lib/AuthContext'
import { loginWithGoogle, logout, db, handleFirestoreError, OperationType } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

type Step = 'selection' | 'training' | 'history' | 'performance' | 'achievements' | 'profile' | 'settings' | 'admin' | 'briefing' | 'roleplay' | 'transition' | 'report' | 'dashboard'
type LoginTransitionState = LoginVisualState | 'complete'
type EntryMode = 'login' | 'restored'

interface SessionData {
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

export default function Home() {
  const { user, profile, loading: authLoading, syncStatus: authSyncStatus } = useAuth()
  const [isLoggingIn, setIsLoggingIn] = React.useState(false)
  const [loginTransitionState, setLoginTransitionState] = React.useState<LoginTransitionState>('resolving')
  const [entryMode, setEntryMode] = React.useState<EntryMode>('restored')
  const loginInitiatedRef = React.useRef(false)
  const shouldReduceMotion = useReducedMotion()
  const [customScenarios, setCustomScenarios] = React.useState<SalesScenario[]>([])
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isAllScenariosModalOpen, setIsAllScenariosModalOpen] = React.useState(false)
  const [editingScenario, setEditingScenario] = React.useState<SalesScenario | null>(null)
  const [isStartModalOpen, setIsStartModalOpen] = React.useState(false)
  const [salespersonName] = React.useState("")
  const [selectedScenario, setSelectedScenario] = React.useState<SalesScenario | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[] | null>(null)
  const [step, setStep] = React.useState<Step>('selection')
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = React.useState(false)
  const [settings, setSettings] = React.useState<any>({ modelProvider: 'gemini', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' })
  const [sessions, setSessions] = React.useState<SessionData[]>([])
  const [adminTab, setAdminTab] = React.useState<AdminTab>('dashboard')
  const [personas, setPersonas] = React.useState<PersonaData[]>([])
  const [totalUsers, setTotalUsers] = React.useState(0)
  const [isMounted, setIsMounted] = React.useState(false)
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [pendingDeleteScenarioId, setPendingDeleteScenarioId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const isAdmin = user?.email?.toLowerCase().trim() === "faizalsyahiddin@gmail.com" || user?.email?.toLowerCase().trim() === "groupmarketing.mbn@gmail.com"

  const [globalStats, setGlobalStats] = React.useState({ totalSessions: 0, topSalesperson: '-', activeScenarios: 0, winRate: 0 })
  const [statsLoaded, setStatsLoaded] = React.useState(false)
  const { status: dataSyncStatus, startSync, endSync } = useSyncStatus()

  const syncStatus = authSyncStatus === 'syncing' || dataSyncStatus === 'syncing'
    ? 'syncing'
    : authSyncStatus === 'error' || dataSyncStatus === 'error'
    ? 'error'
    : authSyncStatus === 'offline' || dataSyncStatus === 'offline'
    ? 'offline'
    : 'synced'

  const isPermissionDenied = React.useCallback((err: any) => {
    const message = String(err?.message || '').toLowerCase()
    return err?.code === 'permission-denied' || message.includes('permission') || message.includes('insufficient permissions')
  }, [])

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isMounted) return

    if (authLoading) {
      const nextState: LoginTransitionState = isLoggingIn || loginInitiatedRef.current ? 'authenticating' : 'resolving'
      if (loginTransitionState !== nextState) setLoginTransitionState(nextState)
      return
    }

    if (!user) {
      const nextState: LoginTransitionState = isLoggingIn ? 'authenticating' : 'login'
      if (loginTransitionState !== nextState) setLoginTransitionState(nextState)
      return
    }

    if (loginTransitionState !== 'entering' && loginTransitionState !== 'complete') {
      setEntryMode(loginInitiatedRef.current ? 'login' : 'restored')
      setLoginTransitionState('entering')
    }
  }, [authLoading, isLoggingIn, isMounted, loginTransitionState, user])

  React.useEffect(() => {
    if (loginTransitionState !== 'entering') return
    const fallbackDelay = shouldReduceMotion ? 400 : entryMode === 'restored' ? 650 : 1100
    const timer = setTimeout(() => {
      setLoginTransitionState('complete')
      loginInitiatedRef.current = false
    }, fallbackDelay)
    return () => clearTimeout(timer)
  }, [entryMode, loginTransitionState, shouldReduceMotion])

  const handleLogin = React.useCallback(() => {
    if (isLoggingIn) return

    loginInitiatedRef.current = true
    setIsLoggingIn(true)
    setLoginTransitionState('authenticating')
    loginWithGoogle()
      .then(result => {
        if (!result) {
          loginInitiatedRef.current = false
          setLoginTransitionState('login')
        }
      })
      .catch(err => {
        loginInitiatedRef.current = false
        setLoginTransitionState('login')
        if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
          setNotification({ message: 'Login gagal. Silakan coba lagi.', type: 'error' })
        }
      })
      .finally(() => setIsLoggingIn(false))
  }, [isLoggingIn])

  const handleLoginExitComplete = React.useCallback(() => {
    setLoginTransitionState('complete')
    loginInitiatedRef.current = false
  }, [])

  const handleLogout = React.useCallback(() => {
    loginInitiatedRef.current = false
    setEntryMode('restored')
    setLoginTransitionState('resolving')
    return logout()
  }, [])

  React.useEffect(() => {
    if (!user) return
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data())
      }
    }, (err) => {
      if (!isPermissionDenied(err)) {
        console.error('Settings sync error:', err)
      }
    })
    return () => unsubSettings()
  }, [isPermissionDenied, user])

  React.useEffect(() => {
    startSync()

    let firstDataReceived = false

    const qScenarios = query(collection(db, 'scenarios'))
    const unsubScenarios = onSnapshot(qScenarios, (snapshot) => {
      setGlobalStats(prev => ({ ...prev, activeScenarios: SCENARIOS.length + snapshot.size }))
      setStatsLoaded(true)
      if (!firstDataReceived) {
        firstDataReceived = true
        endSync()
      }
    })

    const qSessions = isAdmin
      ? query(collection(db, 'sessions'))
      : user
      ? query(collection(db, 'sessions'), where('userId', '==', user.uid))
      : null

    if (!qSessions) {
      endSync()
      return () => unsubScenarios()
    }

    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SessionData))
      setSessions(sessionData)
      const counts: Record<string, number> = {}
      let wins = 0

      sessionData.forEach(s => {
        counts[s.salespersonName] = (counts[s.salespersonName] || 0) + 1
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

      if (!firstDataReceived) {
        firstDataReceived = true
        endSync()
      }
    })

    return () => {
      unsubScenarios()
      unsubSessions()
    }
  }, [startSync, endSync, isAdmin, user])

  React.useEffect(() => {
    const q = query(collection(db, 'scenarios'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalesScenario[]
      setCustomScenarios(docs)
    }, (err) => {
      if (!isPermissionDenied(err)) {
        handleFirestoreError(err, OperationType.LIST, 'scenarios')
      }
    })

    return () => unsubscribe()
  }, [isPermissionDenied])

  // Fetch personas
  React.useEffect(() => {
    if (!user) {
      setPersonas([])
      return
    }

    const q = query(collection(db, 'personas'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonaData[]
      setPersonas(docs)
    }, (err) => {
      if (isPermissionDenied(err)) {
        console.warn('Personas are not readable with the currently deployed Firestore rules. Continuing with an empty persona list.')
        setPersonas([])
        return
      }

      handleFirestoreError(err, OperationType.LIST, 'personas')
    })
    return () => unsubscribe()
  }, [isPermissionDenied, user])

  // Fetch total users
  React.useEffect(() => {
    if (!isAdmin) {
      setTotalUsers(0)
      return
    }

    const q = query(collection(db, 'users'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTotalUsers(snapshot.size)
    }, (err) => {
      if (!isPermissionDenied(err)) {
        console.error('Error fetching users:', err)
      }
    })
    return () => unsubscribe()
  }, [isAdmin, isPermissionDenied])

  const handleNavigate = (targetStep: string) => {
    setStep(targetStep as Step)
  }

  const handleCreateScenario = async (newScenario: SalesScenario) => {
    if (!isAdmin) {
      setNotification({ message: "Hanya admin yang bisa menyimpan skenario.", type: 'error' })
      return
    }

    if (!user) {
      setNotification({ message: "Silakan login terlebih dahulu untuk menyimpan skenario.", type: 'error' })
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
      setNotification({ message: "Hanya admin yang bisa menghapus skenario.", type: 'error' })
      return
    }

    setPendingDeleteScenarioId(scenarioId)
  }

  const confirmDeleteScenario = async () => {
    if (!pendingDeleteScenarioId) return

    try {
      await deleteDoc(doc(db, 'scenarios', pendingDeleteScenarioId))
      setNotification({ message: "Skenario berhasil dihapus!", type: 'success' })
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'scenarios')
      setNotification({ message: "Gagal menghapus skenario: " + (err as Error).message, type: 'error' })
    } finally {
      setPendingDeleteScenarioId(null)
    }
  }

  const handleEditScenario = (scenario: SalesScenario, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin) {
      setNotification({ message: "Hanya admin yang bisa mengedit skenario.", type: 'error' })
      return
    }
    setEditingScenario(scenario)
    setIsModalOpen(true)
  }

  // Admin scenario handlers (no event parameter)
  const handleAdminSaveScenario = async (scenario: SalesScenario) => {
    if (!user) return
    const scenarioId = scenario.id || `scenario_${Date.now()}`
    try {
      await setDoc(doc(db, 'scenarios', scenarioId), {
        ...scenario,
        id: scenarioId,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scenarios')
    }
  }

  const handleAdminDeleteScenario = async (scenarioId: string) => {
    try {
      await deleteDoc(doc(db, 'scenarios', scenarioId))
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `scenarios/${scenarioId}`)
    }
  }

  // Persona handlers
  const handleAdminSavePersona = async (persona: PersonaData) => {
    if (!user) return
    const personaId = persona.id || `persona_${Date.now()}`
    try {
      await setDoc(doc(db, 'personas', personaId), {
        ...persona,
        id: personaId,
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'personas')
    }
  }

  const handleAdminDeletePersona = async (personaId: string) => {
    try {
      await deleteDoc(doc(db, 'personas', personaId))
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `personas/${personaId}`)
    }
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
    return merged.filter(scenario => (scenario as any).status !== 'archived');
  }, [customScenarios]);

  const userSessions = React.useMemo(() => {
    if (!user) return []
    return sessions.filter(session => session.userId === user.uid)
  }, [sessions, user])

  const gamification = React.useMemo(() => {
    const scenarioById = new Map(allScenarios.map(scenario => [scenario.id, scenario]))
    const sortedSessions = [...userSessions].sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? 0
      const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? 0
      return aTime - bTime
    })

    let xpTotal = 0
    let currentStreakDays = 0
    let lastSessionDate: string | null = null

    sortedSessions.forEach(session => {
      const sessionDate = session.createdAt?.toDate?.() ?? null
      if (!sessionDate) return

      const streak = calculateStreak(lastSessionDate, currentStreakDays, sessionDate)
      currentStreakDays = streak.newStreakDays
      lastSessionDate = sessionDate.toISOString()

      const scenarioDifficulty = scenarioById.get(session.scenarioId)?.difficulty || 'Easy'
      xpTotal += calculateXpEarned(scenarioDifficulty, session.score || 0, currentStreakDays)
    })

    const totalSessions = userSessions.length
    const totalScore = userSessions.reduce((sum, session) => sum + (session.score || 0), 0)
    const averageScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0
    const bestScore = totalSessions > 0 ? Math.max(...userSessions.map(session => session.score || 0)) : 0
    const levelInfo = calculateLevelInfo(xpTotal)
    const achievements = checkAchievements({
      totalSessions,
      currentStreakDays,
      averageScore,
      bestScore,
    })

    return {
      ...levelInfo,
      xpTotal,
      rank: getRank(levelInfo.level),
      totalSessions,
      averageScore,
      bestScore,
      streakDays: currentStreakDays,
      achievements,
      achievementsCount: achievements.length,
    }
  }, [allScenarios, userSessions])

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
          setNotification({ message: "Error login: " + err.message, type: 'error' })
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
    setStep('briefing')
    setIsStartModalOpen(false)
  }

  const handleStartCall = () => {
    setStep('roleplay')
  }

  const handleFinishRoleplay = (finalTranscript: { role: 'user' | 'model'; text: string }[]) => {
    setTranscript(finalTranscript)
    setStep('transition')
  }

  React.useEffect(() => {
    if (step === 'transition' && transcript) {
      const timer = setTimeout(() => setStep('report'), 4000)
      return () => clearTimeout(timer)
    }
  }, [step, transcript])

  const handleRestart = () => {
    setTranscript(null)
    setStep('roleplay')
  }

  const effectiveSalespersonName = profile?.displayName || salespersonName
  const authResolving = !isMounted || authLoading
  const appReady = Boolean(user && !authResolving)
  const showLoginOverlay = !appReady || loginTransitionState !== 'complete'
  const loginVisualState: LoginVisualState = authResolving
    ? isLoggingIn || loginTransitionState === 'authenticating' ? 'authenticating' : 'resolving'
    : loginTransitionState === 'entering'
      ? 'entering'
      : isLoggingIn || loginTransitionState === 'authenticating'
        ? 'authenticating'
        : user && loginTransitionState !== 'complete'
          ? 'resolving'
          : 'login'

  const isFullscreen = step === 'roleplay' || step === 'transition'

  const content = (
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary border-2 border-primary/20 text-[10px] font-bold uppercase font-heading">
              <Target size={12} />
              AI Roleplay Training
            </div>
            <h1 className="text-4xl md:text-8xl font-bold font-heading leading-[0.9] uppercase">
              Status AI Consumer: <span className="text-warning">Online</span>
            </h1>
          </div>

          {/* Stats Bar */}
          {statsLoaded && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 sm:py-8 border-y-2 border-dark/15">
              {[
                { icon: <Users size={16}/>, label: "Total Sims", value: globalStats.totalSessions.toLocaleString(), color: "bg-primary/10 text-primary" },
                { icon: <TrendingUp size={16}/>, label: "Top Sales", value: globalStats.topSalesperson, color: "bg-warning/10 text-warning" },
                { icon: <Target size={16}/>, label: "Scenarios", value: globalStats.activeScenarios.toString(), color: "bg-success/10 text-success" },
                { icon: <BarChart3 size={16}/>, label: "Win Rate", value: `${globalStats.winRate}%`, color: "bg-danger/10 text-danger" },
              ].map((stat, i) => (
                <div key={i} className={`p-5 retro-panel ${i === 0 ? 'bg-primary text-dark border-dark' : 'bg-surface'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 ${stat.color}`}>{stat.icon}</div>
                    <span className="text-[10px] font-bold uppercase text-muted font-heading">{stat.label}</span>
                  </div>
                  <div className="text-2xl sm:text-4xl font-bold font-heading truncate leading-none">{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Notification */}
          {notification && (
            <div className={`p-4 border-2 font-bold text-xs uppercase flex items-center justify-between ${
              notification.type === 'success' ? 'bg-success/10 text-success border-success/30' : 'bg-danger/10 text-danger border-danger/30'
            }`} role="alert" aria-live="polite">
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-4 p-1 hover:opacity-70" aria-label="Tutup notifikasi">X</button>
            </div>
          )}

          {/* Scenario Grid */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-4 gap-4">
              <h2 className="text-3xl sm:text-5xl font-bold font-heading uppercase">Library Skenario</h2>
              <div className="flex gap-2 sm:gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] sm:text-[11px] retro-btn retro-btn-primary px-3 sm:px-5 py-2.5"
                  >
                    <Plus size={14} strokeWidth={3} /> BUAT MISSION
                  </button>
                )}
                <button
                  onClick={() => setIsAllScenariosModalOpen(true)}
                  className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-primary hover:text-primary/80 uppercase font-heading"
                >
                  LIHAT SEMUA <ChevronRight size={14} />
                </button>
              </div>
            </div>
            {allScenarios.length === 0 ? (
              <div className="p-16 border-2 border-dashed border-dark/15 text-center space-y-4">
                <Target size={48} className="mx-auto text-muted/40" strokeWidth={1.5} />
                <h3 className="text-xl font-bold font-heading uppercase text-muted">Belum Ada Skenario</h3>
                <p className="text-sm font-medium text-muted max-w-md mx-auto">
                  Buat skenario training pertama Anda untuk memulai simulasi roleplay berbasis AI.
                </p>
                {isAdmin && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="retro-btn retro-btn-primary px-6 py-3 font-bold uppercase text-xs"
                  >
                    <Plus size={14} strokeWidth={3} className="mr-2" /> Buat Skenario
                  </button>
                )}
              </div>
            ) : (
              <div id="scenarios-list" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {allScenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    onSelect={handleSelectScenario}
                    onEdit={isAdmin ? handleEditScenario : undefined}
                    onDelete={handleDeleteScenario}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            )}
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
            onEdit={isAdmin ? handleEditScenario : undefined}
            onDelete={handleDeleteScenario}
            isAdmin={isAdmin}
          />

          <ConfirmDialog
            isOpen={pendingDeleteScenarioId !== null}
            onClose={() => setPendingDeleteScenarioId(null)}
            onConfirm={confirmDeleteScenario}
            title="Hapus Skenario?"
            message="Skenario ini akan dihapus dari library training. Tindakan ini tidak bisa dibatalkan."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
          />

          <AnimatePresence>
            {isStartModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsStartModalOpen(false)}
                  className="absolute inset-0 bg-dark/80"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative w-full max-w-md bg-surface retro-panel p-8"
                >
                  <h2 className="text-3xl font-bold font-heading uppercase mb-4 text-dark">MULAI Mission</h2>
                  <p className="font-medium mb-6 text-muted text-sm">Siap memulai mission ini, {profile?.displayName || salespersonName}?</p>

                  <button
                    onClick={handleStartSim}
                    className="w-full retro-btn retro-btn-accent p-5 font-bold uppercase text-lg"
                  >
                    MULAI Panggilan
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {step === 'briefing' && selectedScenario && (
        <motion.div
          key="briefing"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <ScenarioBriefing
            scenario={selectedScenario}
            salespersonName={effectiveSalespersonName}
            onStart={handleStartCall}
            onBack={() => setStep('selection')}
          />
        </motion.div>
      )}

      {step === 'training' && (
        <motion.div
          key="training"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <TrainingScreen
            scenarios={allScenarios}
            sessions={userSessions}
            isAdmin={isAdmin}
            onSelect={handleSelectScenario}
            onCreateScenario={() => setIsModalOpen(true)}
            onEditScenario={isAdmin ? handleEditScenario : undefined}
            onDeleteScenario={handleDeleteScenario}
          />

          <CreateScenarioModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setEditingScenario(null)
            }}
            onCreated={handleCreateScenario}
            editingScenario={editingScenario}
          />

          <ConfirmDialog
            isOpen={pendingDeleteScenarioId !== null}
            onClose={() => setPendingDeleteScenarioId(null)}
            onConfirm={confirmDeleteScenario}
            title="Hapus Skenario?"
            message="Skenario ini akan dihapus dari library training. Tindakan ini tidak bisa dibatalkan."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
          />
        </motion.div>
      )}

      {step === 'roleplay' && selectedScenario && (
        <motion.div
          key="roleplay"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
        >
          <CallInterface
            scenario={selectedScenario}
            salespersonName={effectiveSalespersonName}
            onFinish={handleFinishRoleplay}
            onExit={() => setStep('selection')}
            frustrationSensitivity={settings.frustrationSensitivity ?? 5}
          />
        </motion.div>
      )}

      {step === 'transition' && (
        <motion.div
          key="transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center min-h-[50vh] space-y-8"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-primary text-dark p-6 retro-panel"
          >
            <Target size={48} />
          </motion.div>
          <h2 className="text-4xl font-bold font-heading uppercase">Mission Selesai</h2>
          <div className="space-y-2 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-bold uppercase text-primary"
            >
              Memproses transkrip...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-sm font-bold uppercase text-warning"
            >
              Menganalisis komunikasi...
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0 }}
              className="text-sm font-bold uppercase text-success"
            >
              Menyusun laporan mission...
            </motion.p>
          </div>
          <div className="flex gap-1">
            {[0,1,2,3,4].map(i => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-primary"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
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

      {step === 'report' && selectedScenario && transcript && (
        <motion.div
          key="report"
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

      {step === 'history' && (
        <motion.div
          key="history"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MissionHistory sessions={userSessions} loading={!statsLoaded} />
        </motion.div>
      )}

      {step === 'performance' && (
        <motion.div
          key="performance"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PerformanceScreen sessions={userSessions} loading={!statsLoaded} />
        </motion.div>
      )}

      {step === 'achievements' && (
        <motion.div
          key="achievements"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AchievementsScreen sessions={userSessions} loading={!statsLoaded} />
        </motion.div>
      )}

      {step === 'profile' && user && profile && (
        <motion.div
          key="profile"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProfileScreen user={user} profile={profile} stats={gamification} />
        </motion.div>
      )}

      {step === 'settings' && (
        <motion.div
          key="settings"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SettingsScreen settings={settings} isAdmin={isAdmin} onNavigate={handleNavigate} />
        </motion.div>
      )}

      {step === 'admin' && (
        <AdminLayout
          activeTab={adminTab}
          onTabChange={setAdminTab}
          onBack={() => setStep('selection')}
        >
          {adminTab === 'dashboard' && (
            <AdminDashboard
              sessions={sessions}
              totalUsers={totalUsers}
              loading={!statsLoaded}
            />
          )}

          {adminTab === 'scenarios' && (
            <ScenarioList
              scenarios={allScenarios}
              onSave={handleAdminSaveScenario}
              onDelete={handleAdminDeleteScenario}
              loading={!statsLoaded}
            />
          )}

          {adminTab === 'personas' && (
            <PersonaList
              personas={personas}
              onSave={handleAdminSavePersona}
              onDelete={handleAdminDeletePersona}
            />
          )}

          {adminTab === 'settings' && (
            <AISettings
              currentSettings={settings}
            />
          )}
        </AdminLayout>
      )}
    </AnimatePresence>
  )

  return (
    <div className="relative min-h-screen bg-bg">
      {appReady && (
        <motion.div
          className={`app-entry-layer ${showLoginOverlay ? 'pointer-events-none' : ''}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.18 : entryMode === 'restored' ? 0.3 : 0.65, ease: 'easeOut' }}
          aria-hidden={showLoginOverlay || undefined}
          inert={showLoginOverlay || undefined}
        >
          <AppLayout
            activeStep={step}
            onNavigate={handleNavigate}
            isAdmin={isAdmin}
            userName={profile?.displayName || undefined}
            level={gamification.level}
            xp={gamification.xpCurrent}
            xpNext={gamification.xpNext}
            streak={gamification.streakDays}
            onLogout={handleLogout}
            syncStatus={syncStatus}
            fullscreen={isFullscreen}
          >
            {content}
          </AppLayout>
        </motion.div>
      )}

      {appReady && loginTransitionState === 'complete' && user && !profile && (
        <CompleteProfileModal
          isOpen={true}
          user={user}
          onComplete={() => {
            setTimeout(() => setStep('selection'), 100)
          }}
        />
      )}

      <AnimatePresence>
        {showLoginOverlay && (
          <LoginScreen
            key="crt-login-overlay"
            onLogin={handleLogin}
            visualState={loginVisualState}
            restoredSession={entryMode === 'restored'}
            onExitComplete={handleLoginExitComplete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
