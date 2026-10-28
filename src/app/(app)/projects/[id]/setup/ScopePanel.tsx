'use client'

import { Alert, Button, FileInput, Group, Paper, Stack, Tabs, Text, Textarea } from '@mantine/core'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

const MAX_FILE_BYTES = 10 * 1024 * 1024

type Scope = { fileName: string; fileType: string } | null

/** FR-3: upload or paste the scope; replaceable until the requirements are confirmed (Q13). */
export function ScopePanel({ projectId, scope }: { projectId: string; scope: Scope }) {
  const router = useRouter()
  const [open, setOpen] = useState(!scope)
  const [tab, setTab] = useState<string | null>('file')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  if (!open && scope)
    return (
      <Group>
        <Text size="sm">
          Scope: <b>{scope.fileName}</b> ({scope.fileType})
        </Text>
        <Button size="xs" variant="default" onClick={() => setOpen(true)}>
          Replace scope
        </Button>
      </Group>
    )

  const submit = () =>
    start(async () => {
      if (tab === 'file' && file && file.size > MAX_FILE_BYTES) return setError('The file is larger than 10 MB.')
      const body = new FormData()
      if (tab === 'file' && file) body.set('file', file)
      if (tab === 'paste') body.set('text', text)
      const res = await fetch(`/api/projects/${projectId}/scope`, { method: 'POST', body })
      const json: { error?: string } = await res.json().catch(() => ({ error: `Upload failed (HTTP ${res.status}).` }))
      if (json.error) return setError(json.error)
      setError(undefined)
      setOpen(false)
      setFile(null)
      setText('')
      router.refresh()
    })

  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{scope ? 'Replace the scope' : 'Add the client scope'}</Text>
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="file">Upload PDF or DOCX</Tabs.Tab>
            <Tabs.Tab value="paste">Paste text</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="file" pt="sm">
            <FileInput
              accept=".pdf,.docx"
              placeholder="Choose a file (max 10 MB)"
              value={file}
              onChange={setFile}
              clearable
            />
          </Tabs.Panel>
          <Tabs.Panel value="paste" pt="sm">
            <Textarea
              placeholder="Paste the scope text"
              autosize
              minRows={6}
              maxRows={16}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
            />
          </Tabs.Panel>
        </Tabs>
        {error && <Alert color="red">{error}</Alert>}
        <Group>
          <Button onClick={submit} loading={pending} disabled={tab === 'file' ? !file : !text.trim()}>
            Extract text
          </Button>
          {scope && (
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  )
}
