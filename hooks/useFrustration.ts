'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { analyzeFrustration, FrustrationConfig } from '@/lib/frustration-engine'

const MAX_HISTORY = 3

interface UseFrustrationOptions {
  onHangUp?: () => void
}

export function useFrustration(
  config: FrustrationConfig,
  options?: UseFrustrationOptions
) {
  const [frustration, setFrustration] = useState(0)
  const [hangUp, setHangUp] = useState(false)
  const [lastReasons, setLastReasons] = useState<string[]>([])

  const userMessagesRef = useRef<string[]>([])
  const lastAiMessageRef = useRef<string | null>(null)
  const hangUpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onHangUpRef = useRef(options?.onHangUp)
  onHangUpRef.current = options?.onHangUp

  useEffect(() => {
    return () => {
      if (hangUpTimeoutRef.current) {
        clearTimeout(hangUpTimeoutRef.current)
      }
    }
  }, [])

  const analyzeMessage = useCallback((text: string, aiMessage?: string | null) => {
    if (!text || text.trim().length < 3) return

    // Update AI message context
    if (aiMessage !== undefined) {
      lastAiMessageRef.current = aiMessage
    }

    // Use functional state updater to avoid stale closure on frustration
    setFrustration(prevFrustration => {
      if (prevFrustration >= 100) return prevFrustration // already hung up

      const context = {
        currentFrustration: prevFrustration,
        lastUserMessages: userMessagesRef.current.slice(-MAX_HISTORY),
        lastAiMessage: lastAiMessageRef.current,
      }

      const result = analyzeFrustration(text, context, config)

      // Store this message for future repetition checks
      userMessagesRef.current.push(text)
      if (userMessagesRef.current.length > MAX_HISTORY + 2) {
        userMessagesRef.current = userMessagesRef.current.slice(-MAX_HISTORY)
      }

      const newFrustration = Math.max(0, Math.min(100, prevFrustration + result.delta))

      // Update reasons (safe to call inside functional updater — React batches)
      setLastReasons(result.reasons)

      // Check for hangup
      if (newFrustration >= 100) {
        setHangUp(true)
        if (onHangUpRef.current) {
          hangUpTimeoutRef.current = setTimeout(() => {
            onHangUpRef.current?.()
          }, 1000) // 1s delay biar meter sempat render di 100
        }
      }

      return newFrustration
    })
  }, [config]) // config (patience + sensitivity) is stable per session

  const reset = useCallback(() => {
    if (hangUpTimeoutRef.current) {
      clearTimeout(hangUpTimeoutRef.current)
    }
    setFrustration(0)
    setHangUp(false)
    setLastReasons([])
    userMessagesRef.current = []
    lastAiMessageRef.current = null
  }, [])

  return {
    frustration,
    hangUp,
    lastReasons,
    analyzeMessage,
    reset,
  }
}
