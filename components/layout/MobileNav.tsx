'use client'

import { LayoutDashboard, Target, Clock, BarChart3, Medal, User, Settings } from 'lucide-react'

interface MobileNavProps {
  activeStep: string
  onNavigate: (step: string) => void
  isAdmin?: boolean
}

const MOBILE_ITEMS = [
  { step: 'selection', label: 'Missions', icon: LayoutDashboard },
  { step: 'training', label: 'Training', icon: Target },
  { step: 'history', label: 'History', icon: Clock },
  { step: 'performance', label: 'Stats', icon: BarChart3 },
  { step: 'achievements', label: 'Medals', icon: Medal },
  { step: 'profile', label: 'Profile', icon: User },
  { step: 'settings', label: 'Settings', icon: Settings },
]

export function MobileNav({ activeStep, onNavigate, isAdmin }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t-2 border-dark/15 safe-bottom">
      <div className="flex items-center justify-around py-2 px-1">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeStep === item.step
          return (
            <button
              key={item.step}
              onClick={() => onNavigate(item.step)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-colors ${
                isActive ? 'text-primary' : 'text-muted/60 hover:text-dark'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="text-[8px] font-bold uppercase font-heading">{item.label}</span>
            </button>
          )
        })}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className={`flex flex-col items-center gap-0.5 p-2 ${
              activeStep === 'admin' ? 'text-primary' : 'text-muted/60 hover:text-dark'
            }`}
          >
            <Settings size={18} strokeWidth={2} />
            <span className="text-[8px] font-bold uppercase font-heading">Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}
