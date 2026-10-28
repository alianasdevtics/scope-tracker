import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { env } from './env'

// Reuse one client across dev hot reloads.
const g = globalThis as unknown as { prisma?: PrismaClient }

export const db = g.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })

if (process.env.NODE_ENV !== 'production') g.prisma = db
