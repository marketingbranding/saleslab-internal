'use client'

import * as React from 'react'
import { Building2, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { UserMembership } from '@/lib/personas'
import type { BranchRecord } from '@/lib/data'

interface BranchManagerProps {
  branches: BranchRecord[]
  memberships: UserMembership[]
  onCreate: (name: string) => Promise<void>
  onUpdate: (branch: BranchRecord, name: string) => Promise<void>
  onDelete: (branch: BranchRecord) => Promise<void>
  onChangeMembership: (membership: UserMembership, branch: BranchRecord) => Promise<void>
}

export function BranchManager({ branches, memberships, onCreate, onUpdate, onDelete, onChangeMembership }: BranchManagerProps) {
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState('')
  const [actionId, setActionId] = React.useState<string | null>(null)
  const activeBranches = branches.filter(branch => branch.status === 'active')

  const validateName = (branchName: string, currentId?: string) => {
    if (!/^(KC|KCP)\s+\S+/i.test(branchName)) return 'Nama cabang harus diawali KC atau KCP, misalnya KC Jepara.'
    if (branches.some(branch => branch.id !== currentId && branch.normalizedName === branchName.toLowerCase())) return 'Nama cabang sudah terdaftar.'
    return null
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const branchName = name.trim()
    if (!branchName || saving) return
    const validationError = validateName(branchName)
    if (validationError) {
      setError(validationError)
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

  const saveEdit = async (branch: BranchRecord) => {
    const branchName = editingName.trim()
    const validationError = validateName(branchName, branch.id)
    if (validationError) {
      setError(validationError)
      return
    }
    setActionId(branch.id)
    setError(null)
    try {
      await onUpdate(branch, branchName)
      setEditingId(null)
      setEditingName('')
    } catch (err) {
      console.error('Branch update failed:', err)
      setError(err instanceof Error ? err.message : 'Cabang gagal diperbarui.')
    } finally {
      setActionId(null)
    }
  }

  const removeBranch = async (branch: BranchRecord) => {
    const memberCount = memberships.filter(item => item.branchId === branch.id).length
    if (memberCount > 0) {
      setError(`${branch.name} masih digunakan oleh ${memberCount} user. Pindahkan user sebelum menghapus cabang.`)
      return
    }
    if (!window.confirm(`Hapus ${branch.name}? Tindakan ini tidak dapat dibatalkan.`)) return
    setActionId(branch.id)
    setError(null)
    try {
      await onDelete(branch)
    } catch (err) {
      console.error('Branch deletion failed:', err)
      setError(err instanceof Error ? err.message : 'Cabang gagal dihapus.')
    } finally {
      setActionId(null)
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
            <div key={branch.id} className="border-2 border-dark/15 p-4 space-y-3 min-w-0">
              {editingId === branch.id ? (
                <input value={editingName} onChange={event => { setEditingName(event.target.value); setError(null) }} className="retro-input bg-surface w-full" maxLength={100} autoFocus disabled={actionId === branch.id} />
              ) : (
                <div>
                  <div className="flex items-center gap-2 min-w-0"><p className="font-bold truncate">{branch.name}</p><span className="shrink-0 px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary text-[9px] font-bold">{branch.type || (branch.name.startsWith('KCP ') ? 'KCP' : 'KC')}</span></div>
                  <span className="text-[10px] font-bold uppercase text-muted">{memberships.filter(item => item.branchId === branch.id).length} user</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {editingId === branch.id ? (
                  <>
                    <button type="button" onClick={() => void saveEdit(branch)} disabled={actionId === branch.id || !editingName.trim()} className="min-h-11 bg-success/10 text-success hover:bg-success hover:text-surface flex items-center justify-center gap-1 disabled:opacity-50" aria-label={`Simpan ${branch.name}`}><Check size={15} /> Simpan</button>
                    <button type="button" onClick={() => { setEditingId(null); setEditingName('') }} disabled={actionId === branch.id} className="min-h-11 bg-dark/5 text-muted hover:bg-dark/10 flex items-center justify-center gap-1"><X size={15} /> Batal</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditingId(branch.id); setEditingName(branch.name); setError(null) }} className="min-h-11 bg-primary/10 text-primary hover:bg-primary hover:text-dark flex items-center justify-center gap-1"><Pencil size={14} /> Edit</button>
                    <button type="button" onClick={() => void removeBranch(branch)} disabled={actionId === branch.id} className="min-h-11 bg-danger/10 text-danger hover:bg-danger hover:text-surface flex items-center justify-center gap-1 disabled:opacity-50"><Trash2 size={14} /> Hapus</button>
                  </>
                )}
              </div>
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
