'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { ChevronRight, LayoutDashboard, ListChecks, UserSquare2, Settings } from 'lucide-react'

export type AdminTab = 'dashboard' | 'scenarios' | 'personas' | 'settings'

interface AdminLayoutProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onBack: () => void
  children: React.ReactNode
}

const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { key: 'scenarios', label: 'Skenario', icon: <ListChecks size={16} /> },
  { key: 'personas', label: 'Persona', icon: <UserSquare2 size={16} /> },
  { key: 'settings', label: 'Pengaturan AI', icon: <Settings size={16} /> },
]

export function AdminLayout({ activeTab, onTabChange, onBack, children }: AdminLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6 min-w-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-3 sm:pb-4 gap-3 sm:gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase text-muted hover:text-dark mb-2 flex items-center gap-1 font-heading"
          >
            <ChevronRight size={12} className="rotate-180" /> Kembali ke Aplikasi
          </button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 text-primary border-2 border-primary/20">
              <LayoutDashboard size={16} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase">Panel Admin</h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:flex border-b-2 border-dark/15 gap-0" role="navigation" aria-label="Navigasi panel admin">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`min-h-11 w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-3 font-bold text-[11px] uppercase font-heading border-b-2 sm:-mb-[2px] transition-none leading-tight ${
              activeTab === tab.key
                ? 'border-primary bg-primary/10 text-dark'
                : 'border-transparent text-muted hover:text-dark hover:border-dark/30'
            }`}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {children}
      </div>
    </motion.div>
  )
}
