'use client'

import * as React from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'

interface UserProfile {
  displayName: string
  email: string
  photoURL?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  syncStatus: 'syncing' | 'synced' | 'offline' | 'error'
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  syncStatus: 'syncing'
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [syncStatus, setSyncStatus] = React.useState<'syncing' | 'synced' | 'offline' | 'error'>('syncing')

  React.useEffect(() => {
    let unsubProfile: (() => void) | undefined

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        setSyncStatus('syncing')
        // Fetch profile
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile)
            setSyncStatus('synced')
          } else {
            setProfile(null)
            setSyncStatus('synced')
          }
          setLoading(false)
        }, (err) => {
          console.error('Profile sync error:', err)
          setSyncStatus('error')
          setLoading(false)
        })
      } else {
        setProfile(null)
        setSyncStatus('synced')
        if (unsubProfile) unsubProfile()
        setLoading(false)
      }
    })

    return () => {
      unsubscribe()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, syncStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => React.useContext(AuthContext)
