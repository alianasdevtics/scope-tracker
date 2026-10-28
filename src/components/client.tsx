'use client'

import { Anchor, type AnchorProps, Tabs } from '@mantine/core'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useState, useTransition } from 'react'

/** Mantine-styled Next link, usable from server components. */
export function AnchorLink(props: AnchorProps & { href: string; children: ReactNode }) {
  return <Anchor component={Link} {...props} />
}

export function ProjectTabs({ projectId, tabs }: { projectId: string; tabs: { slug: string; label: string }[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = tabs.find((t) => pathname.startsWith(`/projects/${projectId}/${t.slug}`))?.slug ?? null
  return (
    <Tabs value={active} onChange={(slug) => slug && router.push(`/projects/${projectId}/${slug}`)}>
      <Tabs.List>
        {tabs.map((t) => (
          <Tabs.Tab key={t.slug} value={t.slug}>
            {t.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}

/** Runs a server action that returns `{ error? }`, tracking pending state and the last error. */
export function useAction() {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string>()
  const run = (fn: () => Promise<{ error?: string }>, onDone?: () => void) =>
    start(async () => {
      const result = await fn()
      setError(result.error)
      if (!result.error) onDone?.()
    })
  return { run, pending, error }
}
