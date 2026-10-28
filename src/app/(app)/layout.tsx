import { Badge, Button, Container, Group, Text } from '@mantine/core'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { logout, requireUser } from '@/lib/auth'
import { aiLabel } from '@/lib/env'

async function doLogout() {
  'use server'
  await logout()
  redirect('/login')
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return (
    <>
      <Group justify="space-between" px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Group>
          <Link href="/projects" style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
            Scope Tracker
          </Link>
          <Badge variant="light" color={aiLabel === 'AI off' ? 'gray' : 'violet'}>
            {aiLabel}
          </Badge>
        </Group>
        <Group>
          <Text size="sm">
            {user.name} · {user.role === 'PM' ? 'PM' : 'Member'}
          </Text>
          <form action={doLogout}>
            <Button type="submit" size="xs" variant="default">
              Log out
            </Button>
          </form>
        </Group>
      </Group>
      <Container size="xl" py="lg">
        {children}
      </Container>
    </>
  )
}
