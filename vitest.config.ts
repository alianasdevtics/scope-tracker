import path from 'node:path'
import { defineConfig } from 'vitest/config'

try {
  process.loadEnvFile()
} catch {}

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '' },
    globalSetup: './vitest.global-setup.ts',
    // DB-backed tests share one database.
    fileParallelism: false,
  },
})
