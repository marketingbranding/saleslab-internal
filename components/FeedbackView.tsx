'use client'

import * as React from "react"
import { motion } from "motion/react"
import { SalesScenario, analyzePerformance } from "@/lib/gemini"
import { Trophy, Target, AlertTriangle, Lightbulb, CheckCircle2, Home, RefreshCcw, ShieldAlert, CircleCheck, CircleDashed } from "lucide-react"
import confetti from "canvas-confetti"
import { db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/AuthContext"
import { SyncIndicator } from "@/components/SyncIndicator"
import type { TrialFeedbackData } from "@/lib/sos/evaluation/client-types"
import {
  allHomeCategoryPresentations,
  evaluationRuleLabel,
  evaluationSeverityLabel,
  knownMissingHomeCategories,
  uniqueTranscriptReasonLabels,
} from "@/lib/sos/evaluation/presentation"

interface FeedbackViewProps {
  scenario: SalesScenario
  salespersonName: string
  transcript: { role: "user" | "model"; text: string }[]
  onRestart: () => void
  onHome: () => void
}

export function FeedbackView({ scenario, salespersonName, transcript, onRestart, onHome }: FeedbackViewProps) {
  const { user } = useAuth()
  const [feedback, setFeedback] = React.useState<TrialFeedbackData | null>(null)
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

  const saveSessionState = React.useCallback(async (payload: Record<string, unknown>) => {
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

  const evaluationV2 = feedback.evaluationV2
  const v2SufficiencyKnown = typeof evaluationV2?.transcriptSufficient === 'boolean'
  const transcriptIncomplete = v2SufficiencyKnown
    ? evaluationV2.transcriptSufficient === false
    : transcript.length < 3
  const transcriptWarnings = evaluationV2?.transcriptSufficient === false
    ? uniqueTranscriptReasonLabels(evaluationV2.insufficiencyReasons)
    : [`Transkrip sangat pendek (${transcript.length} pertukaran). Analisis mungkin kurang akurat.`]
  const scoreAdjustment = evaluationV2?.scoreAdjustment
  const appliedRules = Array.isArray(scoreAdjustment?.appliedRules) ? scoreAdjustment.appliedRules : []
  const visibleRules = appliedRules.slice(0, 5)
  const hiddenRuleCount = Math.max(0, appliedRules.length - visibleRules.length)
  const scoreCapped = scoreAdjustment?.capped === true
  const controllingRuleLabel = evaluationRuleLabel(
    scoreAdjustment?.controllingRuleId || appliedRules[0]?.ruleId || ''
  )
  const originalScore = typeof scoreAdjustment?.originalScore === 'number'
    ? scoreAdjustment.originalScore
    : feedback.overallScore
  const effectiveMaxScore = typeof scoreAdjustment?.effectiveMaxScore === 'number'
    ? scoreAdjustment.effectiveMaxScore
    : 100
  const home = evaluationV2?.home
  const hasHomeDetails = Array.isArray(home?.missingCategories)
  const missingHomeCategories = new Set(knownMissingHomeCategories(home?.missingCategories))
  const homeCategories = allHomeCategoryPresentations()
  const homeCompletedCount = typeof home?.completedCount === 'number' && Number.isFinite(home.completedCount)
    ? Math.max(0, Math.min(4, Math.round(home.completedCount)))
    : Math.max(0, 4 - missingHomeCategories.size)
  const skillScores = Array.isArray(feedback.skillScores) ? feedback.skillScores : []
  const strengths = Array.isArray(feedback.strengths) ? feedback.strengths : []
  const weaknesses = Array.isArray(feedback.weaknesses) ? feedback.weaknesses : []
  const actionableTips = Array.isArray(feedback.actionableTips) ? feedback.actionableTips : []
  const suggestedResponses = Array.isArray(feedback.suggestedResponses) ? feedback.suggestedResponses : []
  const evidenceAccepted = evaluationV2?.evidenceDiagnostics?.accepted
  const evidenceRejected = evaluationV2?.evidenceDiagnostics?.rejected
  const showEvidenceQuality = (typeof evidenceAccepted === 'number' && evidenceAccepted > 0) ||
    (typeof evidenceRejected === 'number' && evidenceRejected > 0)

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
        <div className="p-4 bg-warning/10 border-2 border-warning/40 text-dark flex items-start gap-3" role="alert">
          <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className="font-heading text-sm font-bold uppercase">Bukti Percakapan Terbatas</h3>
            <ul className="space-y-1 text-sm font-semibold leading-tight text-dark/80">
              {transcriptWarnings.map(message => <li key={message}>{message}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Hero Score */}
      <div className="bg-surface retro-panel p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        <div className="relative">
          <div className="w-48 h-48 bg-primary text-dark flex items-center justify-center flex-col border-2 border-dark">
            <span className="text-7xl font-bold font-heading tracking-tight leading-none">{feedback.overallScore}</span>
            <span className="text-[11px] font-bold uppercase text-dark/80 mt-2 font-heading">{feedback.grade || 'Score Akhir'}</span>
            {scoreCapped && (
              <span className="text-[11px] font-bold text-dark/70 mt-1 font-mono">Skor awal: {originalScore}</span>
            )}
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

      {appliedRules.length > 0 && (
        <section
          className={`retro-panel p-5 sm:p-7 space-y-5 ${scoreCapped ? 'bg-danger/10' : 'bg-warning/10'}`}
          role={scoreCapped ? 'alert' : undefined}
          aria-labelledby="score-adjustment-title"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 border-2 border-dark shrink-0 ${scoreCapped ? 'bg-danger text-surface' : 'bg-warning text-dark'}`}>
              <ShieldAlert size={24} aria-hidden="true" />
            </div>
            <div className="space-y-2 min-w-0">
              <h3 id="score-adjustment-title" className="font-heading text-lg font-bold uppercase">
                {scoreCapped ? 'Penyesuaian Skor' : 'Temuan Penting'}
              </h3>
              <p className="text-sm font-semibold leading-snug text-dark/80">
                {scoreCapped
                  ? `Skor disesuaikan dari ${originalScore} menjadi ${feedback.overallScore}, dengan batas maksimum ${effectiveMaxScore}, karena ${controllingRuleLabel.toLowerCase()}.`
                  : `Evaluasi menemukan ${appliedRules.length} temuan. Skor akhir sudah berada di bawah batas yang berlaku sehingga tidak dikurangi lagi.`}
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleRules.map((rule, index) => {
              const sourceTurns = Array.isArray(rule.sourceTurnSequences)
                ? [...new Set(rule.sourceTurnSequences.filter(sequence => Number.isInteger(sequence) && sequence > 0))].slice(0, 5)
                : []
              return (
                <li key={`${rule.ruleId}-${index}`} className="border-2 border-dark/20 bg-surface p-4 space-y-1">
                  <div className="text-sm font-bold leading-tight">{evaluationRuleLabel(rule.ruleId)}</div>
                  <div className="text-xs font-semibold text-muted leading-relaxed">
                    {evaluationSeverityLabel(rule.severity)} · Batas skor {rule.maxScore}
                    {sourceTurns.length > 0 ? ` · Turn ${sourceTurns.join(', ')}` : ''}
                  </div>
                </li>
              )
            })}
          </ul>
          {hiddenRuleCount > 0 && (
            <p className="text-xs font-bold uppercase text-muted">+{hiddenRuleCount} temuan lainnya</p>
          )}
        </section>
      )}

      {home && (
        <section className="bg-surface retro-panel p-5 sm:p-8 space-y-6" aria-labelledby="home-coverage-title">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 border-b-2 border-dark/15 pb-4">
            <div>
              <div className="text-[10px] font-bold uppercase text-primary font-heading mb-1">Discovery Coverage</div>
              <h3 id="home-coverage-title" className="text-xl font-bold uppercase">Kelengkapan Kualifikasi HOME</h3>
            </div>
            <div className="font-mono text-sm font-bold">{homeCompletedCount} dari 4 area tergali</div>
          </div>
          {hasHomeDetails && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {homeCategories.map(category => {
                const missing = missingHomeCategories.has(category.key)
                return (
                  <li key={category.key} className="border-2 border-dark/15 bg-bg p-4 flex items-start gap-3">
                    {missing
                      ? <CircleDashed size={19} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                      : <CircleCheck size={19} className="text-success shrink-0 mt-0.5" aria-hidden="true" />}
                    <div>
                      <div className="text-sm font-bold">{category.label}</div>
                      <div className="text-xs text-muted font-semibold">{category.description}</div>
                      <div className={`text-[10px] font-bold uppercase mt-2 ${missing ? 'text-warning' : 'text-success'}`}>
                        {missing ? 'Belum tergali' : 'Tergali'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs font-semibold text-muted leading-relaxed">
            HOME mengukur kelengkapan penggalian kebutuhan, bukan keputusan persetujuan bank.
          </p>
        </section>
      )}

      {/* Grid Details */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Kekuatan */}
        {strengths.length > 0 && <section className="bg-surface retro-panel p-8">
          <div className="flex items-center gap-3 mb-6 bg-success/15 p-3 inline-flex">
            <CheckCircle2 size={22} strokeWidth={2} className="text-success" />
            <h3 className="font-bold uppercase text-xs text-success font-heading">Kekuatan</h3>
          </div>
          <ul className="space-y-4">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm font-semibold text-dark leading-tight">
                <span className="text-success shrink-0 font-bold">#</span>
                {s}
              </li>
            ))}
          </ul>
        </section>}

        {/* Weaknesses */}
        {weaknesses.length > 0 && <section className="bg-surface retro-panel p-8">
          <div className="flex items-center gap-3 mb-6 bg-danger/15 p-3 inline-flex">
            <AlertTriangle size={22} strokeWidth={2} className="text-danger" />
            <h3 className="font-bold uppercase text-xs text-danger font-heading">Area yang Perlu Ditingkatkan</h3>
          </div>
          <ul className="space-y-4">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex gap-3 text-sm font-semibold text-dark leading-tight">
                <span className="text-danger shrink-0 font-bold">!</span>
                {w}
              </li>
            ))}
          </ul>
        </section>}

        {/* Actionable Tips */}
        {actionableTips.length > 0 && <section className="bg-surface retro-panel p-8 col-span-full">
          <div className="flex items-center gap-3 mb-8 bg-primary/15 p-3 inline-flex">
            <Lightbulb size={22} strokeWidth={2} className="text-primary" />
            <h3 className="font-bold uppercase text-xs text-primary font-heading">Tips Closing</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {actionableTips.map((tip, i) => (
              <div key={i} className="flex gap-4 p-5 border-2 border-primary/15 bg-primary/[0.05] hover:bg-primary/[0.08] transition-colors">
                <div className="w-10 h-10 bg-primary text-dark flex items-center justify-center shrink-0 text-sm font-bold">
                  {i + 1}
                </div>
                <p className="text-sm font-semibold text-dark leading-tight">{tip}</p>
              </div>
            ))}
          </div>
        </section>}

        {skillScores.length > 0 && (
          <section className="bg-surface retro-panel p-8 col-span-full">
            <div className="flex items-center gap-3 mb-8 bg-warning/15 p-3 inline-flex">
              <Target size={22} strokeWidth={2} className="text-warning" />
              <h3 className="font-bold uppercase text-xs text-warning font-heading">Rincian Skill</h3>
            </div>
            {showEvidenceQuality && (
              <div className="mb-6 border-l-4 border-success bg-success/[0.07] px-4 py-3 text-xs font-semibold leading-relaxed">
                {typeof evidenceAccepted === 'number' && evidenceAccepted > 0 && (
                  <span>Evaluasi menggunakan {evidenceAccepted} bukti percakapan yang tervalidasi.</span>
                )}
                {typeof evidenceRejected === 'number' && evidenceRejected > 0 && (
                  <span className="block">{evidenceRejected} referensi yang tidak sesuai transkrip telah diabaikan.</span>
                )}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-5">
              {skillScores.map((skill) => {
                const score = Number.isFinite(skill.score) ? Math.max(0, Math.min(100, skill.score)) : 0
                const evidence = Array.isArray(skill.evidence)
                  ? skill.evidence.filter(item => typeof item === 'string' && item.trim()).slice(0, 3)
                  : []
                return (
                <div key={skill.skill} className="p-4 border-2 border-dark/10 bg-bg space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase font-heading">
                    <span>{skill.skill}</span>
                    <span>{score}/100</span>
                  </div>
                  <div
                    className="h-3 bg-dark/10 border border-dark/20"
                    role="progressbar"
                    aria-label={`Skor ${skill.skill}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                  >
                    <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                  </div>
                  {evidence.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="text-[10px] font-bold uppercase font-heading text-muted">Bukti percakapan</div>
                      <ul className="space-y-2">
                        {evidence.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex gap-2 text-xs font-semibold text-muted leading-tight">
                            <span className="text-primary font-bold shrink-0" aria-hidden="true">#</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </section>
        )}

        {suggestedResponses.length > 0 && (
          <section className="bg-surface retro-panel p-8 col-span-full">
            <div className="flex items-center gap-3 mb-8 bg-success/15 p-3 inline-flex">
              <Lightbulb size={22} strokeWidth={2} className="text-success" />
              <h3 className="font-bold uppercase text-xs text-success font-heading">Respon yang Disarankan</h3>
            </div>
            <ul className="space-y-3">
              {suggestedResponses.map((response, i) => (
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
