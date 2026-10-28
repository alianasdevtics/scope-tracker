import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePM } from './auth'
import { UserError } from './errors'

/**
 * Body of every PM-only server action: role check first, then expected failures become
 * `{ error }` (thrown messages are hidden from the client in production). Auth interrupts
 * and bugs still throw.
 */
export async function pmAction(fn: (userId: string) => Promise<unknown>): Promise<{ error?: string }> {
  const user = await requirePM()
  try {
    await fn(user.id)
  } catch (e) {
    if (e instanceof UserError) return { error: e.message }
    if (e instanceof z.ZodError) return { error: e.issues.map((i) => i.message).join('; ') }
    throw e
  }
  revalidatePath('/projects', 'layout')
  return {}
}
