import {
  Badge,
  Button,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { AnchorLink } from '@/components/client'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { STATUSES, STATUS_COLOR, STATUS_LABEL } from '@/lib/labels'
import { createProject } from './actions'

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const showArchived = (await searchParams).archived === '1'
  const user = await requireUser()
  const projects = await db.project.findMany({
    where: showArchived ? {} : { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
  const counts = await db.requirement.groupBy({
    by: ['projectId', 'status'],
    where: { deletedAt: null, projectId: { in: projects.map((p) => p.id) } },
    _count: true,
  })
  const count = (projectId: string, status: string) =>
    counts.find((c) => c.projectId === projectId && c.status === status)?._count ?? 0

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Projects</Title>
        <AnchorLink href={showArchived ? '/projects' : '/projects?archived=1'} size="sm">
          {showArchived ? 'Hide archived' : 'Show archived'}
        </AnchorLink>
      </Group>
      {user.role === 'PM' && (
        <form action={createProject}>
          <Group>
            <TextInput name="name" placeholder="New project name" required />
            <Button type="submit">Create project</Button>
          </Group>
        </form>
      )}
      {projects.length === 0 ? (
        <Text c="dimmed">No projects yet.</Text>
      ) : (
        <Table highlightOnHover>
          <TableThead>
            <TableTr>
              <TableTh>Project</TableTh>
              {STATUSES.map((s) => (
                <TableTh key={s}>{STATUS_LABEL[s]}</TableTh>
              ))}
              <TableTh>State</TableTh>
            </TableTr>
          </TableThead>
          <TableTbody>
            {projects.map((p) => (
              <TableTr key={p.id}>
                <TableTd>
                  <AnchorLink href={`/projects/${p.id}`} fw={600}>
                    {p.name}
                  </AnchorLink>
                </TableTd>
                {STATUSES.map((s) => (
                  <TableTd key={s}>
                    <Badge color={STATUS_COLOR[s]} variant={count(p.id, s) ? 'filled' : 'light'}>
                      {count(p.id, s)}
                    </Badge>
                  </TableTd>
                ))}
                <TableTd>
                  <Text size="sm" c="dimmed">
                    {p.status === 'ARCHIVED' ? 'Archived' : p.confirmedAt ? 'Live' : 'Setup'}
                  </Text>
                </TableTd>
              </TableTr>
            ))}
          </TableTbody>
        </Table>
      )}
    </Stack>
  )
}
