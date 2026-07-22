'use client'

import * as React from 'react'
import { Building2, Clock3, Plus, RefreshCw, UserSquare2 } from 'lucide-react'
import { PersonaBuilder } from '@/components/admin/PersonaBuilder'
import { PersonaData, PersonaSubmission, UserMembership, submissionToPersonaData } from '@/lib/personas'
import { toEditablePersona, type PersonaRecord } from '@/lib/data'

interface PersonaSubmissionsScreenProps {
  membership: UserMembership
  submissions: PersonaSubmission[]
  approvedPersonas: PersonaRecord[]
  onSubmit: (persona: PersonaData, options?: { targetPersonaId?: string; previousSubmissionId?: string }) => Promise<void>
}

const STATUS_STYLES = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-danger/10 text-danger border-danger/30',
}

export function PersonaSubmissionsScreen({ membership, submissions, approvedPersonas, onSubmit }: PersonaSubmissionsScreenProps) {
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PersonaData | null>(null)
  const [revision, setRevision] = React.useState<{ targetPersonaId?: string; previousSubmissionId?: string }>({})

  const openNew = () => {
    setEditing(null)
    setRevision({})
    setBuilderOpen(true)
  }

  const openSubmissionRevision = (submission: PersonaSubmission) => {
    setEditing(submissionToPersonaData(submission))
    setRevision({ targetPersonaId: submission.targetPersonaId, previousSubmissionId: submission.id })
    setBuilderOpen(true)
  }

  const openApprovedRevision = (persona: PersonaRecord) => {
    setEditing(toEditablePersona(persona))
    setRevision({ targetPersonaId: persona.id, previousSubmissionId: persona.sourceSubmissionId })
    setBuilderOpen(true)
  }

  const handleSave = async (persona: PersonaData) => {
    await onSubmit(persona, revision)
    setBuilderOpen(false)
  }

  const activeApproved = approvedPersonas.filter(persona => persona.status !== 'archived')

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between border-b-2 border-dark/15 pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2"><UserSquare2 size={18} /><span className="text-[10px] font-bold uppercase font-heading">Persona Saya</span></div>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Pengajuan Persona</h2>
          <p className="text-sm font-semibold text-muted mt-2 flex items-center gap-2"><Building2 size={14} /> {membership.branchName} · {membership.displayName}</p>
        </div>
        <button onClick={openNew} className="retro-btn retro-btn-primary min-h-11 justify-center"><Plus size={15} /> Ajukan Persona</button>
      </header>

      <section className="space-y-3">
        <h3 className="font-heading font-bold uppercase">Status Pengajuan</h3>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {submissions.map(submission => (
            <article key={submission.id} className="retro-panel bg-surface p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div><h4 className="font-bold font-heading">{submission.persona.name}</h4><p className="text-xs text-muted font-semibold">{submission.persona.occupation || 'Tanpa pekerjaan'}</p></div>
                <span className={`px-2 py-1 border-2 text-[10px] font-bold uppercase font-heading ${STATUS_STYLES[submission.status]}`}>{submission.status}</span>
              </div>
              <p className="text-[11px] font-semibold text-muted flex items-center gap-1"><Clock3 size={12} /> {submission.targetPersonaId ? 'Revisi persona' : 'Persona baru'}</p>
              {submission.rejectionReason && <p className="p-3 bg-danger/10 border-2 border-danger/20 text-xs font-semibold text-danger">Alasan: {submission.rejectionReason}</p>}
              {submission.status === 'rejected' && (
                <button onClick={() => openSubmissionRevision(submission)} className="retro-btn retro-btn-ghost w-full min-h-11 justify-center"><RefreshCw size={14} /> Perbaiki & Kirim Ulang</button>
              )}
            </article>
          ))}
          {submissions.length === 0 && <div className="sm:col-span-2 xl:col-span-3 border-2 border-dashed border-dark/15 p-8 text-center text-sm font-semibold text-muted">Belum ada pengajuan persona.</div>}
        </div>
      </section>

      {activeApproved.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-heading font-bold uppercase">Perpustakaan Persona Disetujui</h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeApproved.map(persona => (
              <article key={persona.id} className="retro-panel bg-surface p-5 space-y-3">
                <div><h4 className="font-bold font-heading">{persona.name}</h4><p className="text-xs font-semibold text-muted">{persona.creatorBranchName || 'System / Admin'} · {persona.creatorName || 'Admin'} · v{persona.version || 1}</p></div>
                {persona.creatorUid === membership.userId && <button onClick={() => openApprovedRevision(persona)} className="retro-btn retro-btn-ghost w-full min-h-11 justify-center"><RefreshCw size={14} /> Ajukan Revisi</button>}
              </article>
            ))}
          </div>
        </section>
      )}

      {builderOpen && (
        <PersonaBuilder editingPersona={editing} onSave={handleSave} onClose={() => setBuilderOpen(false)} allowInternalFields={false} submitLabel="Kirim untuk Approval" />
      )}
    </div>
  )
}
