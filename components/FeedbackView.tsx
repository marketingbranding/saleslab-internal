'use client'

import * as React from "react"
import { motion } from "motion/react"
import { SalesScenario, analyzePerformance } from "@/lib/gemini"
import { Trophy, Target, AlertTriangle, Lightbulb, CheckCircle2, Home, RefreshCcw } from "lucide-react"
import confetti from "canvas-confetti"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/AuthContext"
import { SyncIndicator } from "@/components/SyncIndicator"

interface FeedbackData {
  overallScore: number
  grade?: string
  summary?: string
  strengths: string[]
  weaknesses: string[]
  keyObjectionsHandled: string[]
  missedOpportunities: string[]
  verdict: string
  actionableTips: string[]
  skillScores?: Array<{ skill: string; score: number; evidence?: string[] }>
  suggestedResponses?: string[]
  recommendedNextScenario?: string | null
  actionPlan?: string[]
}

interface FeedbackViewProps {
  scenario: SalesScenario
  salespersonName: string
  transcript: { role: "user" | "model"; text: string }[]
  onRestart: () => void
  onHome: () => void
}

export function FeedbackView({ scenario, salespersonName, transcript, onRestart, onHome }: FeedbackViewProps) {
  const { user } = useAuth()
  const [feedback, setFeedback] = React.useState<FeedbackData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [analysisStatus, setAnalysisStatus] = React.useState<'processing' | 'completed' | 'failed'>('processing')
  const hasStartedRef = React.useRef(false)
  const sessionIdRef = React.useRef<string | null>(null)

  const ensureSessionId = React.useCallback(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}`
    }
    return sessionIdRef.current
  }, [])

  const saveSessionState = React.useCallback(async (payload: Record<string, any>) => {
    if (!user) return
    await setDoc(doc(db, 'sessions', ensureSessionId()), {
      scenarioId: scenario.id,
      salespersonName,
      transcript,
      userId: user.uid,
      score: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...payload,
    }, { merge: true })
  }, [ensureSessionId, scenario.id, salespersonName, transcript, user])

  const runAnalysis = React.useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      setAnalysisStatus('processing')

      await saveSessionState({
        analysisStatus: 'processing',
        transcriptQuality: transcript.length < 3 ? 'partial' : 'complete',
      })

      const data = await analyzePerformance(scenario, transcript)
      setFeedback(data)
      setAnalysisStatus('completed')

      if (data.overallScore >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E6915D', '#5B8C5A', '#C9972F']
        })
      }

      await saveSessionState({
        score: data.overallScore,
        feedback: data,
        analysisStatus: 'completed',
        analysisProvider: 'api/analyze',
      })
      setSaved(true)
    } catch (err: any) {
      console.error("Feedback error:", err)
      setAnalysisStatus('failed')
      const message = err?.message?.includes('503') || err?.message?.includes('high demand')
        ? "Server sedang sibuk. Silakan tunggu sebentar dan coba lagi."
        : err?.message || "Gagal menganalisis performa. Silakan coba lagi."
      setError(message)
      try {
        await saveSessionState({
          analysisStatus: 'failed',
          analysisError: message,
        })
        setSaved(true)
      } catch (saveErr) {
        console.error('Failed to save failed analysis state:', saveErr)
      }
    } finally {
      setLoading(false)
    }
  }, [saveSessionState, scenario, transcript])

  React.useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    runAnalysis()
  }, [runAnalysis])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="p-4 bg-primary text-dark retro-panel"
        >
          <Target size={32} />
        </motion.div>
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold font-heading">Menganalisis Taktik Sales...</h3>
          <SyncIndicator status="syncing" />
        </div>
        <p className="text-muted text-sm">Menyimpan transkrip dan mengevaluasi benchmark performa.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center max-w-md mx-auto px-6">
        <div className="p-4 bg-danger/10 text-danger">
          <AlertTriangle size={48} strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold font-heading tracking-tight">Analisis Tidak Tersedia</h3>
          <p className="text-muted font-medium leading-tight">{error}</p>
        </div>
        <SyncIndicator status="error" />
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={runAnalysis}
            className="flex-1 px-8 py-3 bg-primary text-dark font-semibold uppercase transition-all retro-btn retro-btn-primary"
          >
            Coba Analisis Ulang
          </button>
          <button
            onClick={onHome}
            className="flex-1 px-8 py-3 border-2 border-dark/20 font-semibold uppercase hover:bg-dark/5 transition-all retro-btn retro-btn-ghost"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!feedback) return null

  const transcriptIncomplete = transcript.length < 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-12 pb-24"
    >
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading tracking-tight uppercase">LAPORAN Mission</h2>
        <SyncIndicator status={saved ? 'synced' : 'syncing'} />
      </div>

      {analysisStatus === 'completed' && feedback.summary && (
        <div className="p-5 bg-primary/10 border-2 border-primary/20 text-dark">
          <div className="text-[10px] font-bold uppercase text-primary font-heading mb-2">Ringkasan Analisis</div>
          <p className="text-sm font-semibold leading-tight">{feedback.summary}</p>
        </div>
      )}

      {/* Transcript warning banner */}
      {transcriptIncomplete && (
        <div className="p-4 bg-warning/10 border-2 border-warning/30 text-warning font-bold text-xs uppercase flex items-center gap-3" role="alert">
          <AlertTriangle size={16} />
          <span>Transkrip sangat pendek ({transcript.length} pertukaran). Analisis mungkin kurang akurat.</span>
        </div>
      )}

      {/* Hero Score */}
      <div className="bg-surface retro-panel p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div className="relative">
          <div className="w-48 h-48 bg-primary text-dark flex items-center justify-center flex-col border-2 border-dark">
            <span className="text-7xl font-bold font-heading tracking-tight leading-none">{feedback.overallScore}</span>
            <span className="text-[11px] font-bold uppercase text-dark/80 mt-2 font-heading">{feedback.grade || 'Score Akhir'}</span>
          </div>
          <div className="absolute -top-3 -right-3 w-12 h-12 bg-warning text-dark flex items-center justify-center">
            <Trophy size={24} strokeWidth={2} />
          </div>
        </div>

        <div className="flex-1 space-y-6 text-center md:text-left">
          <h2 className="text-5xl font-bold font-heading uppercase tracking-tight leading-none">
            Mission <br /> Debrief
          </h2>
          <p className="text-lg font-medium text-muted leading-tight border-l-4 border-primary pl-6">
            &quot;{feedback.verdict}&quot;
          </p>
          <div className="flex gap-4 justify-center md:justify-start pt-4">
            <button
              onClick={onRestart}
              className="retro-btn retro-btn-primary px-8 py-3 font-bold uppercase text-sm flex items-center gap-2"
            >
              <RefreshCcw size={18} strokeWidth={2.5} />
              Coba Lagi
            </button>
            <button
              onClick={onHome}
              className="retro-btn retro-btn-ghost px-8 py-3 font-bold uppercase text-sm flex items-center gap-2"
            >
              <Home size={18} strokeWidth={2.5} />
              Menu Utama
            </button>
          </div>
        </div>
      </div>

      {/* Grid Details */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Kekuatan */}
        <section className="bg-surface retro-panel p-8">
          <div className="flex items-center gap-3 mb-6 bg-success/15 p-3 inline-flex">
            <CheckCircle2 size={22} strokeWidth={2} className="text-success" />
            <h3 className="font-bold uppercase text-xs text-success font-heading">Kekuatan</h3>
          </div>
          <ul className="space-y-4">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm font-semibold text-dark leading-tight">
                <span className="text-success shrink-0 font-bold">#</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Weaknesses */}
        <section className="bg-surface retro-panel p-8">
          <div className="flex items-center gap-3 mb-6 bg-danger/15 p-3 inline-flex">
            <AlertTriangle size={22} strokeWidth={2} className="text-danger" />
            <h3 className="font-bold uppercase text-xs text-danger font-heading">Area yang Perlu Ditingkatkan</h3>
          </div>
          <ul className="space-y-4">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-3 text-sm font-semibold text-dark leading-tight">
                <span className="text-danger shrink-0 font-bold">!</span>
                {w}
              </li>
            ))}
          </ul>
        </section>

        {/* Actionable Tips */}
        <section className="bg-surface retro-panel p-8 col-span-full">
          <div className="flex items-center gap-3 mb-8 bg-primary/15 p-3 inline-flex">
            <Lightbulb size={22} strokeWidth={2} className="text-primary" />
            <h3 className="font-bold uppercase text-xs text-primary font-heading">Tips Closing</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {feedback.actionableTips.map((tip, i) => (
              <div key={i} className="flex gap-4 p-5 border-2 border-primary/15 bg-primary/[0.05] hover:bg-primary/[0.08] transition-colors">
                <div className="w-10 h-10 bg-primary text-dark flex items-center justify-center shrink-0 text-sm font-bold">
                  {i + 1}
                </div>
                <p className="text-sm font-semibold text-dark leading-tight">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {feedback.skillScores && feedback.skillScores.length > 0 && (
          <section className="bg-surface retro-panel p-8 col-span-full">
            <div className="flex items-center gap-3 mb-8 bg-warning/15 p-3 inline-flex">
              <Target size={22} strokeWidth={2} className="text-warning" />
              <h3 className="font-bold uppercase text-xs text-warning font-heading">Rincian Skill</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {feedback.skillScores.map((skill) => (
                <div key={skill.skill} className="p-4 border-2 border-dark/10 bg-bg space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase font-heading">
                    <span>{skill.skill}</span>
                    <span>{skill.score}/100</span>
                  </div>
                  <div className="h-3 bg-dark/10 border border-dark/20">
                    <div className="h-full bg-primary" style={{ width: `${skill.score}%` }} />
                  </div>
                  {skill.evidence && skill.evidence.length > 0 && (
                    <p className="text-xs font-semibold text-muted leading-tight">{skill.evidence[0]}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {feedback.suggestedResponses && feedback.suggestedResponses.length > 0 && (
          <section className="bg-surface retro-panel p-8 col-span-full">
            <div className="flex items-center gap-3 mb-8 bg-success/15 p-3 inline-flex">
              <Lightbulb size={22} strokeWidth={2} className="text-success" />
              <h3 className="font-bold uppercase text-xs text-success font-heading">Respon yang Disarankan</h3>
            </div>
            <ul className="space-y-3">
              {feedback.suggestedResponses.map((response, i) => (
                <li key={i} className="p-4 border-2 border-success/15 bg-success/[0.05] text-sm font-semibold leading-tight">
                  {response}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </motion.div>
  )
}
