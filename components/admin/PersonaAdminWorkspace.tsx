'use client'

import * as React from 'react'
import { Check, ClipboardList, Library, X } from 'lucide-react'
import { PersonaBuilder } from './PersonaBuilder'
import { PersonaList } from './PersonaList'
import { PersonaData, PersonaSubmission, submissionToPersonaData } from '@/lib/personas'

interface PersonaAdminWorkspaceProps {
  personas: PersonaData[]
  submissions: PersonaSubmission[]
  onSave: (persona: PersonaData) => Promise<void>
  onArchive: (id: string) => Promise<void>
  onApprove: (submission: PersonaSubmission, persona: PersonaData) => Promise<void>
  onReject: (submission: PersonaSubmission, reason: string) => Promise<void>
}

export function PersonaAdminWorkspace({ personas, submissions, onSave, onArchive, onApprove, onReject }: PersonaAdminWorkspaceProps) {
  const [view, setView] = React.useState<'queue' | 'library'>('queue')
  const [reviewing, setReviewing] = React.useState<PersonaSubmission | null>(null)
  const pending = submissions.filter(item => item.status === 'pending')
  const reviewed = submissions.filter(item => item.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 border-b-2 border-dark/15">
        <button onClick={() => setView('queue')} className={`min-h-11 px-4 font-bold text-xs uppercase font-heading flex items-center justify-center gap-2 border-b-2 -mb-[2px] ${view === 'queue' ? 'border-primary bg-primary/10' : 'border-transparent text-muted'}`}><ClipboardList size={15} /> Approval ({pending.length})</button>
        <button onClick={() => setView('library')} className={`min-h-11 px-4 font-bold text-xs uppercase font-heading flex items-center justify-center gap-2 border-b-2 -mb-[2px] ${view === 'library' ? 'border-primary bg-primary/10' : 'border-transparent text-muted'}`}><Library size={15} /> Library</button>
      </div>

      {view === 'library' ? <PersonaList personas={personas.filter(item => item.status !== 'archived')} onSave={onSave} onDelete={onArchive} /> : (
        <div className="space-y-4">
          {pending.map(submission => (
            <article key={submission.id} className="retro-panel bg-surface p-5 grid lg:grid-cols-[1fr_auto] gap-5 items-center">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-heading font-bold text-lg">{submission.persona.name}</h3><span className="px-2 py-1 border-2 border-warning/30 bg-warning/10 text-warning text-[10px] font-bold uppercase">Pending</span></div>
                <p className="text-xs font-semibold text-muted">{submission.creatorBranchName} · {submission.creatorName} · {submission.creatorEmail}</p>
                <p className="text-sm font-medium text-muted line-clamp-2">{submission.persona.backgroundStory || submission.persona.currentSituation || 'Tanpa deskripsi tambahan.'}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => setReviewing(submission)} className="retro-btn retro-btn-primary min-h-11 justify-center"><Check size={14} /> Review</button>
                <button onClick={() => {
                  const reason = window.prompt('Alasan penolakan persona:')?.trim()
                  if (reason) void onReject(submission, reason)
                }} className="retro-btn min-h-11 justify-center bg-danger/10 text-danger border-danger/30"><X size={14} /> Tolak</button>
              </div>
            </article>
          ))}
          {pending.length === 0 && <div className="p-10 text-center border-2 border-dashed border-dark/15 text-muted font-semibold">Tidak ada persona yang menunggu approval.</div>}
          {reviewed.length > 0 && (
            <div className="pt-4 space-y-3">
              <h3 className="font-heading font-bold uppercase">Riwayat Review</h3>
              {reviewed.slice(0, 20).map(submission => (
                <div key={submission.id} className="border-2 border-dark/10 bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div><p className="font-bold">{submission.persona.name}</p><p className="text-xs font-semibold text-muted">{submission.creatorBranchName} · {submission.creatorName}</p></div>
                  <span className={`px-2 py-1 border-2 text-[10px] font-bold uppercase ${submission.status === 'approved' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'}`}>{submission.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {reviewing && (
        <PersonaBuilder
          editingPersona={{
            ...submissionToPersonaData(reviewing),
            ...(reviewing.targetPersonaId ? {
              hiddenInstructions: personas.find(item => item.id === reviewing.targetPersonaId)?.hiddenInstructions || '',
              personaKnowledge: personas.find(item => item.id === reviewing.targetPersonaId)?.personaKnowledge || '',
              personaUnknowns: personas.find(item => item.id === reviewing.targetPersonaId)?.personaUnknowns || '',
            } : {}),
          }}
          onSave={async persona => { await onApprove(reviewing, persona); setReviewing(null) }}
          onClose={() => setReviewing(null)}
          allowInternalFields
          submitLabel="Approve Persona"
        />
      )}
    </div>
  )
}
