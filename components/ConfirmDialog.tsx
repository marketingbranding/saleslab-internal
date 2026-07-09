'use client'

import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle, Target } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'default'
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-surface retro-dialog p-8 max-w-md w-full mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon Area */}
            <div className={`flex justify-center mb-6 ${variant === 'danger' ? 'bg-danger/10 p-4' : 'bg-primary/10 p-4'}`}>
              {variant === 'danger' ? (
                <AlertTriangle className="w-8 h-8 text-danger" />
              ) : (
                <Target className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg font-bold uppercase text-center mb-4">
              {title}
            </h2>

            {/* Message */}
            <p className="text-sm text-muted text-center mb-8">
              {message}
            </p>

            {/* Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={onClose}
                className="retro-btn px-6 py-3 border-2 border-dark/20 text-sm hover:bg-dark/5"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`retro-btn px-6 py-3 text-sm ${
                  variant === 'danger'
                    ? 'retro-btn-danger'
                    : 'retro-btn-cyan'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
