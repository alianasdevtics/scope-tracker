import { z } from 'zod'
import { requirePM } from '@/lib/auth'
import { db } from '@/lib/db'
import { UserError } from '@/lib/errors'
import { MAX_FILE_BYTES, MAX_PASTE_BYTES, extractScope } from '@/lib/extract'
import { getEditableProject } from '@/lib/requirements'

const input = z.object({ file: z.instanceof(File).optional(), text: z.string().optional() })

/** FR-3: upload a PDF/DOCX or paste text. The file is read in memory and never stored (only its text is). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePM()
  const { id } = await params
  try {
    const project = await getEditableProject(id)
    if (project.confirmedAt) throw new UserError('The requirements are confirmed, so the scope is locked.')
    if (Number(req.headers.get('content-length')) > MAX_FILE_BYTES + 100_000) throw new UserError('The file is larger than 10 MB.')

    const { file, text } = input.parse(Object.fromEntries(await req.formData()))
    let doc: { fileName: string; fileType: 'PDF' | 'DOCX' | 'TEXT'; extractedText: string }
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) throw new UserError('The file is larger than 10 MB.')
      const { fileType, text } = await extractScope(file.name, Buffer.from(await file.arrayBuffer()))
      doc = { fileName: file.name, fileType, extractedText: text }
    } else if (text?.trim()) {
      if (Buffer.byteLength(text) > MAX_PASTE_BYTES) throw new UserError('Pasted text is larger than 1 MB.')
      doc = { fileName: 'Pasted text', fileType: 'TEXT', extractedText: text.trim() }
    } else {
      throw new UserError('Choose a file or paste the scope text.')
    }

    await db.scopeDocument.upsert({
      where: { projectId: id },
      create: { projectId: id, ...doc },
      update: { ...doc, uploadedAt: new Date() },
    })
    return Response.json({ ok: true })
  } catch (e) {
    if (e instanceof UserError) return Response.json({ error: e.message }, { status: 400 })
    throw e
  }
}
