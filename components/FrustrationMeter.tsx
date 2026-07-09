'use client'

import { motion } from 'motion/react'

interface FrustrationMeterProps {
  value: number
  reasons?: string[]
  className?: string
  compact?: boolean
}

interface ZoneConfig {
  bg: string
  text: string
  barBg: string
  label: string
}

function getZone(value: number): ZoneConfig {
  if (value <= 30) return { bg: 'bg-success', text: 'text-success', barBg: 'bg-success', label: 'Santai' }
  if (value <= 60) return { bg: 'bg-warning', text: 'text-warning', barBg: 'bg-warning', label: 'Mulai Frustrasi' }
  if (value <= 80) return { bg: 'bg-warning', text: 'text-warning', barBg: 'bg-warning', label: 'Frustrasi' }
  if (value < 100) return { bg: 'bg-danger', text: 'text-danger', barBg: 'bg-danger', label: 'Sangat Frustrasi' }
  return { bg: 'bg-danger', text: 'text-danger', barBg: 'bg-danger', label: 'HANG UP!' }
}

export function FrustrationMeter({ value, reasons, className, compact }: FrustrationMeterProps) {
  const zone = getZone(value)

  if (compact) {
    return (
      <div className={`bg-surface border-2 border-dark/15 p-1.5 ${className || ''}`} title={reasons?.length ? reasons.join('\n') : undefined}>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold uppercase leading-none whitespace-nowrap text-white/50">
            Frustrasi
          </span>
          <div className="flex-1 h-1.5 bg-text/20 relative">
            <motion.div
              className={`h-full ${zone.barBg} ${value >= 100 ? 'animate-pulse' : ''}`}
              animate={{ width: `${Math.max(value, 2)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className={`text-[9px] font-bold tabular-nums leading-none ${zone.text}`}>
            {Math.round(value)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-surface retro-panel p-4 ${className || ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-bold uppercase leading-none whitespace-nowrap text-muted">
          FRUSTRASI
        </span>
        <div className="flex-1 h-3 bg-bg relative">
          <motion.div
            className={`h-full ${zone.barBg} ${value >= 100 ? 'animate-pulse' : ''}`}
            animate={{ width: `${Math.max(value, 2)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className={`text-lg font-bold tabular-nums leading-none ${zone.text}`}>
          {Math.round(value)}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase ${zone.text}`}>
          {zone.label}
        </p>
        {reasons && reasons.length > 0 && (
          <p className="text-[8px] font-semibold text-muted truncate max-w-[60%] text-right">
            {reasons[reasons.length - 1]}
          </p>
        )}
      </div>
    </div>
  )
}
