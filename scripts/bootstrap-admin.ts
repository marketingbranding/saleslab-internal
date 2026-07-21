import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '../lib/server/firebase-admin'

function argument(name: string) {
  const prefix = `--${name}=`
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const uid = argument('uid')
  const label = argument('label') || 'Bootstrap admin'
  if (!uid) throw new Error('Gunakan: npm run bootstrap:admin -- --uid=<FIREBASE_UID> [--label=<nama>]')

  const user = await getAdminAuth().getUser(uid)
  if (user.disabled) throw new Error('User Firebase Auth sedang dinonaktifkan.')

  await getAdminDb().collection('admins').doc(uid).set({
    uid,
    label,
    email: user.email || null,
    bootstrappedAt: Timestamp.now(),
    bootstrappedBy: 'server-script',
  }, { merge: true })

  console.log(`Admin aktif untuk UID ${uid}.`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
