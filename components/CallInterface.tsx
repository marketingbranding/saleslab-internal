'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { SalesScenario, getGenAI } from "@/lib/gemini"
import { getSettings } from "@/lib/firebase"
import { Modality } from "@google/genai"
import { PhoneOff, Mic, MicOff, Volume2, User, AlertCircle } from "lucide-react"
import { floatTo16BitPCM, int16ArrayToBase64 } from "@/lib/audio-utils"
import { SyncIndicator } from "@/components/SyncIndicator"

interface CallInterfaceProps {
  scenario: SalesScenario
  salespersonName: string
  onFinish: (transcript: { role: 'user' | 'model'; text: string }[]) => void
  onExit: () => void
}

export function CallInterface({ scenario, salespersonName, onFinish, onExit }: CallInterfaceProps) {
  const [isConnected, setIsConnected] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isAITalking, setIsAITalking] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[]>([])

  const audioContextRef = React.useRef<AudioContext | null>(null)
  const sessionRef = React.useRef<any>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const processorRef = React.useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = React.useRef<Int16Array[]>([])
  const isPlayingRef = React.useRef(false)
  const playNextInQueueRef = React.useRef<() => Promise<void>>(async () => {})
  const isMountedRef = React.useRef(true)
  const lastTranscriptRef = React.useRef<{ role: 'user' | 'model'; text: string } | null>(null)
  const transcriptScrollRef = React.useRef<HTMLDivElement>(null)

  const getTextFromParts = (parts?: Array<{ text?: string } | any>) => {
    if (!parts?.length) return undefined
    const textParts = parts
      .map(part => {
        if (typeof part?.text === 'string') return part.text.trim()
        if (typeof part === 'string') return part.trim()
        return undefined
      })
      .filter((text): text is string => !!text)
    return textParts.length ? textParts.join(' ') : undefined
  }

  const appendTranscript = (role: 'user' | 'model', text: string) => {
    if (!isMountedRef.current) return

    const lastTranscript = lastTranscriptRef.current
    if (lastTranscript?.role === role && lastTranscript?.text === text) {
      return
    }

    lastTranscriptRef.current = { role, text }

    setTranscript(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === role && last.text === text) return prev
      const newTranscript = [...prev, { role, text }]
      setTimeout(() => {
        transcriptScrollRef.current?.scrollTo({
          top: transcriptScrollRef.current?.scrollHeight || 0,
          behavior: 'smooth'
        })
      }, 0)
      return newTranscript
    })
  }

  const stopAudio = React.useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    sessionRef.current?.close()

    streamRef.current = null
    processorRef.current = null
    audioContextRef.current = null
    sessionRef.current = null

    if (isMountedRef.current) {
      setIsConnected(false)
      setIsAITalking(false)
    }
  }, [])

  React.useEffect(() => {
    playNextInQueueRef.current = async () => {
      if (!isMountedRef.current) return

      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false
        setIsAITalking(false)
        return
      }

      isPlayingRef.current = true
      setIsAITalking(true)
      const pcm16 = audioQueueRef.current.shift()!

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0
      }

      const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000)
      buffer.getChannelData(0).set(float32)

      const source = audioContextRef.current.createBufferSource()
      source.buffer = buffer
      source.connect(audioContextRef.current.destination)
      source.onended = () => {
        if (isMountedRef.current) {
          playNextInQueueRef.current()
        }
      }
      source.start()
    }
  })

  const startCall = React.useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (isMountedRef.current) {
          setError("Audio Call membutuhkan HTTPS. Pastikan Anda mengakses via HTTPS (ngrok menyediakan HTTPS).")
        }
        return
      }

      const settings = await getSettings()
      if (settings.modelProvider === 'ollama') {
        if (isMountedRef.current) {
          setError("Audio Call saat ini hanya didukung oleh Gemini. Ganti ke Gemini di Settings atau gunakan Text Chat.")
        }
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ai = await getGenAI()

      let session: any = null
      sessionRef.current = {
        sendRealtimeInput: (data: any) => {
          if (session) {
            session.sendRealtimeInput(data)
          }
        },
        close: () => {
          if (session) {
            session.close()
          }
        }
      }

      console.log('Starting Live API session with model: gemini-3.1-flash-live-preview')

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log('Live API WebSocket connected')
            if (!isMountedRef.current) return

            setIsConnected(true)

            if (!streamRef.current) return

            audioContextRef.current = new AudioContext({ sampleRate: 16000 })
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)

            processor.onaudioprocess = (e) => {
              if (isMuted || !sessionRef.current || !isMountedRef.current) return

              const inputData = e.inputBuffer.getChannelData(0)
              const pcm16 = floatTo16BitPCM(inputData)
              const base64Audio = int16ArrayToBase64(pcm16)

              sessionRef.current.sendRealtimeInput({
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Audio
                }
              })
            }

            source.connect(processor)
            processor.connect(audioContextRef.current.destination)
            processorRef.current = processor
          },
          onmessage: async (message: any) => {
            if (!isMountedRef.current) return

            console.log('Live API message:', JSON.stringify(message, null, 2))

            // Handle audio output
            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data
              const binaryString = atob(base64Audio)
              const len = binaryString.length
              const bytes = new Int16Array(len / 2)
              for (let i = 0; i < len; i += 2) {
                bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i)
              }
              audioQueueRef.current.push(bytes)
              if (!isPlayingRef.current && isMountedRef.current) {
                playNextInQueueRef.current()
              }
            }

            // Extract AI text from parts
            const modelParts = message.serverContent?.modelTurn?.parts || []
            for (const part of modelParts) {
              if (part?.text?.trim() && isMountedRef.current) {
                const text = part.text.trim()
                console.log('AI text:', text)
                appendTranscript('model', text)
              }
            }

            // Extract user text from parts
            const userParts = message.serverContent?.userTurn?.parts || []
            for (const part of userParts) {
              if (part?.text?.trim() && isMountedRef.current) {
                const text = part.text.trim()
                console.log('User text:', text)
                appendTranscript('user', text)
              }
            }

            // Fallback extraction
            const fallbackModelText = getTextFromParts(modelParts)
            if (fallbackModelText && isMountedRef.current) {
              console.log('AI text (fallback):', fallbackModelText)
              appendTranscript('model', fallbackModelText)
            }

            const fallbackUserText = getTextFromParts(userParts)
            if (fallbackUserText && isMountedRef.current) {
              console.log('User text (fallback):', fallbackUserText)
              appendTranscript('user', fallbackUserText)
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = []
              isPlayingRef.current = false
              if (isMountedRef.current) {
                setIsAITalking(false)
              }
            }
          },
          onclose: () => {
            console.log('Live API WebSocket closed')
            if (isMountedRef.current) {
              setIsConnected(false)
              stopAudio()
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err)
            if (isMountedRef.current) {
              setError("Gagal menyambung ke server audio: " + (err?.message || err?.toString() || 'Unknown error'))
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: scenario.gender === "Wanita" ? "Zephyr" : "Charon"
              }
            },
          },
          systemInstruction: {
            parts: [{
              text: `
            Anda sedang melakukan panggilan telepon sebagai ${scenario.name}.
            PROFIL: ${scenario.consumerProfile}.
            AGRESIVITAS: ${scenario.aggressiveness}/10.
            KESABARAN: ${scenario.patience}/10.
            GAYA RESPON: ${scenario.responseStyle}.

            GOAL SALES: ${scenario.target}.

            Berikan respon singkat dan natural layaknya di telepon.
            JANGAN memberikan feedback atau analisis saat panggilan berlangsung.
            Jika sales berhasil meyakinkan Anda sesuai target, akhiri panggilan dengan positif.
          `
            }]
          },
        },
      })

      sessionRef.current = session
    } catch (err: any) {
      console.error('CallInterface error:', err)
      console.error('Error name:', err?.name)
      console.error('Error message:', err?.message)

      let errorMessage = "Gagal mengakses mikrofon."

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMessage = "Izin mikrofon ditolak. Izinkan akses mikrofon di browser Anda."
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = "Mikrofon tidak ditemukan. Pastikan perangkat memiliki mikrofon."
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = "Mikrofon sedang digunakan oleh aplikasi lain."
      } else if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        errorMessage = "Mikrofon tidak mendukung format yang diminta."
      } else if (err?.message?.includes('secure context') || err?.message?.includes('HTTPS')) {
        errorMessage = "Audio Call membutuhkan HTTPS. Gunakan URL HTTPS dari ngrok."
      } else if (err?.message?.includes('API key') || err?.message?.includes('GEMINI')) {
        errorMessage = "API key Gemini belum dikonfigurasi. Hubungi admin untuk setup."
      } else {
        errorMessage = `Error: ${err?.message || 'Unknown'} (name: ${err?.name || 'none'})`
      }

      if (isMountedRef.current) {
        setError(errorMessage)
      }
    }
  }, [scenario, isMuted, stopAudio])

  React.useEffect(() => {
    isMountedRef.current = true
    Promise.resolve().then(() => startCall())
    return () => {
      isMountedRef.current = false
      stopAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-[75vh] bg-black border-4 border-black overflow-hidden relative">
      <AnimatePresence>
        {isAITalking && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-yellow-400 rounded-full blur-[100px] z-0"
          />
        )}
      </AnimatePresence>

      <div className="p-6 bg-white/10 backdrop-blur-md border-b-4 border-black flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 border-4 border-black ${isAITalking ? 'bg-yellow-400' : 'bg-black'} flex items-center justify-center text-white italic font-black text-xl transition-colors`}>
            AI
          </div>
          <div>
            <h3 className="font-black italic text-xl uppercase tracking-tighter leading-none text-white">{scenario.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                {isConnected ? 'Connected • Panggilan Berlangsung' : 'Connecting...'}
              </p>
              <SyncIndicator status={isConnected ? (isAITalking ? 'syncing' : 'synced') : 'syncing'} />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           {error && (
             <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-tighter">
                <AlertCircle size={14} />
                {error}
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12 z-10">
        <div className="relative">
          <motion.div 
            animate={isAITalking ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-48 h-48 rounded-full border-8 border-white flex items-center justify-center overflow-hidden bg-gray-900"
          >
             <User size={80} className="text-white opacity-20" />
          </motion.div>
          {isAITalking && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 font-black italic uppercase text-xs border-2 border-black">
              TALKING...
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">{scenario.title}</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic underline decoration-yellow-400 underline-offset-4 decoration-2">
            Goal: {scenario.target}
          </p>
        </div>
      </div>

      <div className="absolute top-32 left-8 right-8 flex flex-col gap-2 z-10 pointer-events-none">
        <div
          ref={transcriptScrollRef}
          className="max-h-[200px] overflow-y-auto scrollbar-hide flex flex-col gap-2 bg-black/60 backdrop-blur-md p-4 rounded-xl border-2 border-white/20 pointer-events-auto shadow-2xl"
        >
           <div className="flex items-center gap-2 mb-2 sticky top-0 bg-black/60 backdrop-blur-md pb-2 border-b border-white/10">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">Live Transcript</span>
           </div>
           {transcript.length === 0 ? (
             <p className="text-[10px] font-bold text-gray-500 italic uppercase">Menunggu percakapan...</p>
           ) : (
             transcript.map((t, i) => (
               <motion.div
                 key={`${i}-${t.text.slice(0, 10)}`}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 className={`p-3 border-l-4 ${t.role === 'user' ? 'border-yellow-400 bg-yellow-400/10' : 'border-white bg-white/5'}`}
               >
                 <p className={`text-[10px] font-black uppercase tracking-tighter ${t.role === 'user' ? 'text-yellow-400' : 'text-white'}`}>
                    {t.role === 'user' ? salespersonName : scenario.name}
                 </p>
                 <p className="text-sm font-medium text-white/90 leading-tight">
                    {t.text}
                 </p>
               </motion.div>
             ))
           )}
        </div>
      </div>

      <div className="p-12 bg-gradient-to-t from-black to-transparent flex justify-center items-center gap-12 z-10">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 border-red-500' : 'hover:bg-white hover:text-black text-white'}`}
        >
          {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
        </button>

        <button 
          onClick={() => {
            stopAudio()
            onFinish(transcript)
          }}
          className="w-24 h-24 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-black transition-all shadow-[0px_0px_30px_rgba(220,38,38,0.5)]"
        >
          <PhoneOff size={40} className="text-white" />
        </button>

        <div className="w-20 h-20 flex items-center justify-center text-white opacity-50">
           <Volume2 size={32} />
        </div>
      </div>
      
      <div className="px-8 py-3 bg-white/5 flex items-center justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest italic z-10">
        <span>ENCRYPTED AI CALL</span>
        <button 
          onClick={onExit}
          className="hover:text-white transition-colors"
        >
          FORCE EXIT
        </button>
      </div>
    </div>
  )
}
