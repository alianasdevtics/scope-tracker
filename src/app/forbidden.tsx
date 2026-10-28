import { Container, Text, Title } from '@mantine/core'

export default function Forbidden() {
  return (
    <Container py={80}>
      <Title order={3}>403: PM only</Title>
      <Text c="dimmed">Your role can view this project but not change it.</Text>
    </Container>
  )
}
