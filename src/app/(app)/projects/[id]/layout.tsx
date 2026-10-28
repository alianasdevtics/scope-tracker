import { Badge, Group, Stack, Title } from '@mantine/core'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ProjectTabs } from '@/components/client'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProjectActions } from './ProjectActions'

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const project = await db.project.findUnique({ where: { id } })
  if (!project) notFound()
  const archived = project.status === 'ARCHIVED'

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="sm">
          <Title order={2}>{project.name}</Title>
          {archived && <Badge color="gray">Archived</Badge>}
          {!project.confirmedAt && <Badge variant="light">Setup</Badge>}
        </Group>
        {user.role === 'PM' && <ProjectActions projectId={id} name={project.name} archived={archived} />}
      </Group>
      <ProjectTabs projectId={id} tabs={[{ slug: 'setup', label: 'Scope & requirements' }]} />
      {children}
    </Stack>
  )
}
