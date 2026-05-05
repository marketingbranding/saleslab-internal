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
          color: 'text-yellow-500',
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          label: 'Syncing...'
        }
      case 'synced':
        return {
          icon: <Cloud size={12} />,
          color: 'text-green-500',
          bg: 'bg-green-50',
          border: 'border-green-300',
          label: 'Synced'
        }
      case 'offline':
        return {
          icon: <CloudOff size={12} />,
          color: 'text-gray-400',
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          label: 'Offline'
        }
      case 'error':
        return {
          icon: <CloudOff size={12} />,
          color: 'text-red-500',
          bg: 'bg-red-50',
          border: 'border-red-300',
          label: 'Sync Error'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border ${config.border} ${config.bg} ${config.color} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {config.icon}
      <span className="text-[9px] font-black uppercase tracking-wider leading-none">
        {status === 'syncing' ? '...' : 'OK'}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[10px] font-bold whitespace-nowrap rounded-sm">
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
