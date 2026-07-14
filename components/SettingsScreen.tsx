'use client'

import { Bot, Database, Lock, Settings, Shield } from 'lucide-react'

interface SettingsScreenProps {
  settings: {
    modelProvider?: string
    geminiModel?: string
    ollamaUrl?: string
    ollamaModel?: string
    openRouterModel?: string
    responseDelay?: number
    frustrationSensitivity?: number
  }
  isAdmin?: boolean
  onNavigate: (step: string) => void
}

export function SettingsScreen({ settings, isAdmin, onNavigate }: SettingsScreenProps) {
  const provider = settings.modelProvider || 'gemini'

  return (
    <div className="space-y-8">
      <div className="border-b-2 border-dark/15 pb-4">
        <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Pengaturan</h2>
        <p className="text-muted font-semibold text-sm mt-1">
          Preferensi aplikasi dan konfigurasi runtime AI.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="retro-panel bg-surface p-4 sm:p-6 space-y-5 lg:col-span-2 min-w-0">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="p-3 bg-primary/10 text-primary">
              <Bot size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold font-heading uppercase">Penyedia AI</h3>
              <p className="text-sm font-semibold text-muted">Tampilan hanya-baca. Admin dapat mengedit dari Pengaturan AI.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoRow label="Provider" value={provider.toUpperCase()} />
            <InfoRow label="Gemini Model" value={settings.geminiModel || 'Default'} />
            <InfoRow label="Ollama URL" value={settings.ollamaUrl || '-'} />
            <InfoRow label="Ollama Model" value={settings.ollamaModel || '-'} />
            <InfoRow label="OpenRouter Model" value={settings.openRouterModel || '-'} />
            <InfoRow label="Frustration Sensitivity" value={(settings.frustrationSensitivity ?? 5).toString()} />
          </div>
        </section>

        <aside className="retro-panel bg-surface p-4 sm:p-6 space-y-5 min-w-0">
          <div className="p-3 bg-navy text-white inline-flex">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heading uppercase">Kontrol Admin</h3>
            <p className="text-sm font-semibold text-muted mt-1">
              Konfigurasi skenario, persona, dan AI ada di admin panel.
            </p>
          </div>

          {isAdmin ? (
            <button
              onClick={() => onNavigate('admin')}
              className="retro-btn retro-btn-primary w-full px-4 py-3 font-bold uppercase text-xs flex items-center justify-center gap-2"
            >
              <Settings size={16} />
              Buka Panel Admin
            </button>
          ) : (
            <div className="p-4 bg-dark/5 border-2 border-dark/10 flex items-start gap-3">
              <Lock size={18} className="text-muted shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-muted">Akses admin diperlukan untuk mengubah pengaturan global.</p>
            </div>
          )}

          <div className="p-4 bg-success/10 border-2 border-success/30 flex items-start gap-3">
            <Database size={18} className="text-success shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-muted">Progres dan sesi tersinkron otomatis melalui Firebase.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-bg border-2 border-dark/10 min-w-0">
      <div className="text-[11px] font-bold uppercase text-muted font-heading mb-1">{label}</div>
      <div className="font-bold text-dark break-all sm:break-words [overflow-wrap:anywhere]">{value}</div>
    </div>
  )
}
