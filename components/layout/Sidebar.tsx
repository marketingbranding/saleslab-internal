'use client'

import { LayoutDashboard, Target, Clock, BarChart3, Medal, User, Settings } from 'lucide-react'

interface SidebarProps {
  activeStep: string
  onNavigate: (step: string) => void
  isAdmin?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

const NAV_ITEMS = [
  { step: 'selection', label: 'Dashboard', icon: LayoutDashboard },
  { step: 'training', label: 'Latihan', icon: Target },
  { step: 'history', label: 'Riwayat', icon: Clock },
  { step: 'performance', label: 'Performa', icon: BarChart3 },
  { step: 'achievements', label: 'Pencapaian', icon: Medal },
]

const BOTTOM_ITEMS = [
  { step: 'profile', label: 'Profil', icon: User },
  { step: 'settings', label: 'Pengaturan', icon: Settings },
]

export function Sidebar({ activeStep, onNavigate, isAdmin, isMobileOpen, onMobileClose }: SidebarProps) {
  const handleNavigate = (step: string) => {
    onNavigate(step)
    onMobileClose?.()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-overlay"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <aside id="app-sidebar" aria-label="Navigasi utama" className={`flex flex-col w-60 min-h-screen bg-navy text-white fixed left-0 top-0 z-sidebar transition-transform duration-200 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Brand */}
      <div className="px-5 pt-8 pb-6 border-b border-white/10">
        <h2 className="text-xl font-bold text-white font-heading uppercase tracking-tight">SalesLab</h2>
        <p className="text-[11px] font-bold text-white/60 uppercase mt-1 tracking-wide">Latihan Internal</p>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 pt-4 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeStep === item.step
          return (
            <button
              key={item.step}
              onClick={() => handleNavigate(item.step)}
              className={`sidebar-link w-full text-left ${isActive ? 'sidebar-link-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </button>
          )
        })}

        {isAdmin && (
          <button
            onClick={() => handleNavigate('admin')}
            className={`sidebar-link w-full text-left ${activeStep === 'admin' ? 'sidebar-link-active' : ''}`}
            aria-current={activeStep === 'admin' ? 'page' : undefined}
          >
            <Settings size={18} strokeWidth={2} />
            Admin
          </button>
        )}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 pb-6 pt-4 border-t border-white/10 space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeStep === item.step
          return (
            <button
              key={item.step}
              onClick={() => handleNavigate(item.step)}
              className={`sidebar-link w-full text-left ${isActive ? 'sidebar-link-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </button>
          )
        })}
      </div>
    </aside>
    </>
  )
}
