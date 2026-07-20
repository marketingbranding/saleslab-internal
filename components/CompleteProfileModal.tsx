'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { User } from 'firebase/auth'

interface CompleteProfileModalProps {
  isOpen: boolean
  user: User
  onComplete: () => void
}

export function CompleteProfileModal({ isOpen, user, onComplete }: CompleteProfileModalProps) {
  const [name, setName] = React.useState(user.displayName || "")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: name,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp()
      }, { merge: true })
      onComplete()
    } catch (err) {
      console.error("Error saving profile:", err)
      setError("Gagal menyimpan profil. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-surface retro-dialog p-8"
          >
            <div className="mb-8">
              <div className="inline-block bg-success/10 text-success px-3 py-1 text-[10px] font-bold uppercase mb-4">
                Pendaftaran Berhasil
              </div>
              <h2 className="text-3xl font-bold tracking-tight leading-none mb-2">
                Siapa Nama Anda?
              </h2>
              <p className="text-muted font-medium text-sm">
                Gunakan nama asli atau nama panggilan tim marketing agar kami bisa mencatat progres Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-danger/10 border-2 border-danger/30 text-danger font-bold text-xs uppercase" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Nama Lengkap</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full retro-input bg-surface p-4"
                />
              </div>

              <button
                disabled={isSubmitting || !name.trim()}
                type="submit"
                className="w-full retro-button retro-button-cyan p-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "MENYIMPAN..." : (
                  <span className="flex items-center justify-center gap-2">
                    SIMPAN PROFIL
                  </span>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
