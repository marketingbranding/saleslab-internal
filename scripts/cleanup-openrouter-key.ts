import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from '../lib/server/firebase-admin'

async function main() {
  const reference = getAdminDb().collection('settings').doc('global')
  const snapshot = await reference.get()
  if (!snapshot.exists || !Object.prototype.hasOwnProperty.call(snapshot.data(), 'openRouterApiKey')) {
    console.log('Field OpenRouter lama tidak ditemukan. Tidak ada perubahan.')
    return
  }
  await reference.update({ openRouterApiKey: FieldValue.delete() })
  console.log('Field OpenRouter lama berhasil dihapus dari settings/global.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
