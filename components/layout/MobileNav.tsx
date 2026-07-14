'use client'

import { LayoutDashboard, Target, Clock, BarChart3, Medal, User, Settings } from 'lucide-react'

interface MobileNavProps {
  activeStep: string
  onNavigate: (step: string) => void
  isAdmin?: boolean
}

const MOBILE_ITEMS = [
  { step: 'selection', label: 'Utama', icon: LayoutDashboard },
  { step: 'training', label: 'Latihan', icon: Target },
  { step: 'history', label: 'Riwayat', icon: Clock },
  { step: 'performance', label: 'Performa', icon: BarChart3 },
  { step: 'achievements', label: 'Prestasi', icon: Medal },
  { step: 'profile', label: 'Profil', icon: User },
  { step: 'settings', label: 'Atur', icon: Settings },
]

export function MobileNav({ activeStep, onNavigate, isAdmin }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t-2 border-dark/15 safe-bottom" aria-label="Navigasi seluler">
      <div className="grid grid-cols-4 py-1 px-1">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeStep === item.step
          return (
            <button
              key={item.step}
              onClick={() => onNavigate(item.step)}
              className={`flex min-h-11 w-full flex-col items-center justify-center gap-0.5 p-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted/60 hover:text-dark'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase font-heading">{item.label}</span>
            </button>
          )
        })}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex min-h-11 w-full flex-col items-center justify-center gap-0.5 p-1 ${
              activeStep === 'admin' ? 'text-primary' : 'text-muted/60 hover:text-dark'
            }`}
            aria-current={activeStep === 'admin' ? 'page' : undefined}
          >
            <Settings size={18} strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase font-heading">Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}
