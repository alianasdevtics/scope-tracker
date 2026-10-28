import { Alert, Button, Container, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { login } from '@/lib/auth'

const credentials = z.object({ email: z.string().trim().min(1).max(320), password: z.string().min(1).max(200) })

async function doLogin(formData: FormData) {
  'use server'
  const input = credentials.safeParse(Object.fromEntries(formData))
  const ok = input.success && (await login(input.data.email, input.data.password))
  redirect(ok ? '/projects' : '/login?error=1')
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <Container size={380} py={80}>
      <Title order={2} mb="lg">
        Scope Tracker
      </Title>
      <Paper withBorder p="lg" radius="md">
        <form action={doLogin}>
          <Stack>
            {error && <Alert color="red">Wrong email or password.</Alert>}
            <TextInput name="email" type="email" label="Email" required autoFocus />
            <PasswordInput name="password" label="Password" required />
            <Button type="submit">Log in</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
