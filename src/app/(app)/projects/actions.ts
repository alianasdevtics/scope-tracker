'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requirePM } from '@/lib/auth'
import { db } from '@/lib/db'

const projectName = z.string().trim().min(1).max(200)

export async function createProject(formData: FormData) {
  const user = await requirePM()
  await db.project.create({ data: { name: projectName.parse(formData.get('name')), createdById: user.id } })
  revalidatePath('/projects')
}
