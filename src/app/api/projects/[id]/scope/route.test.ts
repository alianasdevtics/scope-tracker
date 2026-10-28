import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { form, makeProject, signIn } from '../../../../../../test/helpers'
import { POST } from './route'

const fixture = (name: string) => new File([readFileSync(`test/fixtures/${name}`)], name)

async function upload(projectId: string, data: Record<string, string | Blob>) {
  const res = await POST(new Request('http://x/api', { method: 'POST', body: form(data) }), {
    params: Promise.resolve({ id: projectId }),
  })
  return { status: res.status, body: (await res.json()) as { ok?: true; error?: string } }
}
const scopeOf = (projectId: string) => db.scopeDocument.findUnique({ where: { projectId } })

describe('POST /api/projects/[id]/scope', () => {
  it('extracts and stores text from a PDF, a DOCX, or pasted text (replacing the previous scope)', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)

    expect(await upload(p.id, { file: fixture('scope.pdf') })).toEqual({ status: 200, body: { ok: true } })
    expect(await scopeOf(p.id)).toMatchObject({ fileName: 'scope.pdf', fileType: 'PDF' })
    expect((await scopeOf(p.id))?.extractedText).toContain('pickup time slot')

    await upload(p.id, { file: fixture('scope.docx') })
    expect(await scopeOf(p.id)).toMatchObject({ fileName: 'scope.docx', fileType: 'DOCX' })

    await upload(p.id, { text: '  Build a login page.  ' })
    expect(await scopeOf(p.id)).toMatchObject({ fileName: 'Pasted text', fileType: 'TEXT', extractedText: 'Build a login page.' })
    expect(await db.scopeDocument.count({ where: { projectId: p.id } })).toBe(1)
  })

  it('rejects a scanned PDF with a clear message and stores nothing', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    const { status, body } = await upload(p.id, { file: fixture('scanned.pdf') })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scanned or image-only.*DOCX.*paste/)
    expect(await scopeOf(p.id)).toBeNull()
  })

  it('rejects empty input, files over 10 MB and pastes over 1 MB', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    expect((await upload(p.id, { text: '   ' })).body.error).toBe('Choose a file or paste the scope text.')
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf')
    expect((await upload(p.id, { file: big })).body.error).toBe('The file is larger than 10 MB.')
    expect((await upload(p.id, { text: 'a'.repeat(1024 * 1024 + 1) })).body.error).toBe('Pasted text is larger than 1 MB.')
  })

  it('locks the scope once requirements are confirmed, and for archived projects', async () => {
    const pm = await signIn('PM')
    const confirmed = await makeProject(pm.id, { confirmedAt: new Date() })
    expect((await upload(confirmed.id, { text: 'x' })).body.error).toBe('The requirements are confirmed, so the scope is locked.')
    const archived = await makeProject(pm.id, { status: 'ARCHIVED' })
    expect((await upload(archived.id, { text: 'x' })).body.error).toBe('This project is archived and read-only.')
  })

  it('is PM-only', async () => {
    const pm = await signIn('PM')
    const p = await makeProject(pm.id)
    await signIn('MEMBER')
    await expect(upload(p.id, { text: 'x' })).rejects.toThrow('FORBIDDEN')
    expect(await scopeOf(p.id)).toBeNull()
  })
})
