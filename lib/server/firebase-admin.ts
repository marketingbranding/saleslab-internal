import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const ADMIN_APP_NAME = 'saleslab-server'

function createAdminApp(): App {
  const existing = getApps().find(app => app.name === ADMIN_APP_NAME)
  if (existing) return existing

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const credential = projectId && clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : applicationDefault()

  return initializeApp({ credential, projectId }, ADMIN_APP_NAME)
}

export function getAdminAuth() {
  return getAuth(createAdminApp())
}

export function getAdminDb() {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-471779e6-3ac4-400d-910b-6a025a280090'
  return getFirestore(createAdminApp(), databaseId)
}
