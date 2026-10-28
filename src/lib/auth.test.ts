import bcrypt from 'bcryptjs'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject } from '@/app/(app)/projects/actions'
import { login, logout, requirePM, requireUser } from './auth'
import { db } from './db'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
  forbidden: () => {
    throw new Error('FORBIDDEN')
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const form = (data: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(data)) f.set(k, v)
  return f
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('pw', 4)
  await db.user.createMany({
    data: [
      { email: 'pm@t.test', name: 'PM', role: 'PM', passwordHash },
      { email: 'member@t.test', name: 'Member', role: 'MEMBER', passwordHash },
    ],
  })
})

beforeEach(() => jar.clear())

describe('auth', () => {
  it('rejects a wrong password or unknown email without setting a cookie', async () => {
    expect(await login('pm@t.test', 'nope')).toBe(false)
    expect(await login('ghost@t.test', 'pw')).toBe(false)
    expect(jar.size).toBe(0)
  })

  it('redirects to /login without a session', async () => {
    await expect(requireUser()).rejects.toThrow('REDIRECT /login')
  })

  it('lets a PM through requirePM', async () => {
    expect(await login('PM@t.test ', 'pw')).toBe(true)
    expect((await requirePM()).role).toBe('PM')
  })

  it('lets a Member view but blocks PM-only checks', async () => {
    await login('member@t.test', 'pw')
    expect((await requireUser()).role).toBe('MEMBER')
    await expect(requirePM()).rejects.toThrow('FORBIDDEN')
  })

  it('blocks a Member calling a PM server action directly', async () => {
    await login('member@t.test', 'pw')
    await expect(createProject(form({ name: 'Sneaky' }))).rejects.toThrow('FORBIDDEN')
    expect(await db.project.count({ where: { name: 'Sneaky' } })).toBe(0)
  })

  it('lets a PM run the same action', async () => {
    await login('pm@t.test', 'pw')
    await createProject(form({ name: 'Legit' }))
    expect(await db.project.count({ where: { name: 'Legit' } })).toBe(1)
  })

  it('treats an expired session as logged out', async () => {
    await login('pm@t.test', 'pw')
    await db.session.updateMany({ data: { expiresAt: new Date(0) } })
    await expect(requireUser()).rejects.toThrow('REDIRECT /login')
  })

  it('logout deletes the session row and the cookie', async () => {
    await login('pm@t.test', 'pw')
    const before = await db.session.count()
    await logout()
    expect(jar.size).toBe(0)
    expect(await db.session.count()).toBe(before - 1)
  })
})
