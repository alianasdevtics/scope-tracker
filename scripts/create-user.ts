// Usage: npm run user:create -- --email a@b.com --name "Ann" --role PM --password "..."
import { parseArgs } from 'node:util'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../src/lib/db'

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, password: { type: 'string' } },
})
const input = z
  .object({
    email: z.email().transform((e) => e.toLowerCase()),
    name: z.string().min(1),
    role: z.enum(['PM', 'MEMBER']).default('MEMBER'),
    password: z.string().min(8),
  })
  .parse(values)

const { password, ...user } = input
await db.user.create({ data: { ...user, passwordHash: await bcrypt.hash(password, 10) } })
console.log(`Created ${user.role} ${user.email}`)
await db.$disconnect()
