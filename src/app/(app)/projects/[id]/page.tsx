import { redirect } from 'next/navigation'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/projects/${(await params).id}/setup`)
}
