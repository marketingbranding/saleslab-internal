'use client'

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { SalesScenario, getGenAI } from "@/lib/gemini"
import { getSettings } from "@/lib/firebase"
import { Modality } from "@google/genai"
import { PhoneOff, Mic, MicOff, Volume2, User, AlertCircle, RefreshCcw } from "lucide-react"
import { floatTo16BitPCM, int16ArrayToBase64 } from "@/lib/audio-utils"
import { SyncIndicator } from "@/components/SyncIndicator"
import { useFrustration } from "@/hooks/useFrustration"
import { FrustrationMeter } from "@/components/FrustrationMeter"
import ConfirmDialog from "@/components/ConfirmDialog"

interface CallInterfaceProps {
  scenario: SalesScenario
  salespersonName: string
  onFinish: (transcript: { role: 'user' | 'model'; text: string }[]) => void
  onExit: () => void
  frustrationSensitivity?: number
}

type CallStatus = 'connecting' | 'connected' | 'ai-speaking' | 'disconnected' | 'error' | 'ended'

const VAD_THRESHOLD = 0.0035
const VAD_HANGOVER_MS = 700

export function CallInterface({ scenario, salespersonName, onFinish, onExit, frustrationSensitivity = 5 }: CallInterfaceProps) {
  const [isTerhubung, setIsTerhubung] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isAITalking, setIsAITalking] = React.useState(false)
  const [isReconnecting, setIsReconnecting] = React.useState(false)
  const [callStatus, setCallStatus] = React.useState<CallStatus>('connecting')
  const [error, setError] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[]>([])
  const [showEndConfirm, setShowEndConfirm] = React.useState(false)

  const { frustration, hangUp, lastReasons, analyzeMessage, reset: resetFrustration } = useFrustration(
    { patience: scenario.patience, sensitivity: frustrationSensitivity },
    {
      onHangUp: () => {
        setError("Pelanggan menutup telepon karena frustrasi!")
        setTimeout(() => {
          if (isMountedRef.current) {
            stopAudio()
            onFinish(transcriptRef.current)
          }
        }, 1500)
      }
    }
  )

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
  const transcriptRef = React.useRef<{ role: 'user' | 'model'; text: string }[]>([])
  const speechRecognitionRef = React.useRef<any>(null)
  const shouldRestartSpeechRef = React.useRef(false)
  const isUserEndingRef = React.useRef(false)
  const sessionHandleRef = React.useRef<string | null>(null)
  const reconnectCountRef = React.useRef(0)
  const mutedRef = React.useRef(false)
  const connectionIdRef = React.useRef(0)
  const speechHangoverUntilRef = React.useRef(0)

  React.useEffect(() => {
    mutedRef.current = isMuted
  }, [isMuted])

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
      transcriptRef.current = newTranscript

      // Analyze user messages for frustration
      if (role === 'user') {
        const lastAiMsg = [...prev].reverse().find(m => m.role === 'model')
        setTimeout(() => {
          analyzeMessage(text, lastAiMsg?.text ?? null)
        }, 0)
      }

      setTimeout(() => {
        transcriptScrollRef.current?.scrollTo({
          top: transcriptScrollRef.current?.scrollHeight || 0,
          behavior: 'smooth'
        })
      }, 0)
      return newTranscript
    })
  }

  const stopAudio = React.useCallback((closeSession = true) => {
    shouldRestartSpeechRef.current = false
    speechRecognitionRef.current?.stop?.()
    streamRef.current?.getTracks().forEach(track => track.stop())
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    if (closeSession) {
      sessionRef.current?.close()
    }

    streamRef.current = null
    processorRef.current = null
    audioContextRef.current = null
    sessionRef.current = null
    speechRecognitionRef.current = null

    if (isMountedRef.current) {
      setIsTerhubung(false)
      setIsAITalking(false)
      if (closeSession) {
        setCallStatus('ended')
      }
    }
  }, [])

  const startSpeechRecognition = React.useCallback(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition || speechRecognitionRef.current) return

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'id-ID'

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (!result?.isFinal) continue
          const text = result[0]?.transcript?.trim()
          if (text) appendTranscript('user', text)
        }
      }

      recognition.onerror = (event: any) => {
        if (event?.error !== 'no-speech') {
          console.warn('Speech recognition error:', event?.error || event)
        }
      }

      recognition.onend = () => {
        if (shouldRestartSpeechRef.current && isMountedRef.current && !mutedRef.current) {
          try {
            recognition.start()
          } catch {
            // Browser may throw if recognition is already starting.
          }
        }
      }

      speechRecognitionRef.current = recognition
      shouldRestartSpeechRef.current = true
      recognition.start()
    } catch (err) {
      console.warn('Speech recognition unavailable:', err)
    }
  }, [])

  React.useEffect(() => {
    playNextInQueueRef.current = async () => {
      if (!isMountedRef.current) return

      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false
        setIsAITalking(false)
        if (isTerhubung) {
          setCallStatus('connected')
        }
        return
      }

      isPlayingRef.current = true
      setIsAITalking(true)
      setCallStatus('ai-speaking')
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

    const connectionId = connectionIdRef.current + 1
    connectionIdRef.current = connectionId
    if (sessionRef.current || streamRef.current || processorRef.current || audioContextRef.current) {
      stopAudio(true)
    }

    try {
      setError(null)
      setIsReconnecting(false)
      setCallStatus('connecting')
      isUserEndingRef.current = false
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (isMountedRef.current) {
          setError("Panggilan Audio membutuhkan HTTPS. Pastikan Anda mengakses via HTTPS (ngrok menyediakan HTTPS).")
          setCallStatus('error')
        }
        return
      }

      const settings = await getSettings()
      if (settings.modelProvider === 'ollama') {
        if (isMountedRef.current) {
          setError("Panggilan Audio saat ini membutuhkan Gemini. Ganti ke Gemini di Settings atau gunakan Text Chat.")
          setCallStatus('error')
        }
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      startSpeechRecognition()

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
            if (!isMountedRef.current || connectionId !== connectionIdRef.current) return

            setIsTerhubung(true)
            setIsReconnecting(false)
            setCallStatus('connected')
            reconnectCountRef.current = 0

            if (!streamRef.current) return

            audioContextRef.current = new AudioContext({ sampleRate: 16000 })
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1)

            processor.onaudioprocess = (e) => {
              if (mutedRef.current || !sessionRef.current || !isMountedRef.current || connectionId !== connectionIdRef.current) return

              const inputData = e.inputBuffer.getChannelData(0)
              let sum = 0
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i]
              }
              const rms = Math.sqrt(sum / inputData.length)
              const now = Date.now()
              if (rms >= VAD_THRESHOLD) {
                speechHangoverUntilRef.current = now + VAD_HANGOVER_MS
              } else if (now > speechHangoverUntilRef.current) {
                return
              }

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
            if (!isMountedRef.current || connectionId !== connectionIdRef.current) return

            console.log('Live API message:', JSON.stringify(message, null, 2))

            if (message.sessionResumptionUpdate?.newHandle) {
              sessionHandleRef.current = message.sessionResumptionUpdate.newHandle
            }

            const inputTranscription = message.serverContent?.inputTranscription?.text?.trim()
            if (inputTranscription) {
              appendTranscript('user', inputTranscription)
            }

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
                setCallStatus('connected')
              }
            }

            if (message.serverContent?.generationComplete || message.serverContent?.turnComplete) {
              if (audioQueueRef.current.length === 0 && isMountedRef.current) {
                setIsAITalking(false)
                setCallStatus('connected')
              }
            }
          },
          onclose: () => {
            console.log('Live API WebSocket closed')
            if (isMountedRef.current && connectionId === connectionIdRef.current) {
              const wasUserAkhiriing = isUserEndingRef.current
              setIsReconnecting(false)
              setIsTerhubung(false)
              setIsAITalking(false)
              stopAudio(false)
              setCallStatus(wasUserAkhiriing ? 'ended' : 'disconnected')
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err)
            if (isMountedRef.current && connectionId === connectionIdRef.current) {
              setError("Gagal menyambung ke server audio: " + (err?.message || err?.toString() || 'Unknown error'))
              setCallStatus('error')
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
        errorMessage = "Izin mikrofon ditolak. Harap izinkan akses mikrofon di pengaturan browser Anda."
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = "Mikrofon tidak ditemukan. Pastikan perangkat Anda memiliki mikrofon."
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = "Mikrofon sedang digunakan oleh aplikasi lain."
      } else if (err?.name === 'OverconstrainedError' || err?.name === 'ConstraintNotSatisfiedError') {
        errorMessage = "Mikrofon tidak mendukung format yang diperlukan."
      } else if (err?.message?.includes('secure context') || err?.message?.includes('HTTPS')) {
        errorMessage = "Audio Call membutuhkan HTTPS. Gunakan URL HTTPS dari ngrok."
      } else if (err?.message?.includes('API key') || err?.message?.includes('GEMINI')) {
        errorMessage = "Gemini API key not configured. Contact your admin for setup."
      } else {
        errorMessage = `Error: ${err?.message || 'Unknown'} (name: ${err?.name || 'none'})`
      }

      if (isMountedRef.current) {
        setError(errorMessage)
        setCallStatus('error')
      }
    }
  }, [scenario, stopAudio, startSpeechRecognition])

  React.useEffect(() => {
    isMountedRef.current = true
    Promise.resolve().then(() => startCall())
    return () => {
      isMountedRef.current = false
      resetFrustration()
      stopAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReconnect = React.useCallback(() => {
    isUserEndingRef.current = false
    reconnectCountRef.current += 1
    setIsReconnecting(true)
    setCallStatus('connecting')
    Promise.resolve().then(() => startCall())
  }, [startCall])

  const handleEndAndAnalyze = React.useCallback(() => {
    isUserEndingRef.current = true
    stopAudio()
    onFinish(transcriptRef.current)
  }, [onFinish, stopAudio])

  const statusLabel = (() => {
    switch (callStatus) {
      case 'connecting': return 'Menghubungkan...'
      case 'connected': return 'Terhubung • Ready'
      case 'ai-speaking': return 'AI Berbicara'
      case 'disconnected': return 'Koneksi Hilang'
      case 'error': return 'Error Panggilan'
      case 'ended': return 'Panggilan Selesai'
    }
  })()

  const indicatorStatus = callStatus === 'connected'
    ? 'synced'
    : callStatus === 'disconnected' || callStatus === 'error'
    ? 'error'
    : 'syncing'

  return (
    <div className="flex flex-col h-[75vh] bg-bg border-[3px] border-dark/15 overflow-hidden relative">
      <AnimatePresence>
        {isAITalking && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-primary blur-[100px] z-0"
          />
        )}
      </AnimatePresence>

      {(isReconnecting || callStatus === 'connecting') && (
        <div className="px-6 py-2 bg-warning text-dark font-bold text-[10px] uppercase flex items-center justify-center gap-2 z-10" role="status" aria-live="polite">
          <div className="w-2 h-2 bg-dark animate-pulse" />
          {isReconnecting ? 'Menghubungkan ulang ke Gemini Live...' : 'Menghubungkan ke Gemini Live...'}
        </div>
      )}

      {callStatus === 'disconnected' && (
        <div className="px-6 py-3 bg-danger text-white font-bold text-[10px] uppercase flex flex-col sm:flex-row sm:items-center justify-center gap-3 z-10" role="alert" aria-live="assertive">
          <span>Koneksi Gemini Live terputus. Transkrip Anda tetap aman.</span>
          <div className="flex items-center gap-2">
            <button onClick={handleReconnect} className="px-3 py-2 bg-white text-danger border-2 border-white flex items-center gap-2">
              <RefreshCcw size={12} /> Hubungkan Ulang
            </button>
            <button onClick={handleEndAndAnalyze} className="px-3 py-2 border-2 border-white text-white">
              Akhiri & Analyze
            </button>
          </div>
        </div>
      )}
      <div className="p-6 bg-surface border-b-[3px] border-dark/15 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${isAITalking ? 'bg-primary' : ' bg-surface'} flex items-center justify-center text-white font-bold text-xl`}>
            AI
          </div>
          <div>
            <h3 className="font-bold text-lg uppercase tracking-tight leading-none text-white">{scenario.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-[10px] uppercase font-semibold ${callStatus === 'disconnected' || callStatus === 'error' ? 'text-danger' : 'text-white/40'}`}>
                {statusLabel}
              </p>
              <SyncIndicator status={indicatorStatus} />
              {isTerhubung && (
                <FrustrationMeter value={frustration} reasons={lastReasons} compact />
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           {error && (
             <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-tight">
                <AlertCircle size={14} />
                {error}
             </div>
           )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12 z-10">
        <div className="relative">
          <motion.div
            animate={isAITalking ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-44 h-44 border-[4px] border-dark/15 flex items-center justify-center overflow-hidden bg-surface"
          >
             <User size={72} className="text-muted/30" />
          </motion.div>
          {isAITalking && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 font-bold uppercase text-[10px]">
              BERBICARA...
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-4xl font-bold uppercase tracking-tight text-white">{scenario.title}</h2>
          <p className="text-white/40 font-semibold uppercase text-xs">
            Goal: {scenario.target}
          </p>
        </div>
      </div>

      <div className="absolute top-28 left-8 right-8 flex flex-col gap-2 z-10 pointer-events-none">
        <div
          ref={transcriptScrollRef}
          className="max-h-[200px] overflow-y-auto flex flex-col gap-2 bg-bg/80 p-4 border border-dark/15 pointer-events-auto shadow-[4px_4px_0px_#000]"
        >
           <div className="flex items-center gap-2 mb-2 sticky top-0 bg-bg/80 pb-2 border-b border-dark/15">
             <div className="w-2 h-2 bg-danger animate-pulse" />
             <span className="text-[10px] font-bold uppercase text-white/40">Transkrip Live</span>
           </div>
           {transcript.length === 0 ? (
             <p className="text-[10px] font-semibold text-white/30 uppercase">Menunggu percakapan...</p>
           ) : (
             transcript.map((t, i) => (
               <motion.div
                 key={`${i}-${t.text.slice(0, 10)}`}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 className={`p-3 border-l-[3px] ${t.role === 'user' ? 'border-primary bg-primary/10' : 'border-white/30 bg-white/5'}`}
               >
                 <p className={`text-[10px] font-bold uppercase tracking-tight ${t.role === 'user' ? 'text-primary' : 'text-white/70'}`}>
                    {t.role === 'user' ? salespersonName : scenario.name}
                 </p>
                 <p className="text-sm font-medium text-white/80 leading-tight">
                    {t.text}
                 </p>
               </motion.div>
             ))
           )}
        </div>
      </div>

      <div className="p-12 bg-gradient-to-t from-bg-dark to-transparent flex justify-center items-center gap-8 z-10">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-20 h-20 border-[3px] border-dark/15 flex items-center justify-center ${isMuted ? 'bg-danger border-danger text-white' : 'hover:bg-dark/5 text-muted/70 hover:text-dark'}`}
          aria-label={isMuted ? 'Aktifkan mikrofon' : 'Nonaktifkan mikrofon'}
        >
          {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
        </button>

        <button
          onClick={() => setShowEndConfirm(true)}
          className="w-24 h-24 bg-danger flex items-center justify-center hover:bg-danger/80 shadow-[3px_3px_0px_rgba(0,0,0,0.8)]"
          aria-label="Akhiri call"
        >
          <PhoneOff size={40} className="text-white" />
        </button>

        <ConfirmDialog
          isOpen={showEndConfirm}
          onClose={() => setShowEndConfirm(false)}
          onConfirm={() => {
            isUserEndingRef.current = true
            stopAudio()
            onFinish(transcriptRef.current)
          }}
          title="Akhiri Call?"
          message="Yakin ingin mengakhiri panggilan? Analisis akan dibuat berdasarkan percakapan sejauh ini."
          confirmLabel="Akhiri Call"
          cancelLabel="Lanjutkan Panggilan"
          variant="danger"
        />

        <div className="w-20 h-20 flex items-center justify-center text-white/30">
           <Volume2 size={32} />
        </div>
      </div>

      <div className="px-8 py-3 bg-surface flex items-center justify-between text-[10px] text-muted/50 font-bold uppercase z-10">
        <span>ENCRYPTED AI CALL</span>
        <button
          onClick={() => {
            isUserEndingRef.current = true
            stopAudio()
            onExit()
          }}
          className="hover:text-white/60 transition-colors"
          aria-label="Force exit call"
        >
          KELUAR PAKSA
        </button>
      </div>
    </div>
  )
}
