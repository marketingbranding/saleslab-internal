'use client'

import * as React from "react"
import { motion } from "motion/react"
import { SalesScenario, analyzePerformance } from "@/lib/gemini"
import { Trophy, Target, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight, Home, RefreshCcw } from "lucide-react"
import confetti from "canvas-confetti"
import { db, handleFirestoreError, OperationType } from "@/lib/firebase"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/AuthContext"
import { SyncIndicator } from "@/components/SyncIndicator"

interface FeedbackData {
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  keyObjectionsHandled: string[]
  missedOpportunities: string[]
  verdict: string
  actionableTips: string[]
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

  React.useEffect(() => {
    const getFeedback = async () => {
      try {
        setError(null)
        setLoading(true)
        const data = await analyzePerformance(scenario, transcript)
        setFeedback(data)
        if (data.overallScore >= 70) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#000', '#3B82F6', '#10B981']
          })
        }

        // Save to Firebase if user is logged in
        if (user && !saved) {
          const path = 'sessions'
          const sessionId = `session_${Date.now()}`
          try {
            await setDoc(doc(db, path, sessionId), {
              scenarioId: scenario.id,
              salespersonName,
              transcript,
              score: data.overallScore,
              feedback: data,
              userId: user.uid,
              createdAt: serverTimestamp()
            })
            setSaved(true)
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, path)
          }
        }
      } catch (err: any) {
        console.error("Feedback error:", err)
        if (err?.message?.includes('503') || err?.message?.includes('high demand')) {
          setError("Server sedang sibuk. Mohon tunggu sebentar atau coba lagi nanti.")
        } else {
          setError("Gagal menganalisis performa. Silakan coba lagi.")
        }
      } finally {
        setLoading(false)
      }
    }
    getFeedback()
  }, [scenario, transcript, user, salespersonName])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="p-4 bg-black text-white rounded-full"
        >
          <Target size={32} />
        </motion.div>
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold">Analyzing Sales Tactics...</h3>
          <SyncIndicator status="syncing" />
        </div>
        <p className="text-gray-500 text-sm">Evaluating transcript against performance benchmarks.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 text-center max-w-md mx-auto px-6">
        <div className="p-4 bg-red-100 text-red-600 rounded-full border-4 border-black">
          <AlertTriangle size={48} strokeWidth={3} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black uppercase tracking-tighter italic">Yah, Kapasitas Penuh!</h3>
          <p className="text-gray-600 font-bold leading-tight">{error}</p>
        </div>
        <SyncIndicator status="error" />
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 px-8 py-3 bg-black text-white font-black uppercase italic border-4 border-black hover:bg-white hover:text-black transition-all"
          >
            Refresh Halaman
          </button>
          <button 
            onClick={onHome}
            className="flex-1 px-8 py-3 border-4 border-black font-black uppercase italic hover:bg-black hover:text-white transition-all"
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  if (!feedback) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-12 pb-24"
    >
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tighter italic">HASIL ANALISIS</h2>
        <SyncIndicator status={saved ? 'synced' : 'syncing'} />
      </div>

      {/* Hero Score */}
      <div className="bg-black text-white border-8 border-black p-12 flex flex-col md:flex-row items-center gap-16 shadow-[24px_24px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="relative">
          <div className="w-48 h-48 border-8 border-white flex items-center justify-center flex-col transform -rotate-3 bg-black">
            <span className="text-7xl font-black italic tracking-tighter leading-none">{feedback.overallScore}</span>
            <span className="text-[12px] font-black uppercase tracking-widest opacity-70 mt-2">SKOR TOTAL</span>
          </div>
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 border-4 border-black flex items-center justify-center text-black rotate-12">
            <Trophy size={24} strokeWidth={3} />
          </div>
        </div>
        
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none underline decoration-8 decoration-yellow-400 underline-offset-8">
            Analisis <br /> Performa Anda
          </h2>
          <p className="text-xl font-bold italic opacity-80 leading-tight border-l-8 border-white pl-6">
            &quot;{feedback.verdict}&quot;
          </p>
          <div className="flex gap-6 justify-center md:justify-start pt-4">
            <button 
              onClick={onRestart}
              className="px-10 py-4 bg-white text-black border-4 border-black font-black uppercase tracking-tighter text-lg hover:bg-yellow-400 transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-2 active:translate-y-2 active:shadow-none flex items-center gap-2"
            >
              <RefreshCcw size={20} strokeWidth={3} />
              Coba Lagi
            </button>
            <button 
              onClick={onHome}
              className="px-10 py-4 border-4 border-white font-black uppercase tracking-tighter text-lg hover:bg-white hover:text-black transition-all flex items-center gap-2"
            >
              <Home size={20} strokeWidth={3} />
              Main Menu
            </button>
          </div>
        </div>
      </div>

      {/* Grid Details */}
      <div className="grid md:grid-cols-2 gap-10">
        {/* Strengths */}
        <section className="bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-4 mb-8 bg-green-400 border-4 border-black p-4 inline-flex">
            <CheckCircle2 size={24} strokeWidth={3} className="text-black" />
            <h3 className="font-black uppercase tracking-widest text-xs italic text-black">Kelebihan Anda</h3>
          </div>
          <ul className="space-y-6">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-4 text-lg font-black italic tracking-tight leading-none uppercase">
                <span className="text-green-500 shrink-0">#</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* Weaknesses */}
        <section className="bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(239,68,68,0.2)]">
          <div className="flex items-center gap-4 mb-8 bg-red-400 border-4 border-black p-4 inline-flex">
            <AlertTriangle size={24} strokeWidth={3} className="text-black" />
            <h3 className="font-black uppercase tracking-widest text-xs italic text-black">Area Evaluasi</h3>
          </div>
          <ul className="space-y-6">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-4 text-lg font-black italic tracking-tight leading-none uppercase">
                <span className="text-red-500 shrink-0">!</span>
                {w}
              </li>
            ))}
          </ul>
        </section>

        {/* Actionable Tips */}
        <section className="bg-white border-8 border-black p-8 col-span-full shadow-[12px_12px_0px_0px_rgba(59,130,246,0.2)]">
          <div className="flex items-center gap-4 mb-10 bg-blue-500 border-4 border-black p-4 inline-flex">
            <Lightbulb size={24} strokeWidth={3} className="text-black" />
            <h3 className="font-black uppercase tracking-widest text-xs italic text-black">Tips Sukses Closing</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {feedback.actionableTips.map((tip, i) => (
              <div key={i} className="flex gap-6 p-6 border-4 border-black bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="w-10 h-10 border-4 border-black bg-black text-white flex items-center justify-center shrink-0 text-xl font-black italic">
                  {i + 1}
                </div>
                <p className="text-lg font-bold italic uppercase tracking-tighter leading-tight">{tip}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  )
}
