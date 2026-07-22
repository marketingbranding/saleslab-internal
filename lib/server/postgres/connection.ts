import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import { readPostgresConfig } from './config'
import * as schema from './schema'

interface PostgresConnection {
  client: Sql
  db: PostgresJsDatabase<typeof schema>
}

let connection: PostgresConnection | undefined

export function getPostgresConnection(): PostgresConnection {
  if (connection) return connection
  const config = readPostgresConfig()
  const client = postgres(config.url, {
    max: config.max,
    idle_timeout: config.idleTimeout,
    connect_timeout: 10,
    prepare: false,
  })
  connection = { client, db: drizzle(client, { schema }) }
  return connection
}

export function getPostgresDatabase() {
  return getPostgresConnection().db
}

export async function closePostgresConnection() {
  if (!connection) return
  const current = connection
  connection = undefined
  await current.client.end({ timeout: 5 })
}
