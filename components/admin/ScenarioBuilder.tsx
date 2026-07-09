'use client'

import * as React from 'react'
import { motion } from 'motion/react'
import { X, Save, Info, User, Target, Cpu, BarChart3, Award, Globe } from 'lucide-react'
import { SalesScenario } from '@/lib/gemini'

type BuilderTab = 'basic' | 'persona' | 'objective' | 'ai-config' | 'evaluation' | 'rewards' | 'publish'

interface ScenarioBuilderProps {
  editingScenario?: SalesScenario | null
  onSave: (scenario: SalesScenario) => void
  onClose: () => void
}

const TABS: { key: BuilderTab; label: string; icon: React.ReactNode }[] = [
  { key: 'basic', label: 'Basic Info', icon: <Info size={14} /> },
  { key: 'persona', label: 'Persona', icon: <User size={14} /> },
  { key: 'objective', label: 'Objective', icon: <Target size={14} /> },
  { key: 'ai-config', label: 'AI Config', icon: <Cpu size={14} /> },
  { key: 'evaluation', label: 'Evaluation', icon: <BarChart3 size={14} /> },
  { key: 'rewards', label: 'Rewards', icon: <Award size={14} /> },
  { key: 'publish', label: 'Publish', icon: <Globe size={14} /> },
]

export function ScenarioBuilder({ editingScenario, onSave, onClose }: ScenarioBuilderProps) {
  const [tab, setTab] = React.useState<BuilderTab>('basic')
  const [title, setTitle] = React.useState(editingScenario?.title || '')
  const [description, setDescription] = React.useState(editingScenario?.description || '')
  const [target, setTarget] = React.useState(editingScenario?.target || '')
  const [consumerProfile, setConsumerProfile] = React.useState(editingScenario?.consumerProfile || '')
  const [difficulty, setDifficulty] = React.useState<'Easy' | 'Medium' | 'Hard'>(editingScenario?.difficulty || 'Medium')
  const [name, setName] = React.useState(editingScenario?.name || '')
  const [gender, setGender] = React.useState<'Pria' | 'Wanita'>(editingScenario?.gender || 'Pria')
  const [aggressiveness, setAggressiveness] = React.useState(editingScenario?.aggressiveness || 5)
  const [patience, setPatience] = React.useState(editingScenario?.patience || 5)
  const [responseStyle, setResponseStyle] = React.useState(editingScenario?.responseStyle || 'Banyak Tanya')
  const [firstSpeaker, setFirstSpeaker] = React.useState<'AI' | 'Sales'>(editingScenario?.firstSpeaker || 'AI')

  // Extended fields
  const [openingMessage, setOpeningMessage] = React.useState(editingScenario?.openingMessage || '')
  const [hiddenRules, setHiddenRules] = React.useState(editingScenario?.hiddenRules || '')
  const [successCriteria, setSuccessCriteria] = React.useState<string[]>(editingScenario?.successCriteria || [
    'Understand the customer concern',
    'Build rapport and trust',
    'Present relevant solutions',
    'Handle objections professionally',
  ])
  const baseXp = difficulty === 'Easy' ? 50 : difficulty === 'Hard' ? 120 : 80
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(editingScenario?.status || 'draft')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || !name) return

    const scenario: SalesScenario = {
      id: editingScenario?.id || `scenario-${Date.now()}`,
      title,
      description,
      target: target || description,
      consumerProfile: consumerProfile || description,
      difficulty,
      icon: editingScenario?.icon || 'UserPlus',
      name,
      gender,
      aggressiveness,
      patience,
      responseStyle,
      firstSpeaker,
      openingMessage,
      hiddenRules,
      successCriteria,
      baseXp,
      status,
    }

    onSave(scenario)
  }

  const renderTab = () => {
    switch (tab) {
      case 'basic':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Scenario Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. BI Checking Objection" className="retro-input bg-surface p-4" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Scenario background..." className="retro-input bg-surface p-4 resize-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="retro-input bg-surface p-4">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Estimated Duration</label>
                <input value="10 min" disabled className="retro-input bg-surface p-4 opacity-60" />
              </div>
            </div>
          </div>
        )

      case 'persona':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Persona Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pak Budi" className="retro-input bg-surface p-4" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value as any)} className="retro-input bg-surface p-4">
                  <option value="Pria">Pria</option>
                  <option value="Wanita">Wanita</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Response Style</label>
              <select value={responseStyle} onChange={e => setResponseStyle(e.target.value as any)} className="retro-input bg-surface p-4">
                <option value="To the point">To the point</option>
                <option value="Banyak Tanya">Banyak Tanya</option>
                <option value="Ragu-ragu">Ragu-ragu</option>
                <option value="Cerewet">Cerewet</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Aggressiveness ({aggressiveness}/10)</label>
                <input type="range" min="1" max="10" value={aggressiveness} onChange={e => setAggressiveness(parseInt(e.target.value))} className="w-full" />
                <div className="flex justify-between text-[10px] font-bold text-muted"><span>Calm</span><span>Aggressive</span></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted font-heading">Patience ({patience}/10)</label>
                <input type="range" min="1" max="10" value={patience} onChange={e => setPatience(parseInt(e.target.value))} className="w-full" />
                <div className="flex justify-between text-[10px] font-bold text-muted"><span>Patient</span><span>Impatient</span></div>
              </div>
            </div>
          </div>
        )

      case 'objective':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Objective / Target</label>
              <textarea value={target} onChange={e => setTarget(e.target.value)} rows={2} placeholder="What should the salesperson achieve?" className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Consumer Profile (Brief for AI)</label>
              <textarea value={consumerProfile} onChange={e => setConsumerProfile(e.target.value)} rows={3} placeholder="Detailed persona background for the AI..." className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Success Criteria</label>
              {successCriteria.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={c}
                    onChange={e => {
                      const next = [...successCriteria]
                      next[i] = e.target.value
                      setSuccessCriteria(next)
                    }}
                    className="retro-input bg-surface p-3 flex-1"
                  />
                  <button
                    onClick={() => setSuccessCriteria(successCriteria.filter((_, j) => j !== i))}
                    className="p-2 bg-danger/10 text-danger hover:bg-danger hover:text-surface"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setSuccessCriteria([...successCriteria, ''])}
                className="text-[10px] font-bold uppercase text-primary hover:text-primary/80 font-heading"
              >
                + Add Criterion
              </button>
            </div>
          </div>
        )

      case 'ai-config':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">First Speaker</label>
              <div className="flex gap-3">
                <button onClick={() => setFirstSpeaker('AI')} className={`flex-1 p-4 border-2 font-bold text-[10px] uppercase transition-all ${firstSpeaker === 'AI' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15'}`}>AI First</button>
                <button onClick={() => setFirstSpeaker('Sales')} className={`flex-1 p-4 border-2 font-bold text-[10px] uppercase transition-all ${firstSpeaker === 'Sales' ? 'bg-primary text-dark border-primary' : 'bg-surface border-dark/15'}`}>Sales First</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Opening Message (AI first line)</label>
              <textarea value={openingMessage} onChange={e => setOpeningMessage(e.target.value)} rows={2} placeholder="What does the customer say first?" className="retro-input bg-surface p-4 resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Hidden Rules (never shown to users)</label>
              <textarea value={hiddenRules} onChange={e => setHiddenRules(e.target.value)} rows={3} placeholder="Internal instructions for the AI persona..." className="retro-input bg-surface p-4 resize-none border-warning/50 bg-warning/5" />
              <p className="text-[9px] font-semibold text-warning">These instructions are never visible to normal users.</p>
            </div>
          </div>
        )

      case 'evaluation':
        return (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-muted">Skill scoring is handled automatically by the AI analysis. Configure which skills to track.</p>
            <div className="space-y-3">
              {['Opening', 'Discovery', 'Presentation', 'Objection Handling', 'Closing', 'Follow Up'].map(skill => (
                <div key={skill} className="flex items-center justify-between p-3 bg-dark/5 border-2 border-dark/10">
                  <span className="font-bold text-sm">{skill}</span>
                  <span className="text-[10px] font-bold text-muted bg-surface px-2 py-0.5 border border-dark/10">Auto-evaluated</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'rewards':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Base XP Reward</label>
              <input type="number" value={baseXp} disabled className="retro-input bg-surface p-4 w-32 opacity-60" />
              <p className="text-[10px] font-semibold text-muted">Auto-calculated from difficulty: Easy=50, Medium=80, Hard=120</p>
            </div>
          </div>
        )

      case 'publish':
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted font-heading">Status</label>
              <div className="flex gap-3">
                {(['draft', 'published', 'archived'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 p-4 border-2 font-bold text-[10px] uppercase transition-all ${
                      status === s
                        ? s === 'published' ? 'bg-success/10 text-success border-success/30'
                          : s === 'archived' ? 'bg-danger/10 text-danger border-danger/30'
                          : 'bg-dark/10 text-dark border-dark/30'
                        : 'bg-surface border-dark/15 text-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-primary/5 border-2 border-primary/15">
              <p className="text-xs font-semibold text-muted">
                <span className="font-bold text-primary">Published</span> scenarios appear in the user scenario library.
                <br />
                <span className="font-bold text-danger">Archived</span> scenarios are hidden from users.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-dark/80"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-3xl max-h-[90vh] bg-surface retro-panel overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-dark/15 bg-primary text-dark flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold font-heading">
            {editingScenario ? 'Edit Scenario' : 'New Scenario'}
          </h3>
          <button onClick={onClose} className="p-2 bg-dark/20 hover:bg-dark/30">
            <X size={18} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex overflow-x-auto border-b-2 border-dark/15 bg-bg shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[9px] font-bold uppercase font-heading whitespace-nowrap border-b-2 -mb-[2px] transition-none ${
                tab === t.key ? 'border-primary bg-primary/10 text-dark' : 'border-transparent text-muted hover:text-dark'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderTab()}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-2 border-dark/15">
            <button
              type="submit"
              className="retro-btn retro-btn-primary flex items-center gap-2 text-[11px] flex-1 justify-center"
            >
              <Save size={16} /> {editingScenario ? 'Update Scenario' : 'Create Scenario'}
            </button>
            <button type="button" onClick={onClose} className="retro-btn retro-btn-ghost text-[11px]">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
