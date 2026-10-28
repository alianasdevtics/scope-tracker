import mammoth from 'mammoth'
import { extractText } from 'unpdf'
import { UserError as ExtractError } from './errors'

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_PASTE_BYTES = 1024 * 1024

const SCANNED =
  'This PDF has no readable text. It looks scanned or image-only. Upload a text-based PDF or a DOCX, or paste the text instead.'

/** Q16: under 200 non-whitespace characters in total, or under 30 per page on average. */
export function isNearEmpty(text: string, pages: number) {
  const chars = text.replace(/\s/g, '').length
  return chars < 200 || chars / Math.max(pages, 1) < 30
}

export async function extractScope(fileName: string, data: Buffer) {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return { fileType: 'PDF' as const, text: await extractPdf(data) }
  if (ext === 'docx') return { fileType: 'DOCX' as const, text: await extractDocx(data) }
  throw new ExtractError('Only PDF and DOCX files are supported. You can also paste the text.')
}

async function extractPdf(data: Buffer) {
  let result: { text: string; totalPages: number }
  try {
    result = await extractText(new Uint8Array(data), { mergePages: true })
  } catch {
    throw new ExtractError('Could not read this PDF. It may be damaged or password-protected.')
  }
  if (isNearEmpty(result.text, result.totalPages)) throw new ExtractError(SCANNED)
  return result.text.trim()
}

async function extractDocx(data: Buffer) {
  let text: string
  try {
    text = (await mammoth.extractRawText({ buffer: data })).value
  } catch {
    throw new ExtractError('Could not read this DOCX file. It may be damaged.')
  }
  if (!text.trim()) throw new ExtractError('This DOCX file contains no text.')
  return text.trim()
}
