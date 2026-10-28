import { vi } from 'vitest'

// Next.js request APIs don't exist outside a request; these stand-ins make auth interrupts assertable.
vi.mock('next/headers', async () => {
  const { jar } = await import('./jar')
  return {
    cookies: async () => ({
      get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k),
    }),
  }
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
  forbidden: () => {
    throw new Error('FORBIDDEN')
  },
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))
