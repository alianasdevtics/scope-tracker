import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { login } from '@/lib/auth'
import { db } from '@/lib/db'
import { jar } from './jar'

export { jar }

export const form = (data: Record<string, string | Blob>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(data)) f.set(k, v)
  return f
}

const passwordHash = bcrypt.hashSync('pw', 4)

export async function makeUser(role: 'PM' | 'MEMBER') {
  return db.user.create({ data: { email: `${randomUUID()}@t.test`, name: role, role, passwordHash } })
}

/** Creates a user and logs them in, replacing any current session. */
export async function signIn(role: 'PM' | 'MEMBER') {
  const user = await makeUser(role)
  jar.clear()
  await login(user.email, 'pw')
  return user
}

export async function makeProject(createdById: string, data: { confirmedAt?: Date; status?: 'ACTIVE' | 'ARCHIVED' } = {}) {
  return db.project.create({ data: { name: 'Test project', createdById, ...data } })
}
