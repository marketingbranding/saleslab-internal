'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { Building2 } from 'lucide-react'
import type { Branch } from '@/lib/personas'

interface BranchSelectionModalProps {
  branches: Branch[]
  loading?: boolean
  onSelect: (branch: Branch) => Promise<void>
}

export function BranchSelectionModal({ branches, loading, onSelect }: BranchSelectionModalProps) {
  const [branchId, setBranchId] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const branch = branches.find(item => item.id === branchId)
    if (!branch) return
    setSaving(true)
    setError(null)
    try {
      await onSelect(branch)
    } catch (err) {
      console.error('Branch selection failed:', err)
      setError('Cabang gagal disimpan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark/90" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg retro-panel bg-surface p-6 sm:p-8">
        <div className="w-12 h-12 bg-primary text-dark border-2 border-dark flex items-center justify-center mb-5">
          <Building2 size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-heading uppercase">Pilih Cabang</h2>
        <p className="mt-2 text-sm font-semibold text-muted">Pilihan ini menjadi label pada persona yang Anda ajukan. Setelah disimpan, hanya admin yang dapat mengubahnya.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && <div role="alert" className="p-3 border-2 border-danger/30 bg-danger/10 text-danger text-xs font-bold uppercase">{error}</div>}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted font-heading">Cabang Asal</label>
            <select value={branchId} onChange={event => setBranchId(event.target.value)} className="retro-input bg-surface p-4" disabled={saving || loading} required>
              <option value="">Pilih cabang...</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
          {!loading && branches.length === 0 && (
            <p className="p-3 border-2 border-warning/30 bg-warning/10 text-warning text-xs font-bold">Belum ada cabang aktif. Hubungi admin pusat.</p>
          )}
          <button type="submit" disabled={!branchId || saving} className="retro-btn retro-btn-primary w-full justify-center disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Tetapkan Cabang'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
