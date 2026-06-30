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

  const appendTranscript = (role: 'user' | 'model', text: string) => {
    if (!isMountedRef.current) return

    if (lastTranscriptRef.current?.role === role && lastTranscriptRef.current?.text === text) {
      return
    }

    lastTranscriptRef.current = { role, text }

    setTranscript(prev => {
      const last = prev[prev.length - 1]

      if (last?.role === role) {
        if (last.text === text) return prev
        const updated = [...prev]
        if (text.startsWith(last.text)) {
          updated[updated.length - 1] = { ...last, text }
        } else {
          updated[updated.length - 1] = { ...last, text: last.text + ' ' + text }
        }
        setTimeout(() => {
          transcriptScrollRef.current?.scrollTo({
            top: transcriptScrollRef.current?.scrollHeight || 0,
            behavior: 'smooth'
          })
        }, 0)
        return updated
      }

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

            // Extract transcriptions from Live API
            const sc = message.serverContent

            if (sc?.inputTranscription?.text?.trim() && isMountedRef.current) {
              const text = sc.inputTranscription.text.trim()
              console.log('INPUT:', text)
              appendTranscript('user', text)
            }

            if (sc?.outputTranscription?.text?.trim() && isMountedRef.current) {
              const text = sc.outputTranscription.text.trim()
              console.log('OUTPUT:', text)
              appendTranscript('model', text)
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

      <div className="p-4 sm:p-6 bg-white/10 backdrop-blur-md border-b-4 border-black flex items-center justify-between z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 border-4 border-black ${isAITalking ? 'bg-yellow-400' : 'bg-black'} flex items-center justify-center text-white italic font-black text-base sm:text-xl transition-colors shrink-0`}>
            AI
          </div>
          <div className="min-w-0">
            <h3 className="font-black italic text-base sm:text-xl uppercase tracking-tighter leading-none text-white truncate">{scenario.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-widest font-black truncate">
                {isConnected ? 'Connected • Panggilan Berlangsung' : 'Connecting...'}
              </p>
              <SyncIndicator status={isConnected ? (isAITalking ? 'syncing' : 'synced') : 'syncing'} />
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 shrink-0">
           {error && (
             <div className="flex items-center gap-1 sm:gap-2 text-red-500 font-bold text-[10px] sm:text-xs uppercase tracking-tighter">
                <AlertCircle size={12} />
                <span className="hidden sm:inline">{error}</span>
             </div>
           )}
        </div>
      </div>

      <div
        ref={transcriptScrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 z-10 bg-black/40"
      >
        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-black pb-2 border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/60 italic">Live Transcript</span>
          <span className="text-[9px] text-gray-500 ml-auto">{transcript.length} pesan</span>
        </div>
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs sm:text-sm font-bold text-gray-500 italic uppercase text-center">Menunggu percakapan...</p>
          </div>
        ) : (
          transcript.map((t, i) => (
            <motion.div
              key={`${i}-${t.text.slice(0, 10)}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 sm:p-4 border-l-4 ${t.role === 'user' ? 'border-yellow-400 bg-yellow-400/10' : 'border-white bg-white/5'}`}
            >
              <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tighter mb-1 ${t.role === 'user' ? 'text-yellow-400' : 'text-white'}`}>
                 {t.role === 'user' ? salespersonName : scenario.name}
              </p>
              <p className="text-sm sm:text-base font-medium text-white/90 leading-relaxed">
                 {t.text}
              </p>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 sm:py-4 px-4 z-10 border-t border-white/10 bg-black/60">
        <div className="relative shrink-0">
          <motion.div 
            animate={isAITalking ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-4 border-white flex items-center justify-center overflow-hidden bg-gray-900"
          >
             <User size={20} className="text-white opacity-20 sm:block hidden" />
             <User size={14} className="text-white opacity-20 sm:hidden" />
          </motion.div>
          {isAITalking && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-1.5 py-0.5 font-black italic uppercase text-[7px] sm:text-[8px] border border-black whitespace-nowrap">
              TALKING...
            </div>
          )}
        </div>
        <div className="text-center min-w-0">
          <h2 className="text-sm sm:text-lg font-black italic uppercase tracking-tighter text-white truncate">{scenario.title}</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px] italic truncate">Goal: {scenario.target}</p>
        </div>
      </div>

      <div className="p-6 sm:p-12 bg-gradient-to-t from-black to-transparent flex justify-center items-center gap-8 sm:gap-12 z-10">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full border-4 border-white flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 border-red-500' : 'hover:bg-white hover:text-black text-white'}`}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button 
          onClick={() => {
            stopAudio()
            onFinish(transcript)
          }}
          className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-red-600 border-4 border-white flex items-center justify-center hover:bg-black transition-all shadow-[0px_0px_30px_rgba(220,38,38,0.5)]"
        >
          <PhoneOff size={28} className="text-white" />
        </button>

        <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center text-white opacity-50">
           <Volume2 size={20} />
        </div>
      </div>
      
      <div className="px-4 sm:px-8 py-2 sm:py-3 bg-white/5 flex items-center justify-between text-[8px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest italic z-10">
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
