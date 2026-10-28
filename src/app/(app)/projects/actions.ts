'use server'

import { revalidatePath } from 'next/cache'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { pmAction } from '@/lib/actions'
import { requirePM } from '@/lib/auth'
import { db } from '@/lib/db'
import { getEditableProject } from '@/lib/requirements'

const projectName = z.string().trim().min(1, 'Name is required').max(200)

export async function createProject(formData: FormData) {
  const user = await requirePM()
  await db.project.create({ data: { name: projectName.parse(formData.get('name')), createdById: user.id } })
  revalidatePath('/projects')
}

export async function renameProject(projectId: string, name: string) {
  return pmAction(async () => {
    await getEditableProject(projectId)
    await db.project.update({ where: { id: projectId }, data: { name: projectName.parse(name) } })
  })
}

export async function setArchived(projectId: string, archived: boolean) {
  return pmAction(async () => {
    if (!(await db.project.findUnique({ where: { id: projectId } }))) notFound()
    await db.project.update({ where: { id: projectId }, data: { status: z.boolean().parse(archived) ? 'ARCHIVED' : 'ACTIVE' } })
  })
}
