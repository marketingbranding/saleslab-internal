import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/server/postgres/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
})
