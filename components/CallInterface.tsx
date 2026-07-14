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
import { mapLegacyPersona, mapSalesScenario } from "@/lib/sos/legacy-mappers"
import { SOS_STATIC_KNOWLEDGE } from "@/lib/sos/knowledge"
import { selectKnowledge } from "@/lib/sos/knowledge-selector"
import { compileVoiceRoleplayPrompt } from "@/lib/sos/prompt-compiler"
import { applyVoicePromptBudget } from "@/lib/sos/prompt-budget"
import { extractDeterministicEvents } from "@/lib/sos/event-extractor"
import { createInitialRoleplayState, reduceRoleplayEvents } from "@/lib/sos/state-reducer"
import { deriveInitialRoleplayState } from "@/lib/sos/initial-state"
import { applyHiddenInformationRevealKeys, evaluateHiddenInformation } from "@/lib/sos/hidden-information-engine"
import {
  appendNormalizedTurn,
  combineTranscriptTextParts,
  createTranscriptNormalizerState,
  normalizedTurnToLegacyTranscriptTurn,
} from "@/lib/sos/transcript-normalizer"
import type { HiddenInformation, RoleplayEvent, RoleplayState, TurnSource } from "@/lib/sos/types"

interface CallInterfaceProps {
  scenario: SalesScenario
  salespersonName: string
  onFinish: (transcript: { role: 'user' | 'model'; text: string }[]) => void
  onExit: () => void
  frustrationSensitivity?: number
}

type CallStatus = 'connecting' | 'connected' | 'ai-speaking' | 'disconnected' | 'error' | 'ended'

export function CallInterface({ scenario, salespersonName, onFinish, onExit, frustrationSensitivity = 5 }: CallInterfaceProps) {
  const [isTerhubung, setIsTerhubung] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isAITalking, setIsAITalking] = React.useState(false)
  const [isReconnecting, setIsReconnecting] = React.useState(false)
  const [callStatus, setCallStatus] = React.useState<CallStatus>('connecting')
  const [error, setError] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState<{ role: 'user' | 'model'; text: string }[]>([])
  const [showEndConfirm, setShowEndConfirm] = React.useState(false)
  const [roleplayEventSessionId] = React.useState(() => `voice-${Date.now()}`)

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

  const inputAudioContextRef = React.useRef<AudioContext | null>(null)
  const outputAudioContextRef = React.useRef<AudioContext | null>(null)
  const sessionRef = React.useRef<any>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const processorRef = React.useRef<ScriptProcessorNode | null>(null)
  const inputSilentSinkRef = React.useRef<GainNode | null>(null)
  const audioQueueRef = React.useRef<Int16Array[]>([])
  const isPlayingRef = React.useRef(false)
  const playNextInQueueRef = React.useRef<() => Promise<void>>(async () => {})
  const nextPlaybackTimeRef = React.useRef(0)
  const activeOutputSourcesRef = React.useRef(0)
  const isSchedulingPlaybackRef = React.useRef(false)
  const isMountedRef = React.useRef(true)
  const transcriptScrollRef = React.useRef<HTMLDivElement>(null)
  const transcriptRef = React.useRef<{ role: 'user' | 'model'; text: string }[]>([])
  const normalizedTranscriptStateRef = React.useRef(createTranscriptNormalizerState())
  const roleplayEventsRef = React.useRef<RoleplayEvent[]>([])
  const roleplayStateRef = React.useRef<RoleplayState>(createInitialRoleplayState({ scenarioId: scenario.id }))
  const hiddenInformationConfigRef = React.useRef<HiddenInformation[]>([])
  const speechRecognitionRef = React.useRef<any>(null)
  const shouldRestartSpeechRef = React.useRef(false)
  const isUserEndingRef = React.useRef(false)
  const sessionHandleRef = React.useRef<string | null>(null)
  const reconnectCountRef = React.useRef(0)
  const mutedRef = React.useRef(false)
  const connectionIdRef = React.useRef(0)
  const latencyTimingRef = React.useRef({ lastUserAudioSent: 0, lastAiAudioReceived: 0, lastUserSpeechEnd: 0 })
  const lastAudioDebugLogRef = React.useRef(0)

  React.useEffect(() => {
    mutedRef.current = isMuted
  }, [isMuted])

  const logLatency = (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Timing] ${label} at ${Date.now()}`)
    }
  }

  const appendTranscript = (role: 'user' | 'model', text: string, source: TurnSource = 'manual', rawRef?: string) => {
    if (!isMountedRef.current) return

    const previousState = normalizedTranscriptStateRef.current
    const nextState = appendNormalizedTurn(previousState, {
      role: role === 'user' ? 'sales' : 'customer',
      text,
      source,
      timestamp: new Date().toISOString(),
      finalized: true,
      rawRef,
    })

    if (nextState === previousState) {
      return
    }

    normalizedTranscriptStateRef.current = nextState
    const acceptedTurn = nextState.turns[nextState.turns.length - 1]
    const legacyTurn = normalizedTurnToLegacyTranscriptTurn(acceptedTurn)

    const extraction = extractDeterministicEvents(acceptedTurn, {
      sessionId: roleplayEventSessionId,
      previousTurns: nextState.turns.slice(0, -1),
      existingEvents: roleplayEventsRef.current,
    })

    if (extraction.events.length > 0) {
      roleplayEventsRef.current = [...roleplayEventsRef.current, ...extraction.events]
      roleplayStateRef.current = reduceRoleplayEvents(roleplayStateRef.current, extraction.events)
      const hiddenResult = evaluateHiddenInformation(hiddenInformationConfigRef.current, {
        events: roleplayEventsRef.current,
        state: roleplayStateRef.current,
        alreadyRevealedKeys: roleplayStateRef.current.revealedInformation,
      })
      roleplayStateRef.current = applyHiddenInformationRevealKeys(
        roleplayStateRef.current,
        hiddenResult.newlyRevealedKeys
      )
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Roleplay Events]', extraction.events.map(event => ({
          type: event.eventType,
          turn: event.sourceTurnSequence,
        })))
        console.debug('[Roleplay State]', {
          stage: roleplayStateRef.current.stage,
          trust: roleplayStateRef.current.trust,
          readiness: roleplayStateRef.current.readiness,
          home: roleplayStateRef.current.home,
        })
      }
    }

    if (role === 'model') {
      const timing = latencyTimingRef.current
      if (timing.lastUserSpeechEnd > 0) {
        const responseLatency = Date.now() - timing.lastUserSpeechEnd
        if (responseLatency > 1000 && process.env.NODE_ENV === 'development') {
          console.log(`[Timing] AI response latency: ${responseLatency}ms`)
        }
      }
    }

    setTranscript(prev => {
      const newTranscript = [...prev, legacyTurn]
      transcriptRef.current = newTranscript

      // Analyze user messages for frustration
      if (legacyTurn.role === 'user') {
        const lastAiMsg = [...prev].reverse().find(m => m.role === 'model')
        setTimeout(() => {
          analyzeMessage(legacyTurn.text, lastAiMsg?.text ?? null)
        }, 0)
      }

      requestAnimationFrame(() => {
        transcriptScrollRef.current?.scrollTo({
          top: transcriptScrollRef.current?.scrollHeight || 0,
        })
      })
      return newTranscript
    })
  }

  const stopAudio = React.useCallback((closeSession = true) => {
    shouldRestartSpeechRef.current = false
    speechRecognitionRef.current?.stop?.()
    streamRef.current?.getTracks().forEach(track => track.stop())
    processorRef.current?.disconnect()
    inputSilentSinkRef.current?.disconnect()
    audioQueueRef.current = []
    isPlayingRef.current = false
    nextPlaybackTimeRef.current = 0
    activeOutputSourcesRef.current = 0
    isSchedulingPlaybackRef.current = false
    inputAudioContextRef.current?.close()
    outputAudioContextRef.current?.close()
    if (closeSession) {
      sessionRef.current?.close()
    }

    streamRef.current = null
    processorRef.current = null
    inputSilentSinkRef.current = null
    inputAudioContextRef.current = null
    outputAudioContextRef.current = null
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
          if (text) appendTranscript('user', text, 'manual', 'speechRecognition')
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
      if (isSchedulingPlaybackRef.current) return
      isSchedulingPlaybackRef.current = true
      try {
        if (audioQueueRef.current.length === 0) {
          if (activeOutputSourcesRef.current === 0) {
            isPlayingRef.current = false
            setIsAITalking(false)
            if (isTerhubung) {
              setCallStatus('connected')
            }
          }
          return
        }

        if (!outputAudioContextRef.current) {
          outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 })
        }

        if (outputAudioContextRef.current.state === 'suspended') {
          await outputAudioContextRef.current.resume()
        }

        isPlayingRef.current = true
        setIsAITalking(true)
        setCallStatus('ai-speaking')

        while (audioQueueRef.current.length > 0 && isMountedRef.current && outputAudioContextRef.current) {
          const pcm16 = audioQueueRef.current.shift()!
          if (pcm16.length <= 1) continue

          let peak = 0
          const float32 = new Float32Array(pcm16.length)
          for (let i = 0; i < pcm16.length; i++) {
            peak = Math.max(peak, Math.abs(pcm16[i]))
            float32[i] = pcm16[i] / 32768.0
          }

          const buffer = outputAudioContextRef.current.createBuffer(1, float32.length, 24000)
          buffer.getChannelData(0).set(float32)

          const source = outputAudioContextRef.current.createBufferSource()
          source.buffer = buffer
          source.connect(outputAudioContextRef.current.destination)

          const startAt = Math.max(outputAudioContextRef.current.currentTime + 0.01, nextPlaybackTimeRef.current || 0)
          nextPlaybackTimeRef.current = startAt + buffer.duration
          activeOutputSourcesRef.current += 1
          source.onended = () => {
            activeOutputSourcesRef.current = Math.max(0, activeOutputSourcesRef.current - 1)
            if (isMountedRef.current && activeOutputSourcesRef.current === 0 && audioQueueRef.current.length === 0) {
              isPlayingRef.current = false
              setIsAITalking(false)
              if (isTerhubung) setCallStatus('connected')
            }
          }

          if (process.env.NODE_ENV === 'development') {
            console.log(`[AudioOut] context=${outputAudioContextRef.current.state} samples=${pcm16.length} peak=${peak}`)
          }

          source.start(startAt)
        }
      } finally {
        isSchedulingPlaybackRef.current = false
      }
    }
  })

  const startCall = React.useCallback(async () => {
    if (!isMountedRef.current) return

    const connectionId = connectionIdRef.current + 1
    connectionIdRef.current = connectionId
    if (sessionRef.current || streamRef.current || processorRef.current || inputAudioContextRef.current || outputAudioContextRef.current) {
      stopAudio(true)
    }

    try {
      setError(null)
      setIsReconnecting(false)
      setCallStatus('connecting')
      isUserEndingRef.current = false
      audioQueueRef.current = []
      isPlayingRef.current = false
      nextPlaybackTimeRef.current = 0
      activeOutputSourcesRef.current = 0
      isSchedulingPlaybackRef.current = false
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

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      streamRef.current = stream
      // Gemini Live inputTranscription is the source of truth. Browser
      // SpeechRecognition duplicates the same utterance with different punctuation.

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

      const mappedScenario = mapSalesScenario(scenario)
      const mappedPersona = mapLegacyPersona(scenario)
      const derivedInitialState = deriveInitialRoleplayState({
        persona: mappedPersona,
        scenario: mappedScenario,
      })
      hiddenInformationConfigRef.current = mappedPersona.hiddenInformation
      if (roleplayStateRef.current.processedEventIds.length === 0) {
        roleplayStateRef.current = derivedInitialState
      }
      const knowledgeSelection = selectKnowledge({
        knowledge: SOS_STATIC_KNOWLEDGE,
        persona: mappedPersona,
        scenario: mappedScenario,
        state: derivedInitialState,
      })
      const budgetResult = applyVoicePromptBudget({
        persona: mappedPersona,
        scenario: mappedScenario,
        knowledge: knowledgeSelection.selected,
      })
      const roleplayPrompt = compileVoiceRoleplayPrompt({
        persona: mappedPersona,
        scenario: mappedScenario,
        knowledge: budgetResult.knowledge,
      })

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            logLatency('WebSocket connected')
            if (!isMountedRef.current || connectionId !== connectionIdRef.current) return

            setIsTerhubung(true)
            setIsReconnecting(false)
            setCallStatus('connected')
            reconnectCountRef.current = 0
            audioQueueRef.current = []
            isPlayingRef.current = false
            nextPlaybackTimeRef.current = 0
            activeOutputSourcesRef.current = 0
            isSchedulingPlaybackRef.current = false

            if (!streamRef.current) return

            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 })
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current)
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1)

            processor.onaudioprocess = (e) => {
              if (mutedRef.current || !sessionRef.current || !isMountedRef.current || connectionId !== connectionIdRef.current) return
              if (activeOutputSourcesRef.current > 0) return

              const inputData = e.inputBuffer.getChannelData(0)
              let sum = 0
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i]
              }
              const rms = Math.sqrt(sum / inputData.length)
              const now = Date.now()
              const shouldLogAudioDebug = process.env.NODE_ENV === 'development' && now - lastAudioDebugLogRef.current > 1000

              const pcm16 = floatTo16BitPCM(inputData)
              const base64Audio = int16ArrayToBase64(pcm16)

              sessionRef.current.sendRealtimeInput({
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: base64Audio
                }
              })
              latencyTimingRef.current.lastUserAudioSent = now
              if (shouldLogAudioDebug) {
                lastAudioDebugLogRef.current = now
                console.log(`[Audio] rms=${rms.toFixed(5)} sent=true mode=direct`)
              }
            }

            source.connect(processor)
            const silentSink = inputAudioContextRef.current.createGain()
            silentSink.gain.value = 0
            processor.connect(silentSink)
            silentSink.connect(inputAudioContextRef.current.destination)
            processorRef.current = processor
            inputSilentSinkRef.current = silentSink
          },
          onmessage: async (message: any) => {
            if (!isMountedRef.current || connectionId !== connectionIdRef.current) return

            if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
              // audio chunk — log size only
              const chunkSize = message.serverContent.modelTurn.parts[0].inlineData.data.length
              logLatency(`AI audio chunk received (${Math.round(chunkSize / 1024)}KB)`)
            } else if (message.serverContent?.inputTranscription?.text) {
              // user transcription — log text preview
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Live] Input transcription: "${message.serverContent.inputTranscription.text.slice(0, 50)}..."`)
              }
            }

            if (message.sessionResumptionUpdate?.newHandle) {
              sessionHandleRef.current = message.sessionResumptionUpdate.newHandle
            }

            const inputTranscription = message.serverContent?.inputTranscription?.text?.trim()
            if (inputTranscription) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[Live] Gemini received/transcribed user audio')
              }
              appendTranscript('user', inputTranscription, 'gemini_live_input', 'serverContent.inputTranscription')
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
              if (isMountedRef.current) {
                playNextInQueueRef.current()
              }
            }

            // Extract AI text from combined parts once per provider message
            const modelParts = message.serverContent?.modelTurn?.parts || []
            const modelText = combineTranscriptTextParts(modelParts)
            if (modelText && isMountedRef.current) {
              console.log('AI text:', modelText)
              appendTranscript('model', modelText, 'gemini_live_model', 'serverContent.modelTurn.parts')
            }

            // Extract user text from combined fallback parts once per provider message
            const userParts = message.serverContent?.userTurn?.parts || []
            const userText = combineTranscriptTextParts(userParts)
            if (userText && isMountedRef.current) {
              console.log('User text:', userText)
              appendTranscript('user', userText, 'fallback', 'serverContent.userTurn.parts')
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
              const wasUserEnding = isUserEndingRef.current
              setIsReconnecting(false)
              setIsTerhubung(false)
              setIsAITalking(false)
              stopAudio(false)
              setCallStatus(wasUserEnding ? 'ended' : 'disconnected')
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
              text: roleplayPrompt
            }]
          },
        },
      })

      if (!isMountedRef.current || connectionId !== connectionIdRef.current) {
        session?.close?.()
        return
      }

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
  }, [scenario, stopAudio])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
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
      case 'connected': return 'Terhubung • Siap'
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
    <div className="flex flex-col min-h-[78vh] lg:h-[calc(100vh-8rem)] bg-bg border-[3px] border-dark/15 overflow-hidden relative">
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
              Akhiri & Analisis
            </button>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-5 bg-navy border-b-[3px] border-dark/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 ${isAITalking ? 'bg-primary text-dark' : 'bg-white/10 text-white'} flex items-center justify-center font-bold text-xl shrink-0 border-2 border-white/10`}>
            AI
          </div>
          <div className="min-w-0">
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
        <div className="flex gap-4 min-w-0">
           {error && (
             <div className="flex items-center gap-2 text-danger font-bold text-xs uppercase tracking-tight bg-white px-3 py-2 border-2 border-danger/30">
                <AlertCircle size={14} />
                {error}
              </div>
           )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-4 sm:gap-6 p-4 sm:p-6 z-10 overflow-hidden">
        <section className="min-h-[320px] lg:min-h-0 flex flex-col items-center justify-center gap-8 bg-navy text-white border-2 border-dark/20 p-6 overflow-hidden">
          <div className="relative">
            <motion.div
              animate={isAITalking ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-32 h-32 sm:w-40 sm:h-40 border-[4px] border-white/10 flex items-center justify-center overflow-hidden bg-white/5"
            >
               <User size={64} className="text-white/30" />
            </motion.div>
            {isAITalking && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-1 font-bold uppercase text-[10px] whitespace-nowrap">
                BERBICARA...
              </div>
            )}
          </div>

          <div className="text-center space-y-3 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-white leading-none">{scenario.title}</h2>
            <p className="text-white/60 font-semibold text-xs sm:text-sm uppercase leading-tight">
              Goal: {scenario.target}
            </p>
          </div>
        </section>

        <section className="min-h-[260px] lg:min-h-0 bg-surface border-2 border-dark/20 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-dark/10 bg-bg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-danger animate-pulse" />
              <span className="text-[10px] font-bold uppercase text-muted font-heading">Transkrip Live</span>
            </div>
            <span className="text-[10px] font-bold uppercase text-muted/70">{transcript.length} pesan</span>
          </div>
          <div
            ref={transcriptScrollRef}
            className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 p-4"
          >
             {transcript.length === 0 ? (
               <div className="h-full min-h-[180px] flex items-center justify-center text-center">
                 <p className="text-[10px] font-semibold text-muted uppercase">Menunggu percakapan...</p>
               </div>
             ) : (
               transcript.map((t, i) => (
                 <motion.div
                   key={`${i}-${t.text.slice(0, 10)}`}
                   initial={{ opacity: 0, y: 8 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`p-3 border-l-[3px] ${t.role === 'user' ? 'border-primary bg-primary/10' : 'border-navy/30 bg-navy/5'}`}
                 >
                   <p className={`text-[10px] font-bold uppercase tracking-tight ${t.role === 'user' ? 'text-primary' : 'text-navy/70'}`}>
                      {t.role === 'user' ? salespersonName : scenario.name}
                   </p>
                   <p className="text-sm font-medium text-dark leading-tight mt-1">
                      {t.text}
                   </p>
                 </motion.div>
               ))
             )}
          </div>
        </section>
      </div>

      <div className="px-4 py-5 sm:px-6 bg-bg border-t-2 border-dark/10 flex justify-center items-center gap-5 sm:gap-8 z-10">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 sm:w-16 sm:h-16 border-[3px] border-dark/15 flex items-center justify-center cursor-pointer ${isMuted ? 'bg-danger border-danger text-white' : 'bg-surface hover:bg-dark/5 text-muted/70 hover:text-dark'}`}
          aria-label={isMuted ? 'Aktifkan mikrofon' : 'Nonaktifkan mikrofon'}
        >
          {isMuted ? <MicOff size={26} /> : <Mic size={26} />}
        </button>

        <button
          onClick={() => setShowEndConfirm(true)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-danger flex items-center justify-center hover:bg-danger/80 shadow-[3px_3px_0px_rgba(0,0,0,0.8)] cursor-pointer"
          aria-label="Akhiri panggilan"
        >
          <PhoneOff size={34} className="text-white" />
        </button>

        <ConfirmDialog
          isOpen={showEndConfirm}
          onClose={() => setShowEndConfirm(false)}
          onConfirm={() => {
            isUserEndingRef.current = true
            stopAudio()
            onFinish(transcriptRef.current)
          }}
          title="Akhiri Panggilan?"
          message="Yakin ingin mengakhiri panggilan? Analisis akan dibuat berdasarkan percakapan sejauh ini."
          confirmLabel="Akhiri Panggilan"
          cancelLabel="Lanjutkan Panggilan"
          variant="danger"
        />

        <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-muted/40">
           <Volume2 size={26} />
        </div>
      </div>

      <div className="px-4 sm:px-6 py-2 bg-surface border-t-2 border-dark/10 flex items-center justify-between text-[10px] text-muted/60 font-bold uppercase z-10">
        <span>ENCRYPTED AI CALL</span>
        <button
          onClick={() => {
            isUserEndingRef.current = true
            stopAudio()
            onExit()
          }}
          className="hover:text-dark transition-colors cursor-pointer"
          aria-label="Keluar paksa dari panggilan"
        >
          KELUAR PAKSA
        </button>
      </div>
    </div>
  )
}
