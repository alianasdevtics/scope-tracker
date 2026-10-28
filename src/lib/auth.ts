import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { forbidden, redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from './db'

const COOKIE = 'session'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
// Compared against when the email is unknown, so both failure paths cost the same.
const DUMMY_HASH = bcrypt.hashSync('dummy', 10)

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !ok) return false

  const token = randomBytes(32).toString('base64url')
  await db.session.create({
    data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + TTL_MS) },
  })
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_MS / 1000,
  })
  return true
}

export async function logout() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } })
  jar.delete(COOKIE)
}

export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  if (!session || session.expiresAt < new Date()) return null
  return session.user
})

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}

/** Call first in every PM-only server action and route handler. */
export async function requirePM() {
  const user = await requireUser()
  if (user.role !== 'PM') forbidden()
  return user
}
