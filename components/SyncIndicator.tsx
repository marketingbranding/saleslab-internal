'use client'

import * as React from 'react'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'

type SyncStatus = 'syncing' | 'synced' | 'offline' | 'error'

interface SyncIndicatorProps {
  status: SyncStatus
  className?: string
}

export function SyncIndicator({ status, className = '' }: SyncIndicatorProps) {
  const [showTooltip, setShowTooltip] = React.useState(false)

  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <Loader2 size={12} className="animate-spin" />,
          color: 'text-warning',
          bg: 'bg-warning/10',
          border: 'border-warning/30',
          label: 'Menyinkronkan...'
        }
      case 'synced':
        return {
          icon: <Cloud size={12} />,
          color: 'text-success',
          bg: 'bg-success/10',
          border: 'border-success/30',
          label: 'Tersinkronisasi'
        }
      case 'offline':
        return {
          icon: <CloudOff size={12} />,
          color: 'text-muted',
          bg: 'bg-surface',
          border: 'border-dark/20',
          label: 'Offline'
        }
      case 'error':
        return {
          icon: <CloudOff size={12} />,
          color: 'text-danger',
          bg: 'bg-danger/10',
          border: 'border-danger/30',
          label: 'Error Sinkronisasi'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 px-2 py-1 border ${config.border} ${config.bg} ${config.color} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="status"
      aria-live="polite"
      aria-label={config.label}
    >
      {config.icon}
      <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
        {status === 'syncing' ? '...' : 'OK'}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-dark text-surface text-[11px] font-bold whitespace-nowrap">
          {config.label}
        </div>
      )}
    </div>
  )
}

// Hook to track sync status across the app
export function useSyncStatus() {
  const [status, setStatus] = React.useState<SyncStatus>('syncing')
  const [pendingOps, setPendingOps] = React.useState(0)

  const startSync = React.useCallback(() => {
    setPendingOps(prev => prev + 1)
  }, [])

  const endSync = React.useCallback(() => {
    setPendingOps(prev => Math.max(0, prev - 1))
  }, [])

  const setOffline = React.useCallback(() => {
    setStatus('offline')
  }, [])

  const setError = React.useCallback(() => {
    setStatus('error')
  }, [])

  React.useEffect(() => {
    if (pendingOps > 0) {
      setStatus('syncing')
    } else {
      setStatus('synced')
    }
  }, [pendingOps])

  return {
    status,
    startSync,
    endSync,
    setOffline,
    setError
  }
}
