'use client'

import { Autocomplete, Badge, Button, Group, Paper, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
import { useState } from 'react'
import { useAction } from '@/components/client'
import {
  addCriterionAction,
  confirmRequirementsAction,
  createRequirementAction,
  deleteCriterionAction,
  deleteRequirementAction,
  updateCriterionAction,
  updateRequirementAction,
} from './actions'

type Criterion = { id: string; text: string }
type Req = {
  id: string
  code: string
  module: string
  title: string
  description: string
  scopeExcerpt: string | null
  criteria: Criterion[]
}
type FormValues = { module: string; title: string; description: string; criteria: string[] }
type Result = Promise<{ error?: string }>

export function RequirementsEditor({
  projectId,
  requirements,
  canEdit,
  canConfirm,
}: {
  projectId: string
  requirements: Req[]
  canEdit: boolean
  canConfirm: boolean
}) {
  const [adding, setAdding] = useState(false)
  const confirm = useAction()
  const modules = [...new Set(requirements.map((r) => r.module))]

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={4}>Requirements ({requirements.length})</Title>
        {canEdit && !adding && (
          <Button size="xs" onClick={() => setAdding(true)}>
            Add requirement
          </Button>
        )}
      </Group>
      {adding && (
        <RequirementForm
          modules={modules}
          withCriteria
          onSave={(v) => createRequirementAction(projectId, v)}
          onClose={() => setAdding(false)}
        />
      )}
      {requirements.length === 0 && !adding && <Text c="dimmed">No requirements yet.</Text>}
      {modules.map((m) => (
        <Stack key={m} gap="xs">
          <Text fw={700} tt="uppercase" size="xs" c="dimmed">
            {m}
          </Text>
          {requirements
            .filter((r) => r.module === m)
            .map((r) => (
              <RequirementCard key={r.id} req={r} modules={modules} canEdit={canEdit} />
            ))}
        </Stack>
      ))}
      {canConfirm && (
        <Paper withBorder p="md" bg="gray.0">
          <Group justify="space-between">
            <Text size="sm">When the list is complete, confirm it to make the board live. You can still edit afterwards.</Text>
            <Button
              color="green"
              loading={confirm.pending}
              disabled={!requirements.length}
              onClick={() => window.confirm('Confirm the requirement list?') && confirm.run(() => confirmRequirementsAction(projectId))}
            >
              Confirm requirements
            </Button>
          </Group>
          {confirm.error && (
            <Text c="red" size="sm" mt="xs">
              {confirm.error}
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  )
}

function RequirementForm({
  initial,
  modules,
  withCriteria,
  onSave,
  onClose,
}: {
  initial?: Req
  modules: string[]
  withCriteria?: boolean
  onSave: (v: FormValues) => Result
  onClose: () => void
}) {
  const [module, setModule] = useState(initial?.module ?? '')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [criteria, setCriteria] = useState('')
  const { run, pending, error } = useAction()

  return (
    <Paper withBorder p="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => onSave({ module, title, description, criteria: criteria.split('\n') }), onClose)
        }}
      >
        <Stack gap="xs">
          <Group grow align="flex-start">
            <Autocomplete label="Module" data={modules} value={module} onChange={setModule} required />
            <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required />
          </Group>
          <Textarea
            label="Description"
            autosize
            minRows={2}
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
          />
          {withCriteria && (
            <Textarea
              label="Acceptance criteria"
              description="One per line"
              autosize
              minRows={3}
              value={criteria}
              onChange={(e) => setCriteria(e.currentTarget.value)}
            />
          )}
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button size="xs" type="submit" loading={pending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  )
}

function RequirementCard({ req, modules, canEdit }: { req: Req; modules: string[]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const { run, pending, error } = useAction()

  if (editing)
    return (
      <RequirementForm
        initial={req}
        modules={modules}
        onSave={(v) => updateRequirementAction(req.id, v)}
        onClose={() => setEditing(false)}
      />
    )

  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Badge variant="outline" style={{ flexShrink: 0 }}>
            {req.code}
          </Badge>
          <Text fw={600} size="sm">
            {req.title}
          </Text>
        </Group>
        {canEdit && (
          <Group gap={4} wrap="nowrap">
            <Button size="compact-xs" variant="subtle" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              color="red"
              loading={pending}
              onClick={() =>
                window.confirm(`Delete ${req.code}? Its ID will not be reused.`) && run(() => deleteRequirementAction(req.id))
              }
            >
              Delete
            </Button>
          </Group>
        )}
      </Group>
      {req.description && (
        <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
          {req.description}
        </Text>
      )}
      {req.scopeExcerpt && (
        <Text size="xs" c="dimmed" fs="italic" mt={4}>
          From scope: “{req.scopeExcerpt}”
        </Text>
      )}
      <Stack gap={2} mt="xs">
        {req.criteria.map((c) => (
          <CriterionRow key={c.id} criterion={c} canEdit={canEdit} />
        ))}
        {req.criteria.length === 0 && (
          <Text size="xs" c="dimmed">
            No acceptance criteria.
          </Text>
        )}
      </Stack>
      {canEdit && <AddCriterion requirementId={req.id} />}
      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
    </Paper>
  )
}

function CriterionRow({ criterion, canEdit }: { criterion: Criterion; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(criterion.text)
  const { run, pending, error } = useAction()

  if (editing)
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(() => updateCriterionAction(criterion.id, text), () => setEditing(false))
        }}
      >
        <Group gap="xs" wrap="nowrap">
          <TextInput size="xs" style={{ flex: 1 }} value={text} onChange={(e) => setText(e.currentTarget.value)} required />
          <Button size="compact-xs" type="submit" loading={pending}>
            Save
          </Button>
          <Button size="compact-xs" variant="default" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </Group>
        {error && (
          <Text c="red" size="xs">
            {error}
          </Text>
        )}
      </form>
    )

  return (
    <Group gap="xs" wrap="nowrap" justify="space-between">
      <Text size="sm">• {criterion.text}</Text>
      {canEdit && (
        <Group gap={4} wrap="nowrap">
          <Button size="compact-xs" variant="subtle" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            loading={pending}
            onClick={() => window.confirm('Delete this criterion?') && run(() => deleteCriterionAction(criterion.id))}
          >
            Delete
          </Button>
        </Group>
      )}
    </Group>
  )
}

function AddCriterion({ requirementId }: { requirementId: string }) {
  const [text, setText] = useState('')
  const { run, pending, error } = useAction()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        run(() => addCriterionAction(requirementId, text), () => setText(''))
      }}
    >
      <Group gap="xs" mt="xs" wrap="nowrap">
        <TextInput
          size="xs"
          style={{ flex: 1 }}
          placeholder="Add acceptance criterion"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          required
        />
        <Button size="compact-xs" type="submit" variant="light" loading={pending}>
          Add
        </Button>
      </Group>
      {error && (
        <Text c="red" size="xs">
          {error}
        </Text>
      )}
    </form>
  )
}
