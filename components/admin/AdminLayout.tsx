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
  { key: 'scenarios', label: 'Scenarios', icon: <ListChecks size={16} /> },
  { key: 'personas', label: 'Personas', icon: <UserSquare2 size={16} /> },
  { key: 'settings', label: 'AI Settings', icon: <Settings size={16} /> },
]

export function AdminLayout({ activeTab, onTabChange, onBack, children }: AdminLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-dark/15 pb-4 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-[10px] font-bold uppercase text-muted hover:text-dark mb-2 flex items-center gap-1 font-heading"
          >
            <ChevronRight size={12} className="rotate-180" /> Kembali ke App
          </button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 text-primary border-2 border-primary/20">
              <LayoutDashboard size={16} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase">Admin Panel</h2>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-dark/15 gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 font-bold text-[10px] uppercase font-heading border-b-2 -mb-[2px] transition-none ${
              activeTab === tab.key
                ? 'border-primary bg-primary/10 text-dark'
                : 'border-transparent text-muted hover:text-dark hover:border-dark/30'
            }`}
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
