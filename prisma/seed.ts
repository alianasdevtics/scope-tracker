import bcrypt from 'bcryptjs'
import { db } from '../src/lib/db'

const password = process.env.SEED_PASSWORD
if (!password) throw new Error('Set SEED_PASSWORD in .env')
const passwordHash = await bcrypt.hash(password, 10)

const users = [
  { email: 'pm@agency.test', name: 'Pat PM', role: 'PM' },
  { email: 'member@agency.test', name: 'Max Member', role: 'MEMBER' },
] as const

for (const u of users) {
  await db.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash } })
}
console.log(`Seeded ${users.map((u) => u.email).join(', ')}`)
await db.$disconnect()
