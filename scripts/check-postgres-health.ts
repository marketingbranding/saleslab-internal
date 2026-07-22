import { closePostgresConnection } from '@/lib/server/postgres/connection'
import { checkPostgresHealth } from '@/lib/server/postgres/health'

async function main() {
  const result = await checkPostgresHealth()
  console.log(JSON.stringify(result))
  if (!result.ok) process.exitCode = 1
}

main().finally(closePostgresConnection)
