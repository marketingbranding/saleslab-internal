'use client'

import * as React from 'react'
import { Building2, Plus } from 'lucide-react'
import type { Branch, UserMembership } from '@/lib/personas'

interface BranchManagerProps {
  branches: Branch[]
  memberships: UserMembership[]
  onCreate: (name: string) => Promise<void>
  onChangeMembership: (membership: UserMembership, branch: Branch) => Promise<void>
}

export function BranchManager({ branches, memberships, onCreate, onChangeMembership }: BranchManagerProps) {
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const activeBranches = branches.filter(branch => branch.status === 'active')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const branchName = name.trim()
    if (!branchName || saving) return
    if (branches.some(branch => branch.normalizedName === branchName.toLowerCase())) {
      setError('Nama cabang sudah terdaftar.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onCreate(branchName)
      setName('')
    } catch (err) {
      console.error('Branch creation failed:', err)
      const message = err instanceof Error ? err.message : 'Cabang gagal ditambahkan.'
      setError(message.includes('permission') ? 'Akses ditolak Firestore. Pastikan Firestore Rules terbaru sudah diterapkan.' : message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="retro-panel bg-surface p-5 sm:p-6 space-y-5">
        <div><h3 className="font-heading text-xl font-bold uppercase flex items-center gap-2"><Building2 size={20} /> Master Cabang</h3><p className="text-sm font-semibold text-muted mt-1">Cabang aktif tersedia saat user memilih asalnya.</p></div>
        {error && <div role="alert" className="p-3 border-2 border-danger/30 bg-danger/10 text-danger text-xs font-bold">{error}</div>}
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={event => { setName(event.target.value); setError(null) }} className="retro-input bg-surface flex-1" placeholder="Nama cabang baru" maxLength={100} disabled={saving} />
          <button type="submit" className="retro-btn retro-btn-primary min-h-11 justify-center disabled:opacity-50" disabled={!name.trim() || saving}><Plus size={14} /> {saving ? 'Menambahkan...' : 'Tambah Cabang'}</button>
        </form>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {branches.map(branch => (
            <div key={branch.id} className="border-2 border-dark/15 p-4 flex items-center justify-between gap-3">
              <div><p className="font-bold">{branch.name}</p><span className="text-[10px] font-bold uppercase text-muted">{branch.status}</span></div>
            </div>
          ))}
          {branches.length === 0 && <p className="sm:col-span-2 lg:col-span-3 border-2 border-dashed border-dark/15 p-6 text-center text-muted font-semibold">Belum ada cabang.</p>}
        </div>
      </section>

      <section className="space-y-4">
        <div><h3 className="font-heading text-xl font-bold uppercase">Penempatan User</h3><p className="text-sm font-semibold text-muted">Hanya admin yang dapat mengubah cabang setelah pilihan pertama.</p></div>
        <div className="space-y-3">
          {memberships.map(membership => (
            <div key={membership.userId} className="retro-panel bg-surface p-4 grid md:grid-cols-[1fr_260px] gap-3 items-center">
              <div className="min-w-0"><p className="font-bold truncate">{membership.displayName}</p><p className="text-xs font-semibold text-muted truncate">{membership.email} · {membership.branchName}</p></div>
              <select value={membership.branchId} onChange={event => {
                const branch = activeBranches.find(item => item.id === event.target.value)
                if (branch) void onChangeMembership(membership, branch)
              }} className="retro-input bg-surface min-h-11">
                {activeBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
          ))}
          {memberships.length === 0 && <p className="border-2 border-dashed border-dark/15 p-6 text-center text-muted font-semibold">Belum ada user yang memilih cabang.</p>}
        </div>
      </section>
    </div>
  )
}
