'use client'

import { User as FirebaseUser } from 'firebase/auth'
import type { ReactNode } from 'react'
import { Award, BarChart3, Flame, Mail, Medal, Star, Trophy, User } from 'lucide-react'

interface ProfileScreenProps {
  user: FirebaseUser
  profile: {
    displayName: string
    email: string
    photoURL?: string
  }
  stats: {
    level: number
    xpCurrent: number
    xpNext: number
    progress: number
    rank: string
    totalSessions: number
    averageScore: number
    bestScore: number
    streakDays: number
    achievementsCount: number
  }
}

export function ProfileScreen({ user, profile, stats }: ProfileScreenProps) {
  const photoUrl = profile.photoURL || user.photoURL

  return (
    <div className="space-y-8">
      <div className="border-b-2 border-dark/15 pb-4">
        <h2 className="text-3xl sm:text-4xl font-bold font-heading uppercase">Profile</h2>
        <p className="text-muted font-semibold text-sm mt-1">
          Identitas akun, progress, dan rank training.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_1.9fr] gap-6">
        <section className="retro-panel bg-surface p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-primary text-dark border-2 border-dark flex items-center justify-center overflow-hidden shrink-0">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Profile photo" className="w-full h-full object-cover" />
              ) : (
                <User size={34} strokeWidth={2} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-bold font-heading uppercase leading-none truncate">
                {profile.displayName || 'Agent'}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-muted font-semibold text-sm truncate">
                <Mail size={14} />
                <span className="truncate">{profile.email || user.email}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-navy text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-white/50 font-heading">Rank Saat Ini</span>
              <Medal size={18} className="text-primary" />
            </div>
            <div className="text-xl font-bold font-heading uppercase">{stats.rank}</div>
            <div className="text-[10px] font-bold uppercase text-white/50 font-heading">Level {stats.level}</div>
          </div>
        </section>

        <section className="retro-panel bg-surface p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold font-heading uppercase">Progress</h3>
              <p className="text-sm font-semibold text-muted">XP dan ringkasan performa</p>
            </div>
            <div className="px-4 py-2 bg-primary text-dark font-bold font-heading uppercase text-xs">
              Lv.{stats.level}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase text-muted font-heading">
              <span>XP Progress</span>
              <span>{stats.xpCurrent}/{stats.xpNext} XP</span>
            </div>
            <div className="h-4 bg-dark/10 border-2 border-dark/15 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={<BarChart3 size={18} />} label="Missions" value={stats.totalSessions.toString()} />
            <StatCard icon={<Star size={18} />} label="Avg Score" value={stats.averageScore.toString()} />
            <StatCard icon={<Trophy size={18} />} label="Best Score" value={stats.bestScore.toString()} />
            <StatCard icon={<Flame size={18} />} label="Streak" value={`${stats.streakDays}d`} />
          </div>

          <div className="p-4 bg-warning/10 border-2 border-warning/30 flex items-center gap-3">
            <Award size={20} className="text-warning shrink-0" />
            <div>
              <div className="font-bold font-heading uppercase text-sm">{stats.achievementsCount} pencapaian terbuka</div>
              <p className="text-xs font-semibold text-muted">Terus latih untuk membuka lebih banyak badge dan reward XP.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-bg border-2 border-dark/10 space-y-2">
      <div className="text-primary">{icon}</div>
      <div className="text-2xl font-bold font-heading leading-none">{value}</div>
      <div className="text-[10px] font-bold uppercase text-muted font-heading">{label}</div>
    </div>
  )
}
