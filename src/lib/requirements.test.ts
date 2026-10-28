import { describe, expect, it } from 'vitest'
import { renameProject, setArchived } from '@/app/(app)/projects/actions'
import {
  addCriterionAction,
  confirmRequirementsAction,
  createRequirementAction,
  deleteCriterionAction,
  deleteRequirementAction,
  updateCriterionAction,
  updateRequirementAction,
} from '@/app/(app)/projects/[id]/setup/actions'
import { makeProject, signIn } from '../../test/helpers'
import { db } from './db'

const fields = (title: string) => ({ module: 'Accounts', title, description: '', criteria: ['Works'] })
const codes = async (projectId: string) =>
  (await db.requirement.findMany({ where: { projectId, deletedAt: null }, orderBy: { createdAt: 'asc' } })).map((r) => r.code)
const reqByCode = (projectId: string, code: string) => db.requirement.findFirstOrThrow({ where: { projectId, code } })
const log = (requirementId: string) => db.activityLog.findMany({ where: { requirementId }, orderBy: { createdAt: 'asc' } })

describe('requirement IDs (FR-6)', () => {
  it('never reuses a number after deletion', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('A'))
    await createRequirementAction(p.id, fields('B'))
    expect(await codes(p.id)).toEqual(['REQ-1', 'REQ-2'])

    await deleteRequirementAction((await reqByCode(p.id, 'REQ-2')).id)
    await createRequirementAction(p.id, fields('C'))
    expect(await codes(p.id)).toEqual(['REQ-1', 'REQ-3'])
    expect((await reqByCode(p.id, 'REQ-2')).deletedAt).not.toBeNull() // soft delete keeps the row
  })

  it('hands out unique numbers to concurrent creations', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await Promise.all(Array.from({ length: 6 }, (_, i) => createRequirementAction(p.id, fields(`R${i}`))))
    expect((await codes(p.id)).sort()).toEqual(['REQ-1', 'REQ-2', 'REQ-3', 'REQ-4', 'REQ-5', 'REQ-6'])
  })

  it('numbers each project independently', async () => {
    const pm = await signIn('PM')
    const [p1, p2] = [await makeProject(pm.id), await makeProject(pm.id)]
    await createRequirementAction(p1.id, fields('A'))
    await createRequirementAction(p2.id, fields('B'))
    expect(await codes(p2.id)).toEqual(['REQ-1'])
  })
})

describe('editing requirements and criteria (FR-11)', () => {
  it('stores manual requirements with their criteria and source', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, { module: ' Checkout ', title: 'Pay by card', description: 'd', criteria: ['Visa works', '  ', 'Errors shown'] })
    const r = await db.requirement.findFirstOrThrow({ where: { projectId: p.id }, include: { criteria: true } })
    expect(r).toMatchObject({ module: 'Checkout', source: 'MANUAL', status: 'NOT_STARTED' })
    expect(r.criteria.map((c) => c.text).sort()).toEqual(['Errors shown', 'Visa works'])
  })

  it('logs every edit with the acting PM, and soft-deletes criteria', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('Login'))
    const r = await reqByCode(p.id, 'REQ-1')

    await updateRequirementAction(r.id, { module: 'Accounts', title: 'Log in', description: 'With email' })
    await addCriterionAction(r.id, 'Bad password shows an error')
    const added = await db.acceptanceCriterion.findFirstOrThrow({ where: { requirementId: r.id, text: 'Bad password shows an error' } })
    await updateCriterionAction(added.id, 'Wrong password shows an error')
    await deleteCriterionAction(added.id)
    await deleteRequirementAction(r.id)

    const entries = await log(r.id)
    expect(entries.map((e) => e.detail)).toEqual([
      'Created with 1 criteria',
      'Edited title "Login" → "Log in", description',
      'Criterion added: "Bad password shows an error"',
      'Criterion edited: "Bad password shows an error" → "Wrong password shows an error"',
      'Criterion deleted: "Wrong password shows an error"',
      'Deleted',
    ])
    expect(entries.every((e) => e.cause === 'MANUAL_EDIT' && e.actorId === pm.id && e.toStatus === null)).toBe(true)
    expect((await db.acceptanceCriterion.findUniqueOrThrow({ where: { id: added.id } })).deletedAt).not.toBeNull()
  })

  it('does not log a no-op edit', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('Same'))
    const r = await reqByCode(p.id, 'REQ-1')
    await updateRequirementAction(r.id, { module: 'Accounts', title: 'Same', description: '' })
    expect(await log(r.id)).toHaveLength(1)
  })

  it('returns validation errors instead of throwing', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    expect(await createRequirementAction(p.id, { ...fields(''), title: '  ' })).toEqual({ error: 'Title is required' })
    expect(await codes(p.id)).toEqual([])
  })

  it('cannot edit a deleted requirement', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('Gone'))
    const r = await reqByCode(p.id, 'REQ-1')
    await deleteRequirementAction(r.id)
    expect(await addCriterionAction(r.id, 'x')).toEqual({ error: 'Requirement not found.' })
  })
})

describe('roles and archived projects', () => {
  it('blocks a Member from every requirement action at the server', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('A'))
    const r = await reqByCode(p.id, 'REQ-1')

    await signIn('MEMBER')
    await expect(createRequirementAction(p.id, fields('B'))).rejects.toThrow('FORBIDDEN')
    await expect(updateRequirementAction(r.id, fields('X'))).rejects.toThrow('FORBIDDEN')
    await expect(deleteRequirementAction(r.id)).rejects.toThrow('FORBIDDEN')
    await expect(addCriterionAction(r.id, 'x')).rejects.toThrow('FORBIDDEN')
    await expect(confirmRequirementsAction(p.id)).rejects.toThrow('FORBIDDEN')
    await expect(renameProject(p.id, 'X')).rejects.toThrow('FORBIDDEN')
    await expect(setArchived(p.id, true)).rejects.toThrow('FORBIDDEN')
    expect(await codes(p.id)).toEqual(['REQ-1'])
  })

  it('makes an archived project read-only until it is unarchived (Q12)', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await createRequirementAction(p.id, fields('A'))
    const r = await reqByCode(p.id, 'REQ-1')

    await setArchived(p.id, true)
    const readOnly = { error: 'This project is archived and read-only.' }
    expect(await createRequirementAction(p.id, fields('B'))).toEqual(readOnly)
    expect(await updateRequirementAction(r.id, fields('X'))).toEqual(readOnly)
    expect(await addCriterionAction(r.id, 'x')).toEqual(readOnly)
    expect(await renameProject(p.id, 'New')).toEqual(readOnly)

    await setArchived(p.id, false)
    expect(await renameProject(p.id, 'New')).toEqual({})
    expect((await db.project.findUniqueOrThrow({ where: { id: p.id } })).name).toBe('New')
  })
})

describe('confirming the list (FR-12)', () => {
  it('needs at least one requirement and can only happen once', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    expect(await confirmRequirementsAction(p.id)).toEqual({ error: 'Add at least one requirement before confirming.' })

    await createRequirementAction(p.id, fields('A'))
    expect(await confirmRequirementsAction(p.id)).toEqual({})
    expect((await db.project.findUniqueOrThrow({ where: { id: p.id } })).confirmedAt).not.toBeNull()
    expect(await confirmRequirementsAction(p.id)).toEqual({ error: 'Requirements are already confirmed.' })
  })

  it('still allows requirement edits after confirmation', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id, { confirmedAt: new Date() })
    expect(await createRequirementAction(p.id, fields('Late addition'))).toEqual({})
  })
})
