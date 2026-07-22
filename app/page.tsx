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
import { PersonaAdminWorkspace } from '@/components/admin/PersonaAdminWorkspace'
import { BranchManager } from '@/components/admin/BranchManager'
import { AISettings } from '@/components/admin/AISettings'
import { BranchSelectionModal } from '@/components/BranchSelectionModal'
import { PersonaSubmissionsScreen } from '@/components/PersonaSubmissionsScreen'
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
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, runTransaction, writeBatch, deleteField } from 'firebase/firestore'
import { DEFAULT_BRANCHES, normalizePersonaData, PersonaData, PersonaSubmission, UserMembership, submissionToPersonaData, toPersonaPublicData } from '@/lib/personas'
import { DataAccessError, getBranchRepository, type BranchRecord } from '@/lib/data'

type Step = 'selection' | 'training' | 'history' | 'performance' | 'achievements' | 'personas' | 'profile' | 'settings' | 'admin' | 'briefing' | 'roleplay' | 'transition' | 'report' | 'dashboard'
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
  const [selectedPersonaSnapshot, setSelectedPersonaSnapshot] = React.useState<PersonaData | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[] | null>(null)
  const [step, setStep] = React.useState<Step>('selection')
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = React.useState(false)
  const [settings, setSettings] = React.useState<any>({ modelProvider: 'gemini', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3' })
  const [sessions, setSessions] = React.useState<SessionData[]>([])
  const [adminTab, setAdminTab] = React.useState<AdminTab>('dashboard')
  const [personas, setPersonas] = React.useState<PersonaData[]>([])
  const [personaSecrets, setPersonaSecrets] = React.useState<Record<string, Pick<PersonaData, 'hiddenInstructions' | 'personaKnowledge' | 'personaUnknowns'>>>({})
  const [personaSecretsLoaded, setPersonaSecretsLoaded] = React.useState(false)
  const [scenarioSecrets, setScenarioSecrets] = React.useState<Record<string, string>>({})
  const [branches, setBranches] = React.useState<BranchRecord[]>([])
  const [branchesLoaded, setBranchesLoaded] = React.useState(false)
  const [branchCatalogSeeded, setBranchCatalogSeeded] = React.useState<boolean | null>(null)
  const [membership, setMembership] = React.useState<UserMembership | null>(null)
  const [memberships, setMemberships] = React.useState<UserMembership[]>([])
  const [personaSubmissions, setPersonaSubmissions] = React.useState<PersonaSubmission[]>([])
  const [membershipLoaded, setMembershipLoaded] = React.useState(false)
  const [hasAdminDocument, setHasAdminDocument] = React.useState(false)
  const [totalUsers, setTotalUsers] = React.useState(0)
  const [isMounted, setIsMounted] = React.useState(false)
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [pendingDeleteScenarioId, setPendingDeleteScenarioId] = React.useState<string | null>(null)
  const branchSeedStartedRef = React.useRef(false)

  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const isAdmin = hasAdminDocument

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
    if (!isAdmin) {
      setPersonaSecrets({})
      setPersonaSecretsLoaded(false)
      return
    }
    return onSnapshot(query(collection(db, 'personaSecrets')), snapshot => {
      const secrets: Record<string, Pick<PersonaData, 'hiddenInstructions' | 'personaKnowledge' | 'personaUnknowns'>> = {}
      snapshot.docs.forEach(item => {
        const value = item.data()
        secrets[item.id] = {
          hiddenInstructions: String(value.hiddenInstructions || ''),
          personaKnowledge: String(value.personaKnowledge || ''),
          personaUnknowns: String(value.personaUnknowns || ''),
        }
      })
      setPersonaSecrets(secrets)
      setPersonaSecretsLoaded(true)
    }, err => {
      setPersonaSecretsLoaded(true)
      if (!isPermissionDenied(err)) handleFirestoreError(err, OperationType.LIST, 'personaSecrets')
    })
  }, [isAdmin, isPermissionDenied])

  React.useEffect(() => {
    if (!isAdmin) {
      setScenarioSecrets({})
      return
    }
    return onSnapshot(query(collection(db, 'scenarioSecrets')), snapshot => {
      const secrets: Record<string, string> = {}
      snapshot.docs.forEach(item => { secrets[item.id] = String(item.data().hiddenRules || '') })
      setScenarioSecrets(secrets)
    }, err => {
      if (!isPermissionDenied(err)) handleFirestoreError(err, OperationType.LIST, 'scenarioSecrets')
    })
  }, [isAdmin, isPermissionDenied])

  React.useEffect(() => {
    if (!isAdmin || !user) return
    const legacyPersonas = personas.filter(persona => persona.hiddenInstructions || persona.personaKnowledge || persona.personaUnknowns)
    if (legacyPersonas.length === 0) return

    Promise.all(legacyPersonas.map(persona => runTransaction(db, async transaction => {
      const publicRef = doc(db, 'personas', persona.id)
      const secretRef = doc(db, 'personaSecrets', persona.id)
      const publicSnapshot = await transaction.get(publicRef)
      const secretSnapshot = await transaction.get(secretRef)
      if (!publicSnapshot.exists()) return
      const publicData = publicSnapshot.data()
      if (!publicData.hiddenInstructions && !publicData.personaKnowledge && !publicData.personaUnknowns) return
      if (!secretSnapshot.exists()) {
        transaction.set(secretRef, {
          hiddenInstructions: String(publicData.hiddenInstructions || ''),
          personaKnowledge: String(publicData.personaKnowledge || ''),
          personaUnknowns: String(publicData.personaUnknowns || ''),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      }
      transaction.update(publicRef, {
        hiddenInstructions: deleteField(),
        personaKnowledge: deleteField(),
        personaUnknowns: deleteField(),
      })
    }))).catch(err => handleFirestoreError(err, OperationType.UPDATE, 'personas/private-fields-migration'))
  }, [isAdmin, personas, user])

  React.useEffect(() => {
    if (!isAdmin || !user) return
    const legacyScenarios = customScenarios.filter(scenario => scenario.hiddenRules)
    if (legacyScenarios.length === 0) return
    Promise.all(legacyScenarios.map(scenario => runTransaction(db, async transaction => {
      const publicRef = doc(db, 'scenarios', scenario.id)
      const secretRef = doc(db, 'scenarioSecrets', scenario.id)
      const publicSnapshot = await transaction.get(publicRef)
      const secretSnapshot = await transaction.get(secretRef)
      if (!publicSnapshot.exists() || !publicSnapshot.data().hiddenRules) return
      if (!secretSnapshot.exists()) {
        transaction.set(secretRef, {
          hiddenRules: String(publicSnapshot.data().hiddenRules),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        })
      }
      transaction.update(publicRef, { hiddenRules: deleteField() })
    }))).catch(err => handleFirestoreError(err, OperationType.UPDATE, 'scenarios/private-fields-migration'))
  }, [customScenarios, isAdmin, user])

  React.useEffect(() => {
    if (!user) {
      setHasAdminDocument(false)
      return
    }

    return onSnapshot(doc(db, 'admins', user.uid), snapshot => {
      setHasAdminDocument(snapshot.exists())
    }, err => {
      if (!isPermissionDenied(err)) console.error('Admin access sync error:', err)
      setHasAdminDocument(false)
    })
  }, [isPermissionDenied, user])

  React.useEffect(() => {
    if (!user) {
      setBranches([])
      setBranchesLoaded(false)
      setMembership(null)
      setMembershipLoaded(false)
      return
    }

    const unsubscribeBranches = getBranchRepository().subscribe(items => {
      setBranches(items)
      setBranchesLoaded(true)
    }, err => {
      setBranchesLoaded(true)
      if (err.category !== 'forbidden') handleFirestoreError(err.originalError || err, OperationType.LIST, 'branches')
    })

    const unsubscribeMembership = onSnapshot(doc(db, 'userMemberships', user.uid), snapshot => {
      setMembership(snapshot.exists() ? ({ userId: snapshot.id, ...snapshot.data() } as UserMembership) : null)
      setMembershipLoaded(true)
    }, err => {
      setMembershipLoaded(true)
      if (!isPermissionDenied(err)) handleFirestoreError(err, OperationType.GET, `userMemberships/${user.uid}`)
    })

    return () => {
      unsubscribeBranches()
      unsubscribeMembership()
    }
  }, [isPermissionDenied, user])

  React.useEffect(() => {
    if (!isAdmin) {
      setBranchCatalogSeeded(null)
      return
    }
    return getBranchRepository().subscribeCatalogMarker(marker => {
      setBranchCatalogSeeded(marker?.version === 1)
    }, err => {
      if (err.category !== 'forbidden') handleFirestoreError(err.originalError || err, OperationType.GET, 'settings/branchCatalog')
    })
  }, [isAdmin, isPermissionDenied])

  React.useEffect(() => {
    if (!isAdmin || !user || !branchesLoaded || branchCatalogSeeded !== false || branchSeedStartedRef.current) return
    branchSeedStartedRef.current = true
    getBranchRepository().seedDefaults({ defaults: DEFAULT_BRANCHES, existing: branches, actorId: user.uid })
      .then(({ inserted }) => {
        setBranchCatalogSeeded(true)
        if (inserted > 0) setNotification({ message: `${inserted} cabang berhasil ditambahkan.`, type: 'success' })
      })
      .catch(err => {
        branchSeedStartedRef.current = false
        const cause = err instanceof DataAccessError ? err.originalError || err : err
        handleFirestoreError(cause, OperationType.CREATE, 'branches/default-seed')
        setNotification({ message: 'Daftar cabang awal gagal ditambahkan.', type: 'error' })
      })
  }, [branchCatalogSeeded, branches, branchesLoaded, isAdmin, user])

  React.useEffect(() => {
    if (!user) {
      setPersonaSubmissions([])
      return
    }

    const submissionsQuery = isAdmin
      ? query(collection(db, 'personaSubmissions'))
      : query(collection(db, 'personaSubmissions'), where('creatorUid', '==', user.uid))
    return onSnapshot(submissionsQuery, snapshot => {
      const items = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PersonaSubmission))
      setPersonaSubmissions(items.sort((a, b) => String(b.id).localeCompare(String(a.id))))
    }, err => {
      if (!isPermissionDenied(err)) handleFirestoreError(err, OperationType.LIST, 'personaSubmissions')
    })
  }, [isAdmin, isPermissionDenied, user])

  React.useEffect(() => {
    if (!isAdmin) {
      setMemberships([])
      return
    }

    return onSnapshot(query(collection(db, 'userMemberships')), snapshot => {
      setMemberships(snapshot.docs.map(item => ({ userId: item.id, ...item.data() } as UserMembership)))
    }, err => {
      if (!isPermissionDenied(err)) handleFirestoreError(err, OperationType.LIST, 'userMemberships')
    })
  }, [isAdmin, isPermissionDenied])

  React.useEffect(() => {
    if (!user) {
      endSync()
      return
    }
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
    if (!user) {
      setCustomScenarios([])
      return
    }
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
  }, [isPermissionDenied, user])

  // Fetch personas
  React.useEffect(() => {
    if (!user) {
      setPersonas([])
      return
    }

    const q = query(collection(db, 'personas'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(item => normalizePersonaData(item.id, item.data() as Partial<PersonaData>))
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
      const { hiddenRules, ...publicScenario } = newScenario
      const batch = writeBatch(db)
      batch.set(doc(db, path, scenarioId), {
        ...publicScenario,
        id: scenarioId,
        userId: user.uid,
        createdAt: serverTimestamp()
      })
      if (hiddenRules) {
        batch.set(doc(db, 'scenarioSecrets', scenarioId), { hiddenRules, updatedAt: serverTimestamp(), updatedBy: user.uid }, { merge: true })
      }
      await batch.commit()
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
      const batch = writeBatch(db)
      batch.delete(doc(db, 'scenarios', pendingDeleteScenarioId))
      batch.delete(doc(db, 'scenarioSecrets', pendingDeleteScenarioId))
      await batch.commit()
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
      const { hiddenRules, ...publicScenario } = scenario
      const batch = writeBatch(db)
      batch.set(doc(db, 'scenarios', scenarioId), {
        ...publicScenario,
        id: scenarioId,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'scenarioSecrets', scenarioId), {
        hiddenRules: hiddenRules || '',
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
      await batch.commit()
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scenarios')
    }
  }

  const handleAdminDeleteScenario = async (scenarioId: string) => {
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'scenarios', scenarioId))
      batch.delete(doc(db, 'scenarioSecrets', scenarioId))
      await batch.commit()
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `scenarios/${scenarioId}`)
    }
  }

  // Persona handlers
  const handleAdminSavePersona = async (persona: PersonaData) => {
    if (!user) return
    const personaId = persona.id || `persona_${Date.now()}`
    try {
      const batch = writeBatch(db)
      batch.set(doc(db, 'personas', personaId), {
        ...toPersonaPublicData({ ...persona, id: personaId }),
        id: personaId,
        status: persona.status || 'approved',
        version: persona.version || 1,
        creatorUid: persona.creatorUid || user.uid,
        creatorName: persona.creatorName || profile?.displayName || 'Admin',
        creatorEmail: persona.creatorEmail || user.email || '',
        creatorBranchId: persona.creatorBranchId || 'system',
        creatorBranchName: persona.creatorBranchName || 'System / Admin',
        createdBy: persona.createdBy || user.uid,
        createdAt: persona.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'personaSecrets', personaId), {
        hiddenInstructions: persona.hiddenInstructions,
        personaKnowledge: persona.personaKnowledge,
        personaUnknowns: persona.personaUnknowns,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
      await batch.commit()
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'personas')
    }
  }

  const handleAdminDeletePersona = async (personaId: string) => {
    try {
      await setDoc(doc(db, 'personas', personaId), {
        status: 'archived',
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `personas/${personaId}`)
    }
  }

  const handleSelectBranch = async (branch: BranchRecord) => {
    if (!user || !profile || !user.email) throw new Error('Profil user belum lengkap.')
    await setDoc(doc(db, 'userMemberships', user.uid), {
      userId: user.uid,
      email: user.email,
      displayName: profile.displayName,
      branchId: branch.id,
      branchName: branch.name,
      selectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  const handleCreateBranch = async (name: string) => {
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.')
    if (!isAdmin) throw new Error('Hanya admin yang dapat menambahkan cabang.')
    if (branches.some(branch => branch.normalizedName === name.toLowerCase().trim())) {
      throw new Error('Nama cabang sudah terdaftar.')
    }
    const branchId = `branch-${Date.now()}`
    await getBranchRepository().save({
      id: branchId,
      name,
      type: name.toUpperCase().startsWith('KCP ') ? 'KCP' : 'KC',
      normalizedName: name.toLowerCase().trim(),
      status: 'active',
      createdBy: user.uid,
    })
    setNotification({ message: 'Cabang berhasil ditambahkan.', type: 'success' })
  }

  const handleUpdateBranch = async (branch: BranchRecord, name: string) => {
    if (!user || !isAdmin) throw new Error('Hanya admin yang dapat mengubah cabang.')
    const normalizedName = name.toLowerCase().trim()
    if (branches.some(item => item.id !== branch.id && item.normalizedName === normalizedName)) {
      throw new Error('Nama cabang sudah terdaftar.')
    }

    await getBranchRepository().rename({
      branchId: branch.id,
      name,
      type: name.toUpperCase().startsWith('KCP ') ? 'KCP' : 'KC',
      normalizedName,
      membershipUserIds: memberships.filter(item => item.branchId === branch.id).map(item => item.userId),
      actorId: user.uid,
    })
    setNotification({ message: `${branch.name} berhasil diubah menjadi ${name}.`, type: 'success' })
  }

  const handleDeleteBranch = async (branch: BranchRecord) => {
    if (!user || !isAdmin) throw new Error('Hanya admin yang dapat menghapus cabang.')
    const memberCount = memberships.filter(item => item.branchId === branch.id).length
    if (memberCount > 0) throw new Error(`${branch.name} masih digunakan oleh ${memberCount} user.`)
    await getBranchRepository().remove(branch.id)
    setNotification({ message: `${branch.name} berhasil dihapus.`, type: 'success' })
  }

  const handleChangeMembership = async (current: UserMembership, branch: BranchRecord) => {
    if (!user || !isAdmin) return
    await setDoc(doc(db, 'userMemberships', current.userId), {
      ...current,
      branchId: branch.id,
      branchName: branch.name,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    })
    setNotification({ message: `Cabang ${current.displayName} diperbarui.`, type: 'success' })
  }

  const handleSubmitPersona = async (persona: PersonaData, options?: { targetPersonaId?: string; previousSubmissionId?: string }) => {
    if (!user || !membership) throw new Error('Pilih cabang sebelum mengajukan persona.')
    if (persona.age < 18 || persona.age > 100) throw new Error('Usia persona harus antara 18 dan 100 tahun.')
    const submissionId = `submission-${Date.now()}-${user.uid.slice(0, 12)}`
    const submission = {
      id: submissionId,
      persona: toPersonaPublicData(persona),
      status: 'pending',
      creatorUid: user.uid,
      creatorName: membership.displayName,
      creatorEmail: membership.email,
      creatorBranchId: membership.branchId,
      creatorBranchName: membership.branchName,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(options?.targetPersonaId ? { targetPersonaId: options.targetPersonaId } : {}),
      ...(options?.previousSubmissionId ? { previousSubmissionId: options.previousSubmissionId } : {}),
    }
    await setDoc(doc(db, 'personaSubmissions', submissionId), submission)
    setNotification({ message: 'Persona dikirim dan menunggu approval admin.', type: 'success' })
  }

  const handleApprovePersona = async (submission: PersonaSubmission, reviewedPersona: PersonaData) => {
    if (!user || !isAdmin) return
    const personaId = submission.targetPersonaId || submission.persona.id
    await runTransaction(db, async transaction => {
      const personaRef = doc(db, 'personas', personaId)
      const secretRef = doc(db, 'personaSecrets', personaId)
      const submissionRef = doc(db, 'personaSubmissions', submission.id)
      const currentSubmissionSnapshot = await transaction.get(submissionRef)
      const existing = await transaction.get(personaRef)
      if (!currentSubmissionSnapshot.exists()) throw new Error('Submission tidak ditemukan.')
      const currentSubmission = { id: currentSubmissionSnapshot.id, ...currentSubmissionSnapshot.data() } as PersonaSubmission
      if (currentSubmission.status !== 'pending') throw new Error('Submission ini sudah direview.')
      const existingData = existing.exists() ? existing.data() as PersonaData : null
      if (!currentSubmission.targetPersonaId && existing.exists()) throw new Error('ID persona sudah digunakan.')
      if (currentSubmission.targetPersonaId && (!existingData || existingData.creatorUid !== currentSubmission.creatorUid)) {
        throw new Error('Target revisi persona tidak valid.')
      }
      const base = submissionToPersonaData(currentSubmission)
      transaction.set(personaRef, {
        ...toPersonaPublicData({ ...base, ...reviewedPersona, id: personaId }),
        id: personaId,
        status: 'approved',
        version: (existingData?.version || 0) + 1,
        sourceSubmissionId: currentSubmission.id,
        creatorUid: currentSubmission.creatorUid,
        creatorName: currentSubmission.creatorName,
        creatorEmail: currentSubmission.creatorEmail,
        creatorBranchId: currentSubmission.creatorBranchId,
        creatorBranchName: currentSubmission.creatorBranchName,
        createdBy: existingData?.createdBy || currentSubmission.creatorUid,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedBy: user.uid,
      })
      transaction.set(secretRef, {
        hiddenInstructions: reviewedPersona.hiddenInstructions,
        personaKnowledge: reviewedPersona.personaKnowledge,
        personaUnknowns: reviewedPersona.personaUnknowns,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
      transaction.update(submissionRef, {
        status: 'approved',
        targetPersonaId: personaId,
        reviewedAt: serverTimestamp(),
        reviewedByUid: user.uid,
        reviewedByName: profile?.displayName || user.email || 'Admin',
        updatedAt: serverTimestamp(),
      })
    })
    setNotification({ message: `${submission.persona.name} berhasil disetujui.`, type: 'success' })
  }

  const handleRejectPersona = async (submission: PersonaSubmission, reason: string) => {
    if (!user || !isAdmin) return
    await setDoc(doc(db, 'personaSubmissions', submission.id), {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: serverTimestamp(),
      reviewedByUid: user.uid,
      reviewedByName: profile?.displayName || user.email || 'Admin',
      updatedAt: serverTimestamp(),
    }, { merge: true })
    setNotification({ message: `${submission.persona.name} ditolak.`, type: 'success' })
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

  const adminPersonas = React.useMemo(() => personas.map(persona => ({
    ...persona,
    ...(personaSecrets[persona.id] || {}),
  })), [personaSecrets, personas])

  const adminScenarios = React.useMemo(() => allScenarios.map(scenario => ({
    ...scenario,
    hiddenRules: scenarioSecrets[scenario.id] || scenario.hiddenRules || '',
  })), [allScenarios, scenarioSecrets])

  const approvedPersonas = React.useMemo(
    () => personas.filter(persona => !persona.status || persona.status === 'approved'),
    [personas]
  )

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
          setSelectedPersonaSnapshot(null)
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
    setSelectedPersonaSnapshot(null)
    setIsStartModalOpen(true)
  }

  const handleSelectPersona = (persona: PersonaData) => {
    const responseStyle = ['To the point', 'Banyak Tanya', 'Ragu-ragu', 'Cerewet'].includes(persona.speechStyle)
      ? persona.speechStyle as SalesScenario['responseStyle']
      : 'Banyak Tanya'

    const scenarioFromPersona: SalesScenario = {
      id: `persona-roleplay-${persona.id}`,
      personaId: persona.id,
      title: `Roleplay dengan ${persona.name}`,
      description: persona.currentSituation || persona.backgroundStory || `Latihan menghadapi ${persona.name}.`,
      target: persona.goals || 'Gali kebutuhan, bangun kepercayaan, dan arahkan ke langkah berikutnya.',
      consumerProfile: [persona.backgroundStory, persona.currentSituation, persona.painPoints].filter(Boolean).join(' ') || 'Persona approved dari library cabang.',
      difficulty: 'Medium',
      icon: 'UserSquare2',
      name: persona.name,
      gender: persona.gender,
      aggressiveness: persona.aggressiveness,
      patience: persona.patience,
      responseStyle,
      firstSpeaker: 'AI',
      openingMessage: persona.commonPhrases || undefined,
      successCriteria: [
        'Bangun rapport dengan calon pembeli',
        'Gali kebutuhan dan ketakutan utama',
        'Tawarkan langkah berikutnya yang jelas',
      ],
      status: 'published',
    }

    setSelectedScenario(scenarioFromPersona)
    setSelectedPersonaSnapshot(persona)
    setIsStartModalOpen(true)
  }

  const handleStartSim = () => {
    setStep('briefing')
    setIsStartModalOpen(false)
  }

  const handleStartCall = () => {
    setSelectedPersonaSnapshot(selectedScenario?.personaId
      ? personas.find(persona => persona.id === selectedScenario.personaId) || null
      : null)
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
              Latihan Roleplay AI
            </div>
            <h1 className="text-4xl md:text-8xl font-bold font-heading leading-[0.9] uppercase">
              Status AI Consumer: <span className="text-warning">Online</span>
            </h1>
          </div>

          {/* Stats Bar */}
          {statsLoaded && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 sm:py-8 border-y-2 border-dark/15">
              {[
                { icon: <Users size={16}/>, label: "Total Sesi", value: globalStats.totalSessions.toLocaleString(), color: "bg-primary/10 text-primary" },
                { icon: <TrendingUp size={16}/>, label: "Top Sales", value: globalStats.topSalesperson, color: "bg-warning/10 text-warning" },
                { icon: <Target size={16}/>, label: "Skenario", value: globalStats.activeScenarios.toString(), color: "bg-success/10 text-success" },
                { icon: <BarChart3 size={16}/>, label: "Tingkat Menang", value: `${globalStats.winRate}%`, color: "bg-danger/10 text-danger" },
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

          {approvedPersonas.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-4 gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-success/10 text-success border-2 border-success/20 text-[10px] font-bold uppercase font-heading mb-3">
                    <UserSquare2 size={12} /> Bisa Diakses Semua User
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-bold font-heading uppercase">Persona Disetujui</h2>
                  <p className="text-sm font-semibold text-muted mt-2">Persona yang sudah lolos review admin dan bisa dilihat semua user.</p>
                </div>
                <button
                  onClick={() => setStep('personas')}
                  className="text-[10px] sm:text-[11px] font-bold text-primary hover:text-primary/80 uppercase font-heading flex items-center gap-2"
                >
                  BUKA PERSONA SAYA <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {approvedPersonas.map(persona => {
                  const branchLabel = persona.creatorBranchName || 'System / Admin'
                  const creatorLabel = persona.creatorName || persona.creatorEmail || 'Admin'
                  const summary = persona.backgroundStory || persona.currentSituation || persona.painPoints || 'Belum ada ringkasan persona.'

                  return (
                    <article key={persona.id} className="retro-panel bg-surface p-5 space-y-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-lg uppercase truncate">{persona.name}</h3>
                          <p className="text-xs font-semibold text-muted truncate">{persona.occupation || 'Calon pembeli'}</p>
                        </div>
                        <span className="shrink-0 px-2 py-1 border-2 border-success/30 bg-success/10 text-success text-[10px] font-bold uppercase font-heading">Approved</span>
                      </div>

                      <p className="text-sm font-medium text-muted line-clamp-3">{summary}</p>

                      <div className="space-y-2 pt-3 border-t-2 border-dark/10">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase font-heading">
                          <span className="text-muted">Milik Cabang</span>
                          <span className="text-primary truncate">{branchLabel}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-muted">
                          <span>Dibuat oleh</span>
                          <span className="truncate">{creatorLabel}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectPersona(persona)}
                        className="retro-btn retro-btn-primary w-full min-h-11 justify-center text-[11px]"
                      >
                        Pilih untuk Roleplay
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          )}

          {/* Scenario Grid */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-4 gap-4">
              <h2 className="text-3xl sm:text-5xl font-bold font-heading uppercase">Perpustakaan Skenario</h2>
              <div className="flex gap-2 sm:gap-4">
                {isAdmin && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] sm:text-[11px] retro-btn retro-btn-primary px-3 sm:px-5 py-2.5"
                  >
                    <Plus size={14} strokeWidth={3} /> BUAT MISI
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
            confirmLabel="Hapus"
            cancelLabel="Batal"
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
                  <h2 className="text-3xl font-bold font-heading uppercase mb-4 text-dark">MULAI Misi</h2>
                  <p className="font-medium mb-6 text-muted text-sm">Siap meMULAI Misi ini, {profile?.displayName || salespersonName}?</p>

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
            confirmLabel="Hapus"
            cancelLabel="Batal"
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
            persona={selectedPersonaSnapshot || undefined}
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
          <h2 className="text-4xl font-bold font-heading uppercase">Misi Selesai</h2>
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
            personaVersion={selectedPersonaSnapshot?.version}
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

      {step === 'personas' && membership && (
        <motion.div key="personas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <PersonaSubmissionsScreen
            membership={membership}
            submissions={personaSubmissions.filter(item => item.creatorUid === membership.userId)}
            approvedPersonas={personas.filter(item => !item.status || item.status === 'approved')}
            onSubmit={handleSubmitPersona}
          />
        </motion.div>
      )}

      {step === 'personas' && !membership && isAdmin && (
        <div className="retro-panel bg-surface p-8 text-center">
          <h2 className="text-2xl font-bold font-heading uppercase">Gunakan Panel Admin</h2>
          <p className="text-sm font-semibold text-muted mt-2">Admin dapat membuat dan mereview persona melalui tab Persona di Panel Admin.</p>
          <button onClick={() => { setAdminTab('personas'); setStep('admin') }} className="retro-btn retro-btn-primary mt-5">Buka Persona Admin</button>
        </div>
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

      {step === 'admin' && isAdmin && (
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
              scenarios={adminScenarios}
              personas={personas.filter(item => !item.status || item.status === 'approved')}
              onSave={handleAdminSaveScenario}
              onDelete={handleAdminDeleteScenario}
              loading={!statsLoaded}
            />
          )}

          {adminTab === 'personas' && (
            personaSecretsLoaded ? <PersonaAdminWorkspace
              personas={adminPersonas}
              submissions={personaSubmissions}
              onSave={handleAdminSavePersona}
              onArchive={handleAdminDeletePersona}
              onApprove={handleApprovePersona}
              onReject={handleRejectPersona}
            /> : <div className="p-10 text-center font-semibold text-muted">Memuat konfigurasi persona...</div>
          )}

          {adminTab === 'branches' && (
            <BranchManager
              branches={branches}
              memberships={memberships}
              onCreate={handleCreateBranch}
              onUpdate={handleUpdateBranch}
              onDelete={handleDeleteBranch}
              onChangeMembership={handleChangeMembership}
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
      {notification && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto z-[170] max-w-lg p-4 border-2 font-bold text-xs uppercase flex items-center justify-between shadow-[4px_4px_0_0_var(--color-dark)] ${
          notification.type === 'success' ? 'bg-surface text-success border-success' : 'bg-surface text-danger border-danger'
        }`} role="alert" aria-live="polite">
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 p-1 hover:opacity-70" aria-label="Tutup notifikasi">X</button>
        </div>
      )}
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

      {appReady && loginTransitionState === 'complete' && user && profile && membershipLoaded && !membership && !isAdmin && (
        <BranchSelectionModal
          branches={branches.filter(branch => branch.status === 'active').sort((a, b) => a.name.localeCompare(b.name))}
          onSelect={handleSelectBranch}
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
