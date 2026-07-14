'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Target, Zap } from "lucide-react"

interface LoginScreenProps {
  onLogin: () => void
  isLoading: boolean
}

const BOOT_LINES = [
  { text: "SALES_LAB INTERNAL v2.5", delay: 0 },
  { text: "INITIALIZING TRAINING MODULES...", delay: 250 },
  { text: "LOADING AI PERSONAS... OK", delay: 500 },
  { text: "CONNECTING TO TRAINING HUB... OK", delay: 750 },
  { text: "SYSTEM READY", delay: 1000 },
]

const BOOT_STORAGE_KEY = 'saleslab_boot_seen'

export function LoginScreen({ onLogin, isLoading }: LoginScreenProps) {
  const [bootComplete, setBootComplete] = React.useState(false)
  const [visibleLines, setVisibleLines] = React.useState<number>(0)

  const finishBoot = React.useCallback(() => {
    setVisibleLines(BOOT_LINES.length)
    setBootComplete(true)
    try {
      window.sessionStorage.setItem(BOOT_STORAGE_KEY, 'true')
    } catch {
      // The login remains usable when browser storage is unavailable.
    }
  }, [])

  React.useEffect(() => {
    try {
      const bootSeen = window.sessionStorage.getItem(BOOT_STORAGE_KEY) === 'true'
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (bootSeen || prefersReducedMotion) {
        const immediateTimer = setTimeout(finishBoot, 0)
        return () => clearTimeout(immediateTimer)
      }
    } catch {
      // Continue with the short boot sequence when storage cannot be read.
    }

    const timers: NodeJS.Timeout[] = []
    BOOT_LINES.forEach((line, i) => {
      const timer = setTimeout(() => setVisibleLines(i + 1), line.delay)
      timers.push(timer)
    })
    const bootTimer = setTimeout(finishBoot, 1200)
    timers.push(bootTimer)
    return () => timers.forEach(clearTimeout)
  }, [finishBoot])

  return (
    <div className="fixed inset-0 z-[200] bg-bg flex items-center justify-center overflow-hidden">

      <div className="relative z-20 w-full max-w-lg px-6">
        {/* Boot sequence */}
        <div className="bg-surface retro-panel p-8 mb-6">
          <div className="space-y-2 font-mono">
            {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-bold uppercase font-mono"
              >
                <span className="text-primary">&gt;</span>{" "}
                <span className={i === BOOT_LINES.length - 1 ? 'text-success' : 'text-muted'}>
                  {line.text}
                </span>
              </motion.div>
            ))}
            {!bootComplete && (
              <div className="flex items-center justify-between gap-4 pt-2">
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-3 bg-primary"
                />
                <button
                  type="button"
                  onClick={finishBoot}
                  className="text-xs font-bold uppercase text-muted underline decoration-2 underline-offset-4 hover:text-dark"
                >
                  Lewati
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Login card */}
        <AnimatePresence>
          {bootComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface retro-panel p-8 text-center space-y-8"
            >
              {/* Logo */}
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-primary text-dark flex items-center justify-center">
                    <Target size={32} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold font-heading uppercase tracking-tight">SalesLab</h1>
                  <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-warning/10 text-warning text-xs font-bold uppercase font-heading">
                    <Zap size={12} /> Latihan Internal
                  </div>
                </div>
              </div>

              <p className="text-sm font-bold uppercase text-muted">
                Simulator Latihan Roleplay AI
              </p>

              {/* Login button */}
              <button
                onClick={onLogin}
                disabled={isLoading}
                className="w-full retro-btn retro-btn-accent py-4 font-bold uppercase text-sm flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-dark border-t-transparent"
                    />
                    MENGHUBUNGKAN...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    MASUK DENGAN GOOGLE
                  </>
                )}
              </button>

              <p className="text-xs font-bold uppercase text-muted/70">
                Aplikasi Internal - Hanya untuk Pengguna Berwenang
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
