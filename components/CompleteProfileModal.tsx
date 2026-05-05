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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
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
      alert("Failed to save profile. Please try again.")
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
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white border-8 border-black p-8 shadow-[20px_20px_0px_0px_rgba(255,255,255,0.2)]"
          >
            <div className="mb-8">
              <div className="inline-block bg-yellow-400 text-black px-2 py-1 text-[10px] font-black uppercase tracking-widest mb-4 border-2 border-black">
                Pendaftaran Berhasil
              </div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2 text-black">
                Siapa Nama Anda?
              </h2>
              <p className="text-gray-500 font-bold text-sm">
                Gunakan nama asli atau nama panggilan tim marketing agar kami bisa mencatat progres Anda.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Lengkap</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full border-4 border-black p-4 font-black uppercase text-xl outline-none focus:bg-yellow-50 transition-colors"
                />
              </div>

              <button
                disabled={isSubmitting || !name.trim()}
                type="submit"
                className="w-full bg-black text-white border-4 border-black p-5 font-black uppercase italic text-xl tracking-tighter hover:bg-yellow-400 hover:text-black transition-all active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed group"
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
