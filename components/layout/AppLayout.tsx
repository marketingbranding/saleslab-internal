'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface AppLayoutProps {
  children: ReactNode
  activeStep: string
  onNavigate: (step: string) => void
  isAdmin?: boolean
  userName?: string
  level?: number
  xp?: number
  xpNext?: number
  streak?: number
  onLogout: () => void
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline'
  /** Set to true for full-screen views (e.g. call interface, transition) */
  fullscreen?: boolean
}

export function AppLayout({
  children,
  activeStep,
  onNavigate,
  isAdmin,
  userName,
  level,
  xp,
  xpNext,
  streak,
  onLogout,
  syncStatus,
  fullscreen = false,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleNavigate = (step: string) => {
    onNavigate(step)
    setSidebarOpen(false)
  }

  if (fullscreen) {
    return (
      <div className="min-h-screen bg-bg">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main-content" className="skip-link" aria-label="Skip to main content">
        Langsung ke Konten
      </a>
      <Sidebar activeStep={activeStep} onNavigate={handleNavigate} isAdmin={isAdmin} isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-60 flex flex-col min-h-screen">
        <Header
          userName={userName}
          level={level}
          xp={xp}
          xpNext={xpNext}
          streak={streak}
          onLogout={onLogout}
          syncStatus={syncStatus}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          sidebarOpen={sidebarOpen}
        />

        <main id="main-content" className="flex-1 px-6 lg:px-10 py-8 pb-24 lg:pb-8" tabIndex={-1}>
          {children}
        </main>
      </div>

      <MobileNav activeStep={activeStep} onNavigate={onNavigate} isAdmin={isAdmin} />
    </div>
  )
}
