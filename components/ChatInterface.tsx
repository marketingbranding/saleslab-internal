'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { SalesScenario, getConsumerResponse } from "@/lib/gemini"
import { Send, User, Bot, Loader2, StopCircle, RefreshCw } from "lucide-react"
import { SyncIndicator } from "@/components/SyncIndicator"

interface Message {
  role: "user" | "model"
  text: string
}

interface ChatInterfaceProps {
  scenario: SalesScenario
  salespersonName: string
  onFinish: (transcript: Message[]) => void
  onExit: () => void
}

export function ChatInterface({ scenario, salespersonName, onFinish, onExit }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const isMountedRef = React.useRef(true)
  const lastRequestTimeRef = React.useRef(0)
  const requestCooldownRef = React.useRef(1000) // 1 second cooldown

  // Cleanup on unmount
  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
    }
  }, [])

  // Initial greeting
  React.useEffect(() => {
    const initChat = async () => {
      // Only AI speaks first if firstSpeaker is 'AI'
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
          // Suppress aborted errors - they're expected when component unmounts
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
    if (!input.trim() || isTyping) return

    // Prevent rapid successive requests
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    if (timeSinceLastRequest < requestCooldownRef.current) {
      return // Ignore requests that come too quickly
    }

    // Cancel any ongoing request
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
      }
    } catch (error: any) {
      // Suppress aborted errors - they're expected when component unmounts
      if (error?.message !== 'Aborted' && isMountedRef.current) {
        console.error(error)
        setMessages(prev => [...prev, { role: "model", text: "I'm sorry, I'm having trouble responding right now. Please try again." }])
      }
    } finally {
      if (isMountedRef.current) {
        setIsTyping(false)
      }
    }
  }

  return (
    <div className="flex flex-col h-[75vh] bg-gray-50 border-4 border-black overflow-hidden shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="p-6 bg-white border-b-4 border-black flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border-4 border-black bg-black flex items-center justify-center text-white italic font-black text-xl">
            AI
          </div>
          <div>
            <h3 className="font-black italic text-xl uppercase tracking-tighter leading-none">{scenario.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Status: Active Negotiation</p>
              <SyncIndicator status={isTyping ? 'syncing' : 'synced'} />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onFinish(messages)}
            className="px-6 py-2 bg-red-500 hover:bg-black text-white border-4 border-black italic font-black text-xs uppercase tracking-tighter transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 flex items-center gap-2"
          >
            <StopCircle size={14} strokeWidth={3} />
            END SESSION
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && scenario.firstSpeaker === 'Sales' && (
            <div className="flex justify-center flex-col items-center gap-4 py-12 text-gray-400 italic">
               <User size={32} strokeWidth={1} />
               <p className="text-sm font-bold uppercase tracking-widest">Waktunya Anda membuka obrolan...</p>
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
                <p className={`text-[10px] font-black uppercase tracking-widest italic ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {m.role === 'user' ? `${salespersonName} (Sales)` : `${scenario.name} (Client)`}
                </p>
                <div className={`p-3 sm:p-5 text-sm sm:text-lg font-bold leading-tight tracking-tight border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  m.role === 'user' 
                    ? 'bg-blue-500 text-white italic' 
                    : 'bg-white text-black italic'
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
              <div className="flex gap-3 items-center bg-black text-white p-4 border-4 border-black italic">
                <Loader2 className="animate-spin" size={16} strokeWidth={3} />
                <span className="text-xs font-black uppercase tracking-widest">Membalas...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="bg-yellow-50 border-t-4 border-black px-6 py-2">
         <p className="text-[10px] font-black uppercase tracking-widest italic">Hint: Fokus ke Goal - {scenario.target}</p>
      </div>
      <form onSubmit={handleSend} className="p-6 bg-white border-t-4 border-black flex gap-4 items-center">
        <input 
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={messages.length === 0 && scenario.firstSpeaker === 'Sales' ? "Mulai sapa calon pembeli..." : "Ketik balasan Anda di sini..."}
          className="flex-1 bg-white border-4 border-black px-6 py-4 font-black uppercase text-xl placeholder-gray-300 focus:outline-none focus:bg-yellow-50 transition-all"
        />
        <button 
          disabled={!input.trim() || isTyping}
          className="w-16 h-16 bg-black text-white border-4 border-black flex items-center justify-center hover:bg-white hover:text-black disabled:bg-gray-200 disabled:border-gray-300 disabled:cursor-not-allowed transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-2 active:translate-y-2"
        >
          <Send size={24} strokeWidth={3} />
        </button>
      </form>
      
      {/* Footer Info */}
      <div className="px-8 py-3 bg-black border-t-4 border-black flex items-center justify-end text-[10px] text-gray-400 font-black uppercase tracking-widest italic">
        <span className="text-white">v2.5 TRAINING HUB</span>
      </div>
    </div>
  )
}
