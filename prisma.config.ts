import { defineConfig, env } from 'prisma/config'

// Prisma 7 no longer reads .env itself. Variables already set in the environment win (tests rely on that).
try {
  process.loadEnvFile()
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
})
