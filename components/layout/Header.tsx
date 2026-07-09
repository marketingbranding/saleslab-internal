'use client'

import { LogOut, User, Menu, X } from 'lucide-react'
import { SyncIndicator } from '@/components/SyncIndicator'

interface HeaderProps {
  userName?: string
  level?: number
  xp?: number
  xpNext?: number
  streak?: number
  onLogout: () => void
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline'
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function Header({ userName, level = 1, xp = 0, xpNext = 100, streak = 0, onLogout, syncStatus = 'synced', onToggleSidebar, sidebarOpen }: HeaderProps) {
  const xpPercent = Math.min(Math.round((xp / xpNext) * 100), 100)

  return (
    <header className="h-16 bg-surface border-b-2 border-dark/15 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-header">
      {/* Left: brand (mobile only) + hamburger */}
      <div className="lg:hidden flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-muted hover:text-dark"
          aria-label={sidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h1 className="text-lg font-bold font-heading uppercase tracking-tight">SalesLab</h1>
        <span className="text-[8px] font-bold bg-warning text-dark px-1.5 py-0.5 uppercase">Internal</span>
      </div>

      {/* Right: user info */}
      <div className="flex items-center gap-4 ml-auto">
        <SyncIndicator status={syncStatus} />

        {/* Streak */}
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 border border-warning/30">
            <span className="text-sm font-bold font-mono numeric text-warning">{streak}</span>
            <span className="text-[9px] font-bold uppercase text-muted">hari streak</span>
          </div>
        )}

        {/* XP */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-dark/5 border border-dark/15">
          <div className="w-20 h-2 bg-dark/10 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-all"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold font-mono numeric text-muted">{xp}/{xpNext} XP</span>
        </div>

        {/* Level */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white">
          <span className="text-[10px] font-bold uppercase font-heading">Lv.{level}</span>
        </div>

        {/* User */}
        <div className="hidden sm:flex items-center gap-2 text-sm font-semibold text-dark">
          <User size={16} strokeWidth={2} />
          <span className="max-w-[120px] truncate">{userName || 'Agent'}</span>
        </div>

        {/* Keluar */}
        <button
          onClick={onLogout}
          className="p-2 border border-dark/15 hover:bg-dark/5 text-muted hover:text-dark transition-colors"
          title="Keluar"
          aria-label="Keluar"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
