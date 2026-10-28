'use client'

import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useAction } from '@/components/client'
import { renameProject, setArchived } from '../actions'

export function ProjectActions({ projectId, name, archived }: { projectId: string; name: string; archived: boolean }) {
  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(name)
  const { run, pending, error } = useAction()

  return (
    <Group gap="xs">
      {!archived && (
        <Button size="xs" variant="default" onClick={() => setRenaming(true)}>
          Rename
        </Button>
      )}
      <Button
        size="xs"
        variant="default"
        loading={pending && !renaming}
        onClick={() =>
          (archived || confirm('Archive this project? It becomes read-only and its webhooks are ignored.')) &&
          run(() => setArchived(projectId, !archived))
        }
      >
        {archived ? 'Unarchive' : 'Archive'}
      </Button>
      {error && !renaming && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}
      <Modal opened={renaming} onClose={() => setRenaming(false)} title="Rename project">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(() => renameProject(projectId, value), () => setRenaming(false))
          }}
        >
          <Stack>
            <TextInput value={value} onChange={(e) => setValue(e.currentTarget.value)} required data-autofocus />
            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </Group>
  )
}
