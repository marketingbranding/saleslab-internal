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
  onEdit: (scenario: SalesScenario, e: React.MouseEvent) => void
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
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white border-8 border-black shadow-[20px_20px_0px_0px_rgba(255,255,255,0.2)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 border-b-4 border-black bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter leading-none">Semua Skenario</h2>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Temukan tantangan baru untuk latihan Anda</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="CARI SKENARIO..."
                    className="w-full pl-10 pr-4 py-2 border-4 border-black font-black uppercase text-xs focus:bg-yellow-50 outline-none"
                  />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 border-4 border-black hover:bg-black hover:text-white transition-all group"
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50">
              {filteredScenarios.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
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
                  <div className="text-6xl text-gray-200">:(</div>
                  <p className="font-black uppercase tracking-tighter text-xl italic text-gray-400">Tidak ada skenario ditemukan</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-black text-white text-[10px] font-black tracking-widest uppercase italic flex justify-center sticky bottom-0 z-10">
              Total {filteredScenarios.length} Skenario Tersedia
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
