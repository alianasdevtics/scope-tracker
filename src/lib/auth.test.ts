import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '@/app/(app)/projects/actions'
import { form, jar, makeUser, signIn } from '../../test/helpers'
import { login, logout, requirePM, requireUser } from './auth'
import { db } from './db'

beforeEach(() => jar.clear())

describe('auth', () => {
  it('rejects a wrong password or unknown email without setting a cookie', async () => {
    const pm = await makeUser('PM')
    expect(await login(pm.email, 'nope')).toBe(false)
    expect(await login('ghost@t.test', 'pw')).toBe(false)
    expect(jar.size).toBe(0)
  })

  it('redirects to /login without a session', async () => {
    await expect(requireUser()).rejects.toThrow('REDIRECT /login')
  })

  it('normalises the email and lets a PM through requirePM', async () => {
    const pm = await makeUser('PM')
    expect(await login(` ${pm.email.toUpperCase()} `, 'pw')).toBe(true)
    expect((await requirePM()).role).toBe('PM')
  })

  it('lets a Member view but blocks PM-only checks', async () => {
    await signIn('MEMBER')
    expect((await requireUser()).role).toBe('MEMBER')
    await expect(requirePM()).rejects.toThrow('FORBIDDEN')
  })

  it('blocks a Member calling a PM server action directly', async () => {
    await signIn('MEMBER')
    await expect(createProject(form({ name: 'Sneaky' }))).rejects.toThrow('FORBIDDEN')
    expect(await db.project.count({ where: { name: 'Sneaky' } })).toBe(0)
  })

  it('lets a PM run the same action', async () => {
    await signIn('PM')
    await createProject(form({ name: 'Legit' }))
    expect(await db.project.count({ where: { name: 'Legit' } })).toBe(1)
  })

  it('treats an expired session as logged out', async () => {
    const pm = await signIn('PM')
    await db.session.updateMany({ where: { userId: pm.id }, data: { expiresAt: new Date(0) } })
    await expect(requireUser()).rejects.toThrow('REDIRECT /login')
  })

  it('logout deletes the session row and the cookie', async () => {
    const pm = await signIn('PM')
    await logout()
    expect(jar.size).toBe(0)
    expect(await db.session.count({ where: { userId: pm.id } })).toBe(0)
  })
})
