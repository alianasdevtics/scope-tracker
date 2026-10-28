import { Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createProject } from './actions'

export default async function ProjectsPage() {
  const user = await requireUser()
  const projects = await db.project.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <Stack>
      <Title order={2}>Projects</Title>
      {user.role === 'PM' && (
        <form action={createProject}>
          <Group>
            <TextInput name="name" placeholder="New project name" required />
            <Button type="submit">Create project</Button>
          </Group>
        </form>
      )}
      {projects.length === 0 && <Text c="dimmed">No projects yet.</Text>}
      {projects.map((p) => (
        <Paper key={p.id} withBorder p="md">
          <Text fw={600}>{p.name}</Text>
        </Paper>
      ))}
    </Stack>
  )
}
