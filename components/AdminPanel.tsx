'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Users, Settings, Database, ChevronRight, X, Shield } from 'lucide-react'
import { db, getSettings } from '@/lib/firebase'
import { useAuth } from '@/lib/AuthContext'
import { collection, query, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
  currentSettings: any
}

type TabKey = 'users' | 'scenarios' | 'settings'

interface UserEntry {
  uid: string
  email: string
  displayName: string
  role: string
}

interface ScenarioEntry {
  id: string
  title?: string
  difficulty?: string
  [key: string]: any
}

export function AdminPanel({ isOpen, onClose, currentSettings }: AdminPanelProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = React.useState<TabKey>('users')
  const [usersList, setUsersList] = React.useState<UserEntry[]>([])
  const [scenariosList, setScenariosList] = React.useState<ScenarioEntry[]>([])
  const [settings, setSettings] = React.useState<any>(currentSettings || null)
  const [loadingUsers, setLoadingUsers] = React.useState(true)
  const [loadingScenarios, setLoadingScenarios] = React.useState(true)

  // Fetch all users from Firestore
  React.useEffect(() => {
    if (!isOpen) return

    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const q = query(collection(db, 'users'))
        const snapshot = await getDocs(q)
        const users: UserEntry[] = snapshot.docs.map((d) => ({
          uid: d.id,
          email: d.data().email || '',
          displayName: d.data().displayName || 'Unknown',
          role: d.data().role || 'user',
        }))
        setUsersList(users)
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [isOpen])

  // Subscribe to scenarios collection
  React.useEffect(() => {
    if (!isOpen) return

    setLoadingScenarios(true)
    const q = query(collection(db, 'scenarios'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const scenarios: ScenarioEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        setScenariosList(scenarios)
        setLoadingScenarios(false)
      },
      (err) => {
        console.error('Failed to fetch scenarios:', err)
        setLoadingScenarios(false)
      }
    )

    return () => unsubscribe()
  }, [isOpen])

  // Subscribe to settings/global doc
  React.useEffect(() => {
    if (!isOpen) return

    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data())
      }
    })

    return () => unsub()
  }, [isOpen])

  // Update user role
  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole })
      setUsersList((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      )
    } catch (err) {
      console.error('Failed to update user role:', err)
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'users', label: 'Pengguna', icon: <Users size={16} strokeWidth={2.5} /> },
    { key: 'scenarios', label: 'Skenario', icon: <Database size={16} strokeWidth={2.5} /> },
    { key: 'settings', label: 'Pengaturan', icon: <Settings size={16} strokeWidth={2.5} /> },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-surface retro-dialog overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary text-black p-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black/10">
                  <Shield size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wider">
                  Admin Panel
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/10 transition-colors"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b-[3px] border-dark/10 bg-bg">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-[3px] ${
                    activeTab === tab.key
                      ? 'bg-primary text-black border-primary'
                      : 'bg-transparent text-muted border-transparent hover:bg-surface hover:text-dark'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence mode="wait">
                {/* ─── Users Tab ─── */}
                {activeTab === 'users' && (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <Users size={16} strokeWidth={2.5} />
                        User Management
                      </h3>
                      <span className="text-[10px] font-bold bg-surface px-3 py-1.5 text-muted">
                        {usersList.length} {usersList.length === 1 ? 'user' : 'users'}
                      </span>
                    </div>

                    {loadingUsers ? (
                      <div className="bg-surface retro-panel p-12 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted animate-pulse">
                          Loading users...
                        </p>
                      </div>
                    ) : usersList.length === 0 ? (
                      <div className="bg-surface retro-panel p-12 text-center">
                        <Users size={32} className="mx-auto mb-3 text-dark/20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          No users found in Firestore.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-muted border-b-[2px] border-dark/10">
                          <div className="col-span-3">Nama</div>
                          <div className="col-span-4">Email</div>
                          <div className="col-span-2">Peran</div>
                          <div className="col-span-3 text-right">Aksi</div>
                        </div>

                        {/* User Rows */}
                        {usersList.map((u) => (
                          <div
                            key={u.uid}
                            className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-surface hover:bg-surface/80 transition-colors border-[2px] border-dark/5"
                          >
                            <div className="col-span-3">
                              <span className="text-sm font-bold truncate block">
                                {u.displayName || 'Unknown'}
                              </span>
                            </div>
                            <div className="col-span-4">
                              <span className="text-[10px] text-muted font-medium truncate block">
                                {u.email}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span
                                className={`inline-block px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                                  u.role === 'admin'
                                    ? 'bg-success/10 text-success border-[2px] border-success/20'
                                    : 'bg-surface text-muted border-[2px] border-dark/10'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2">
                              {u.uid !== user?.uid && (
                                <button
                                  onClick={() =>
                                    handleRoleChange(
                                      u.uid,
                                      u.role === 'admin' ? 'user' : 'admin'
                                    )
                                  }
                                  className={`retro-btn text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 flex items-center gap-1 transition-all ${
                                    u.role === 'admin'
                                      ? 'bg-danger/10 text-danger hover:bg-danger/20 border-[2px] border-danger/20'
                                      : 'bg-success/10 text-success hover:bg-success/20 border-[2px] border-success/20'
                                  }`}
                                >
                                  <ChevronRight size={10} strokeWidth={3} />
                                  {u.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                              )}
                              {u.uid === user?.uid && (
                                <span className="text-[9px] font-bold text-muted italic">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── Scenarios Tab ─── */}
                {activeTab === 'scenarios' && (
                  <motion.div
                    key="scenarios"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <Database size={16} strokeWidth={2.5} />
                        Scenario Database
                      </h3>
                      <span className="text-[10px] font-bold bg-surface px-3 py-1.5 text-muted">
                        {scenariosList.length}{' '}
                        {scenariosList.length === 1 ? 'scenario' : 'scenarios'}
                      </span>
                    </div>

                    {loadingScenarios ? (
                      <div className="bg-surface retro-panel p-12 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted animate-pulse">
                          Loading scenarios...
                        </p>
                      </div>
                    ) : scenariosList.length === 0 ? (
                      <div className="bg-surface retro-panel p-12 text-center">
                        <Database size={32} className="mx-auto mb-3 text-dark/20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          No scenarios in Firestore.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scenariosList.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors border-[2px] border-dark/5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ChevronRight
                                size={14}
                                strokeWidth={3}
                                className="text-primary shrink-0"
                              />
                              <span className="text-sm font-bold truncate">
                                {s.title || s.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {s.difficulty && (
                                <span
                                  className={`inline-block px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border-[2px] ${
                                    s.difficulty === 'hard'
                                      ? 'bg-danger/10 text-danger border-danger/20'
                                      : s.difficulty === 'medium'
                                        ? 'bg-warning/10 text-warning border-warning/20'
                                        : 'bg-success/10 text-success border-success/20'
                                  }`}
                                >
                                  {s.difficulty}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-muted bg-surface px-2 py-1">
                                {s.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── Settings Tab ─── */}
                {activeTab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                        <Settings size={16} strokeWidth={2.5} />
                        Current Settings
                      </h3>
                      <span className="text-[9px] font-bold bg-surface px-3 py-1.5 text-muted uppercase tracking-wider">
                        Read-Only
                      </span>
                    </div>

                    {!settings ? (
                      <div className="bg-surface retro-panel p-12 text-center">
                        <Settings size={32} className="mx-auto mb-3 text-dark/20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          No settings loaded yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Model Provider */}
                        <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            Model Provider
                          </span>
                          <span className="text-sm font-bold text-primary uppercase">
                            {settings.modelProvider || 'gemini'}
                          </span>
                        </div>

                        {/* Thinking Delay */}
                        <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            Thinking Delay
                          </span>
                          <span className="text-sm font-bold text-dark tabular-nums">
                            {settings.thinkingDelay
                              ? `${(settings.thinkingDelay / 1000).toFixed(1)}s`
                              : '1.5s'}
                          </span>
                        </div>

                        {/* Frustration Sensitivity */}
                        <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                            Frustration Sensitivity
                          </span>
                          <span className="text-sm font-bold text-dark tabular-nums">
                            {settings.frustrationSensitivity || 5}/10
                          </span>
                        </div>

                        {/* Ollama URL (if applicable) */}
                        {settings.modelProvider === 'ollama' && settings.ollamaUrl && (
                          <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                              Ollama URL
                            </span>
                            <span className="text-xs font-bold text-dark truncate max-w-[50%] text-right">
                              {settings.ollamaUrl}
                            </span>
                          </div>
                        )}

                        {/* Ollama Model (if applicable) */}
                        {settings.modelProvider === 'ollama' && settings.ollamaModel && (
                          <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                              Ollama Model
                            </span>
                            <span className="text-xs font-bold text-dark truncate max-w-[50%] text-right">
                              {settings.ollamaModel}
                            </span>
                          </div>
                        )}

                        {/* OpenRouter Model (if applicable) */}
                        {settings.modelProvider === 'openrouter' && settings.openRouterModel && (
                          <div className="flex items-center justify-between px-4 py-3 bg-surface border-[2px] border-dark/5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                              OpenRouter Model
                            </span>
                            <span className="text-xs font-bold text-dark truncate max-w-[50%] text-right">
                              {settings.openRouterModel}
                            </span>
                          </div>
                        )}

                        {/* Info note */}
                        <div className="bg-primary/5 border-[2px] border-primary/20 p-3 mt-4">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-primary">
                            Note: Settings editing is available in the Admin Settings modal.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-bg p-4 text-[10px] font-bold uppercase text-muted text-center">
              Admin Panel v1.0
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
