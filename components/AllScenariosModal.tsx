'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Search } from 'lucide-react'
import { SalesScenario } from '@/lib/gemini'
import { ScenarioCard } from '@/components/ScenarioCard'

interface AllScenariosModalProps {
  isOpen: boolean
  onClose: () => void
  scenarios: SalesScenario[]
  onSelect: (scenario: SalesScenario) => void
  onEdit?: (scenario: SalesScenario, e: React.MouseEvent) => void
  onDelete?: (scenarioId: string, e: React.MouseEvent) => void
  isAdmin?: boolean
}

export function AllScenariosModal({ isOpen, onClose, scenarios, onSelect, onEdit, onDelete, isAdmin }: AllScenariosModalProps) {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredScenarios = React.useMemo(() => {
    return scenarios.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [scenarios, searchTerm])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-surface retro-dialog flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 border-b-[3px] border-dark/10 bg-surface retro-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-none">Semua Skenario</h2>
                <p className="text-sm font-semibold text-muted">Temukan tantangan baru untuk latihan Anda</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari skenario..."
                    className="w-full pl-10 pr-4 py-2.5 retro-input bg-surface"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-dark/5 transition-colors"
                >
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-surface">
              {filteredScenarios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredScenarios.map((scenario) => (
                    <ScenarioCard
                      key={scenario.id}
                      scenario={scenario}
                      onSelect={(s) => {
                        onSelect(s)
                        onClose()
                      }}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                  <div className="text-6xl text-dark/10">:(</div>
                  <p className="font-bold text-lg text-muted">Tidak ada skenario ditemukan</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-bg text-muted text-[10px] font-bold uppercase flex justify-center sticky bottom-0 z-10">
              Total {filteredScenarios.length} Skenario Tersedia
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
