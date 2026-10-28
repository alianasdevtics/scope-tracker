import { notFound } from 'next/navigation'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { db } from './db'
import { UserError } from './errors'

type Tx = Prisma.TransactionClient

export const requirementInput = z.object({
  module: z.string().trim().min(1, 'Module is required').max(100),
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().trim().max(5000).default(''),
})
export const criterionText = z.string().trim().min(1, 'Criterion text is required').max(1000)

/** Loads a project for a change; archived projects are read-only (Q12). */
export async function getEditableProject(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } })
  if (!project) notFound()
  if (project.status === 'ARCHIVED') throw new UserError('This project is archived and read-only.')
  return project
}

/** Live (not deleted) requirement in an editable project. */
export async function getEditableRequirement(requirementId: string) {
  const req = await db.requirement.findFirst({ where: { id: requirementId, deletedAt: null } })
  if (!req) throw new UserError('Requirement not found.')
  await getEditableProject(req.projectId)
  return req
}

/** FR-6: the increment row-locks the project, so concurrent calls never collide and numbers are never reused. */
async function nextCode(tx: Tx, projectId: string) {
  const { nextReqNumber } = await tx.project.update({
    where: { id: projectId },
    data: { nextReqNumber: { increment: 1 } },
    select: { nextReqNumber: true },
  })
  return `REQ-${nextReqNumber - 1}`
}

const logEdit = (tx: Tx, requirementId: string, actorId: string | null, detail: string) =>
  tx.activityLog.create({ data: { requirementId, cause: 'MANUAL_EDIT', actorId, detail } })

const quote = (s: string) => `"${s.length > 80 ? `${s.slice(0, 77)}...` : s}"`

export async function createRequirement(
  projectId: string,
  input: z.input<typeof requirementInput> & { criteria: string[]; source: 'SCOPE' | 'CLARIFICATION' | 'MANUAL'; scopeExcerpt?: string },
  actorId: string | null,
) {
  const fields = requirementInput.parse(input)
  const criteria = input.criteria.map((c) => criterionText.parse(c))
  return db.$transaction(async (tx) => {
    const code = await nextCode(tx, projectId)
    const req = await tx.requirement.create({
      data: {
        projectId,
        code,
        ...fields,
        source: input.source,
        scopeExcerpt: input.scopeExcerpt,
        criteria: { create: criteria.map((text) => ({ text })) },
      },
    })
    await logEdit(tx, req.id, actorId, `Created with ${criteria.length} criteria`)
    return req
  })
}

export async function updateRequirement(requirementId: string, input: z.input<typeof requirementInput>, actorId: string) {
  const before = await getEditableRequirement(requirementId)
  const after = requirementInput.parse(input)
  const changes = (['module', 'title', 'description'] as const)
    .filter((k) => before[k] !== after[k])
    .map((k) => (k === 'description' ? 'description' : `${k} ${quote(before[k])} → ${quote(after[k])}`))
  if (!changes.length) return
  await db.$transaction(async (tx) => {
    await tx.requirement.update({ where: { id: requirementId }, data: after })
    await logEdit(tx, requirementId, actorId, `Edited ${changes.join(', ')}`)
  })
}

export async function deleteRequirement(requirementId: string, actorId: string) {
  await getEditableRequirement(requirementId)
  await db.$transaction(async (tx) => {
    await tx.requirement.update({ where: { id: requirementId }, data: { deletedAt: new Date() } })
    await logEdit(tx, requirementId, actorId, 'Deleted')
  })
}

export async function addCriterion(requirementId: string, text: string, actorId: string) {
  await getEditableRequirement(requirementId)
  const clean = criterionText.parse(text)
  await db.$transaction(async (tx) => {
    await tx.acceptanceCriterion.create({ data: { requirementId, text: clean } })
    await logEdit(tx, requirementId, actorId, `Criterion added: ${quote(clean)}`)
  })
}

async function getEditableCriterion(criterionId: string) {
  const c = await db.acceptanceCriterion.findFirst({ where: { id: criterionId, deletedAt: null } })
  if (!c) throw new UserError('Criterion not found.')
  await getEditableRequirement(c.requirementId)
  return c
}

export async function updateCriterion(criterionId: string, text: string, actorId: string) {
  const c = await getEditableCriterion(criterionId)
  const clean = criterionText.parse(text)
  if (clean === c.text) return
  await db.$transaction(async (tx) => {
    await tx.acceptanceCriterion.update({ where: { id: criterionId }, data: { text: clean } })
    await logEdit(tx, c.requirementId, actorId, `Criterion edited: ${quote(c.text)} → ${quote(clean)}`)
  })
}

export async function deleteCriterion(criterionId: string, actorId: string) {
  const c = await getEditableCriterion(criterionId)
  await db.$transaction(async (tx) => {
    await tx.acceptanceCriterion.update({ where: { id: criterionId }, data: { deletedAt: new Date() } })
    await logEdit(tx, c.requirementId, actorId, `Criterion deleted: ${quote(c.text)}`)
  })
}

/** FR-12. */
export async function confirmRequirements(projectId: string) {
  const project = await getEditableProject(projectId)
  if (project.confirmedAt) throw new UserError('Requirements are already confirmed.')
  const count = await db.requirement.count({ where: { projectId, deletedAt: null } })
  if (!count) throw new UserError('Add at least one requirement before confirming.')
  await db.project.update({ where: { id: projectId }, data: { confirmedAt: new Date() } })
}
