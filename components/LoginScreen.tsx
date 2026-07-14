'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Target } from 'lucide-react'

export type LoginVisualState = 'resolving' | 'login' | 'authenticating' | 'entering'

interface LoginScreenProps {
  onLogin: () => void
  visualState: LoginVisualState
  restoredSession?: boolean
  onExitComplete?: () => void
}

const BOOT_LINES = [
  { text: 'SALES_LAB INTERNAL', delay: 0 },
  { text: 'SISTEM PELATIHAN ROLEPLAY AI', delay: 200 },
  { text: 'STATUS SISTEM: SIAP', delay: 400 },
  { text: 'MODUL PERSONA: AKTIF', delay: 650 },
  { text: 'KONEKSI PELATIHAN: TERSEDIA', delay: 850 },
]

const BOOT_STORAGE_KEY = 'saleslab_boot_seen'

export function LoginScreen({ onLogin, visualState, restoredSession = false, onExitComplete }: LoginScreenProps) {
  const [bootComplete, setBootComplete] = React.useState(false)
  const [visibleLines, setVisibleLines] = React.useState(0)
  const [compactViewport, setCompactViewport] = React.useState(false)
  const [entryAnimationActive, setEntryAnimationActive] = React.useState(false)
  const shouldReduceMotion = useReducedMotion()
  const entering = visualState === 'entering'

  const finishBoot = React.useCallback(() => {
    setVisibleLines(BOOT_LINES.length)
    setBootComplete(true)
    try {
      window.sessionStorage.setItem(BOOT_STORAGE_KEY, 'true')
    } catch {
      // Login remains available when browser storage is unavailable.
    }
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const updateViewport = () => setCompactViewport(media.matches)
    updateViewport()
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])

  React.useEffect(() => {
    if (!entering) {
      const resetFrame = requestAnimationFrame(() => setEntryAnimationActive(false))
      return () => cancelAnimationFrame(resetFrame)
    }

    const startFrame = requestAnimationFrame(() => setEntryAnimationActive(true))
    return () => cancelAnimationFrame(startFrame)
  }, [entering])

  React.useEffect(() => {
    if (visualState === 'resolving' || entering) return

    try {
      const bootSeen = window.sessionStorage.getItem(BOOT_STORAGE_KEY) === 'true'
      if (bootSeen || shouldReduceMotion) {
        const immediateTimer = setTimeout(finishBoot, 0)
        return () => clearTimeout(immediateTimer)
      }
    } catch {
      // Continue with the short boot sequence when storage cannot be read.
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    BOOT_LINES.forEach((line, index) => {
      timers.push(setTimeout(() => setVisibleLines(index + 1), line.delay))
    })
    timers.push(setTimeout(finishBoot, 1000))
    return () => timers.forEach(clearTimeout)
  }, [entering, finishBoot, shouldReduceMotion, visualState])

  const exitAnimation = shouldReduceMotion
    ? { opacity: 0, scale: 1 }
    : restoredSession
      ? { opacity: 0, scale: 1.08, x: 0 }
      : {
          opacity: [1, 1, 1, 0],
          scale: [1, 0.985, 1.025, compactViewport ? 1.55 : 2],
          x: [0, -1, 2, 0],
        }

  const transition = shouldReduceMotion
    ? { duration: 0.18, ease: 'easeOut' as const }
    : restoredSession
      ? { duration: 0.32, ease: 'easeOut' as const }
      : { duration: 0.82, times: [0, 0.16, 0.4, 1], ease: [0.22, 1, 0.36, 1] as const }

  const statusText = visualState === 'resolving'
    ? 'MEMERIKSA SESI...'
    : visualState === 'authenticating'
      ? 'MENGAUTENTIKASI...'
      : entering
        ? restoredSession ? 'SESI DIPULIHKAN' : 'AKSES DITERIMA'
        : 'STATUS SISTEM: SIAP'

  return (
    <motion.div
      className={`crt-login-overlay ${entryAnimationActive && !restoredSession ? 'crt-entering' : ''}`}
      data-visual-state={visualState}
      data-entry-active={entryAnimationActive ? 'true' : 'false'}
      initial={false}
      animate={entryAnimationActive ? exitAnimation : { opacity: 1, scale: 1, x: 0 }}
      transition={transition}
      onAnimationComplete={() => {
        if (entering && entryAnimationActive) onExitComplete?.()
      }}
    >
      <div className="crt-workstation">
        <div className="crt-frame">
          <div className="crt-frame-label" aria-hidden="true">SL-25 / TERMINAL PELATIHAN</div>
          <div className="crt-bezel">
            <section className="crt-screen" aria-label="Terminal masuk SalesLab">
              <div className="crt-scanlines" aria-hidden="true" />
              <div className="crt-vignette" aria-hidden="true" />
              <div className="crt-noise-line" aria-hidden="true" />
              <div className="crt-glitch-layer crt-glitch-layer-a" aria-hidden="true" />
              <div className="crt-glitch-layer crt-glitch-layer-b" aria-hidden="true" />

              <div className="crt-terminal-content">
                <header className="crt-terminal-header">
                  <div className="crt-terminal-mark" aria-hidden="true">
                    <Target size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1>SALES_LAB INTERNAL</h1>
                    <p>SISTEM PELATIHAN ROLEPLAY AI</p>
                  </div>
                </header>

                <div className="crt-terminal-lines" aria-live="polite">
                  {visualState === 'resolving' ? (
                    <>
                      <p><span>&gt;</span> SALES_LAB INTERNAL</p>
                      <p><span>&gt;</span> MEMERIKSA SESI PENGGUNA...</p>
                    </>
                  ) : (
                    BOOT_LINES.slice(0, bootComplete ? BOOT_LINES.length : visibleLines).map((line, index) => (
                      <motion.p key={line.text} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}>
                        <span>&gt;</span> {line.text}
                        {index > 1 && <b aria-hidden="true"> [OK]</b>}
                      </motion.p>
                    ))
                  )}
                </div>

                <div className="crt-status" role="status" aria-live="polite">
                  <span className={visualState === 'login' ? 'crt-status-ready' : 'crt-status-active'} />
                  {statusText}
                </div>

                {visualState !== 'resolving' && !entering && (
                  <div className="crt-actions">
                    <button
                      type="button"
                      onClick={onLogin}
                      disabled={visualState === 'authenticating' || !bootComplete}
                      className="crt-login-button"
                    >
                      {visualState === 'authenticating' ? (
                        <>
                          <span className="crt-loading-block" aria-hidden="true" />
                          MENGAUTENTIKASI...
                        </>
                      ) : (
                        <>
                          <svg aria-hidden="true" className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          MASUK DENGAN GOOGLE
                        </>
                      )}
                    </button>
                    {!bootComplete && visualState === 'login' && (
                      <button type="button" onClick={finishBoot} className="crt-skip-button">Lewati</button>
                    )}
                  </div>
                )}

                <footer>AKSES INTERNAL - HANYA PENGGUNA BERWENANG</footer>
              </div>
            </section>
          </div>
          <div className="crt-controls" aria-hidden="true">
            <span />
            <span />
            <div />
          </div>
        </div>
        <div className="crt-stand" aria-hidden="true" />
      </div>
    </motion.div>
  )
}
