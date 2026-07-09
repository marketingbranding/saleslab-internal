'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { SalesScenario, getConsumerResponse } from "@/lib/gemini"
import { Send, User, Bot, Loader2, StopCircle } from "lucide-react"
import { SyncIndicator } from "@/components/SyncIndicator"
import { useFrustration } from "@/hooks/useFrustration"
import { FrustrationMeter } from "@/components/FrustrationMeter"
import ConfirmDialog from "@/components/ConfirmDialog"

interface Message {
  role: "user" | "model"
  text: string
}

interface ChatInterfaceProps {
  scenario: SalesScenario
  salespersonName: string
  onFinish: (transcript: Message[]) => void
  onExit: () => void
  frustrationSensitivity?: number
}

export function ChatInterface({ scenario, salespersonName, onFinish, onExit, frustrationSensitivity = 5 }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [showEndConfirm, setShowEndConfirm] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)
  const lastRequestTimeRef = React.useRef(0)
  const requestCooldownRef = React.useRef(1000)

  const { frustration, hangUp, lastReasons, analyzeMessage, reset: resetFrustration } = useFrustration(
    { patience: scenario.patience, sensitivity: frustrationSensitivity },
    {
      onHangUp: () => {
        // Disable input will be handled by hangUp state
        setTimeout(() => {
          if (isMountedRef.current) {
            onFinish(messagesRef.current)
          }
        }, 1500)
      }
    }
  )

  const messagesRef = React.useRef<Message[]>([])

  React.useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      resetFrustration()
    }
  }, [resetFrustration])

  React.useEffect(() => {
    const initChat = async () => {
      if (scenario.firstSpeaker === 'AI') {
        setIsTyping(true)
        const controller = new AbortController()
        abortControllerRef.current = controller

        try {
          const initialResponse = await getConsumerResponse(scenario, [], controller.signal, 'text')
          if (initialResponse && isMountedRef.current) {
            setMessages([{ role: "model", text: initialResponse }])
          }
        } catch (error: any) {
          if (error?.message !== 'Aborted' && isMountedRef.current) {
            console.error(error)
          }
        } finally {
          if (isMountedRef.current) {
            setIsTyping(false)
          }
        }
      }
    }
    initChat()
  }, [scenario])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isTyping || hangUp) return

    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    if (timeSinceLastRequest < requestCooldownRef.current) return

    abortControllerRef.current?.abort()

    const userMessage = input.trim()
    setInput("")

    const newMessages: Message[] = [...messages, { role: "user", text: userMessage }]
    setMessages(newMessages)

    setIsTyping(true)
    lastRequestTimeRef.current = Date.now()

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const history = newMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }))

      const response = await getConsumerResponse(scenario, history, controller.signal, 'text')
      if (response && isMountedRef.current) {
        setMessages(prev => [...prev, { role: "model", text: response }])
        // Analyze user message for frustration
        analyzeMessage(userMessage, response)
      }
    } catch (error: any) {
      if (error?.message !== 'Aborted' && isMountedRef.current) {
        console.error(error)
        setMessages(prev => [...prev, { role: "model", text: "Maaf, saya mengalami kendala. Silakan coba lagi." }])
      }
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false)
      }
    }
  }

  return (
    <div className="retro-panel flex flex-col h-[75vh] bg-surface border-3 border-dark/15 overflow-hidden">
      {/* Header */}
      <div className="retro-divider p-6 bg-surface border-b-[3px] border-dark/15 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary text-black flex items-center justify-center font-bold text-xl">
            AI
          </div>
          <div>
            <h3 className="font-bold text-lg leading-none">{scenario.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-muted uppercase font-semibold">Status: Negosiasi Aktif</p>
              <SyncIndicator status={isTyping ? 'syncing' : 'synced'} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FrustrationMeter value={frustration} reasons={lastReasons} compact />
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-5 py-2 bg-danger text-white font-bold text-xs uppercase flex items-center gap-2"
          >
            <StopCircle size={14} strokeWidth={2.5} />
            AKHIRI Sesi
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && scenario.firstSpeaker === 'Sales' && (
            <div className="flex justify-center flex-col items-center gap-4 py-12 text-muted">
               <User size={32} strokeWidth={1.5} />
               <p className="text-sm font-semibold uppercase">Giliran Anda untuk memulai percakapan...</p>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
                <p className={`text-[10px] font-bold uppercase ${m.role === 'user' ? 'text-right' : 'text-left'} text-muted`}>
                  {m.role === 'user' ? `${salespersonName} (Sales)` : `${scenario.name} (Client)`}
                </p>
                <div className={`p-3 sm:p-4 text-sm font-medium leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-black border-2 border-black'
                    : 'bg-surface border-2 border-dark/15 text-dark'
                }`}>
                  {m.text}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center bg-surface border-2 border-dark/15 text-dark p-4">
                <Loader2 className="animate-spin" size={16} strokeWidth={2.5} />
                <span className="text-xs font-bold uppercase text-muted">Mengetik...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="bg-primary/[0.04] border-t-[3px] border-dark/15 px-6 py-2">
         <p className="text-[10px] font-bold uppercase text-primary">Tips: Fokus pada Goal — {scenario.target}</p>
      </div>
      <form onSubmit={handleSend} className="p-6 bg-surface border-t-[3px] border-dark/15 flex gap-4 items-center">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={hangUp}
          placeholder={messages.length === 0 && scenario.firstSpeaker === 'Sales' ? "Mulai dengan menyapa pelanggan..." : "Ketik respon Anda di sini..."}
          className="flex-1 bg-surface retro-input px-6 py-4 text-base"
        />
        <button
          disabled={!input.trim() || isTyping || hangUp}
          className="w-14 h-14 bg-primary text-black flex items-center justify-center disabled:bg-text/10 disabled:text-dark/30"
        >
          <Send size={20} strokeWidth={2.5} />
        </button>
      </form>

      {/* Footer */}
      <div className="px-8 py-3 bg-bg border-t-[3px] border-dark flex items-center justify-end text-[10px] text-muted/60 font-bold uppercase">
        <span>v2.5 TRAINING HUB</span>
      </div>

      <ConfirmDialog
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={() => onFinish(messages)}
        title="Akhiri Sesi?"
        message="Yakin ingin mengakhiri sesi ini? Analisis akan dibuat berdasarkan percakapan sejauh ini."
        confirmLabel="Akhiri Sesi"
        cancelLabel="Lanjutkan"
        variant="danger"
      />
    </div>
  )
}
