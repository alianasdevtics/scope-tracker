'use server'

import { z } from 'zod'
import { pmAction } from '@/lib/actions'
import {
  addCriterion,
  confirmRequirements,
  createRequirement,
  deleteCriterion,
  deleteRequirement,
  getEditableProject,
  updateCriterion,
  updateRequirement,
} from '@/lib/requirements'

type Fields = { module: string; title: string; description: string }

export async function createRequirementAction(projectId: string, input: Fields & { criteria: string[] }) {
  return pmAction(async (userId) => {
    await getEditableProject(projectId)
    const criteria = z.array(z.string()).max(200).parse(input.criteria).filter((c) => c.trim())
    await createRequirement(projectId, { ...input, criteria, source: 'MANUAL' }, userId)
  })
}

export async function updateRequirementAction(requirementId: string, input: Fields) {
  return pmAction((userId) => updateRequirement(requirementId, input, userId))
}

export async function deleteRequirementAction(requirementId: string) {
  return pmAction((userId) => deleteRequirement(requirementId, userId))
}

export async function addCriterionAction(requirementId: string, text: string) {
  return pmAction((userId) => addCriterion(requirementId, text, userId))
}

export async function updateCriterionAction(criterionId: string, text: string) {
  return pmAction((userId) => updateCriterion(criterionId, text, userId))
}

export async function deleteCriterionAction(criterionId: string) {
  return pmAction((userId) => deleteCriterion(criterionId, userId))
}

export async function confirmRequirementsAction(projectId: string) {
  return pmAction(() => confirmRequirements(projectId))
}
