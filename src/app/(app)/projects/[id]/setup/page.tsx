import { Alert, Grid, GridCol, Paper, ScrollArea, Stack, Text } from '@mantine/core'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { RequirementsEditor } from './RequirementsEditor'
import { ScopePanel } from './ScopePanel'

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const project = await db.project.findUnique({
    where: { id },
    include: {
      scope: true,
      requirements: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          code: true,
          module: true,
          title: true,
          description: true,
          scopeExcerpt: true,
          criteria: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, text: true } },
        },
      },
    },
  })
  if (!project) notFound()
  const editable = user.role === 'PM' && project.status === 'ACTIVE'
  const { scope } = project

  return (
    <Stack>
      {project.confirmedAt ? (
        <Alert color="green">
          Requirements confirmed on {project.confirmedAt.toLocaleString('en-GB')}. The scope is locked; requirements can
          still be edited.
        </Alert>
      ) : (
        <Text size="sm" c="dimmed">
          Setup: add the scope, check the extracted text, enter the requirements beside it, then confirm the list.
        </Text>
      )}
      {editable && !project.confirmedAt && (
        <ScopePanel projectId={id} scope={scope && { fileName: scope.fileName, fileType: scope.fileType }} />
      )}
      <Grid gap="lg">
        <GridCol span={5}>
          <Paper withBorder p="sm">
            <Text fw={600} mb={4}>
              Extracted scope text
            </Text>
            {scope ? (
              <>
                <Text size="xs" c="dimmed" mb="xs">
                  {scope.fileName} · {scope.fileType} · {scope.extractedText.length.toLocaleString()} characters
                </Text>
                <ScrollArea h="70vh" type="auto">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {scope.extractedText}
                  </Text>
                </ScrollArea>
              </>
            ) : (
              <Text c="dimmed" size="sm">
                No scope added yet.
              </Text>
            )}
          </Paper>
        </GridCol>
        <GridCol span={7}>
          <RequirementsEditor
            projectId={id}
            requirements={project.requirements}
            canEdit={editable}
            canConfirm={editable && !project.confirmedAt}
          />
        </GridCol>
      </Grid>
    </Stack>
  )
}
