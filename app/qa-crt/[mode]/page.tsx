'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import type { User as FirebaseUser } from 'firebase/auth'
import { motion } from 'motion/react'
import { LoginScreen, type LoginVisualState } from '@/components/LoginScreen'
import { CompleteProfileModal } from '@/components/CompleteProfileModal'
import { AppLayout } from '@/components/layout/AppLayout'

const mockUser = {
  uid: 'qa-user',
  email: 'qa@example.test',
  displayName: '',
  photoURL: null,
} as unknown as FirebaseUser

export default function CrtQaPage() {
  const { mode } = useParams<{ mode: string }>()
  const restored = mode === 'restored' || mode === 'reduced-restored'
  const [visualState, setVisualState] = React.useState<LoginVisualState>(restored ? 'resolving' : 'login')
  const [appVisible, setAppVisible] = React.useState(false)
  const [complete, setComplete] = React.useState(false)
  const [activeStep, setActiveStep] = React.useState('selection')

  React.useEffect(() => {
    if (!restored) return
    const timer = setTimeout(() => {
      setAppVisible(true)
      setVisualState('entering')
    }, 1000)
    return () => clearTimeout(timer)
  }, [restored])

  const startLogin = () => {
    setVisualState('authenticating')
    if (mode === 'failure') {
      setTimeout(() => setVisualState('login'), 180)
      return
    }
    setTimeout(() => {
      setAppVisible(true)
      setVisualState('entering')
    }, 120)
  }

  const finishEntry = () => {
    setComplete(true)
  }

  const logout = () => {
    setComplete(false)
    setAppVisible(false)
    setVisualState('login')
  }

  const overlayVisible = !complete

  return (
    <div className="relative min-h-screen bg-bg">
      {appVisible && (
        <motion.div className="app-entry-layer" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <AppLayout activeStep={activeStep} onNavigate={setActiveStep} isAdmin userName="Budi Trial" level={2} xp={45} xpNext={100} streak={1} onLogout={logout}>
            <output data-testid="active-step">{activeStep}</output>
            <h1 className="text-5xl font-heading font-bold uppercase mt-4">Desktop SalesLab</h1>
          </AppLayout>
        </motion.div>
      )}
      {complete && mode === 'profile' && <CompleteProfileModal isOpen user={mockUser} onComplete={() => {}} />}
      {overlayVisible && (
        <LoginScreen
          onLogin={startLogin}
          visualState={visualState}
          restoredSession={restored}
          onExitComplete={finishEntry}
        />
      )}
    </div>
  )
}
