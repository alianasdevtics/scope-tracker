import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { UserError } from './errors'
import { extractScope, isNearEmpty } from './extract'

const fixture = (name: string) => readFileSync(new URL(`../../test/fixtures/${name}`, import.meta.url))

describe('extractScope', () => {
  it('extracts text from a text-based PDF', async () => {
    const { fileType, text } = await extractScope('Scope.PDF', fixture('scope.pdf'))
    expect(fileType).toBe('PDF')
    expect(text).toContain('Bakery Online Ordering')
    expect(text).toContain('pickup time slot')
  })

  it('extracts text from a DOCX', async () => {
    const { fileType, text } = await extractScope('scope.docx', fixture('scope.docx'))
    expect(fileType).toBe('DOCX')
    expect(text).toContain('Customers can reset a forgotten password')
  })

  it('rejects a scanned (image-only) PDF with a clear message', async () => {
    await expect(extractScope('scan.pdf', fixture('scanned.pdf'))).rejects.toThrow(/scanned or image-only/)
  })

  it('rejects a corrupt PDF and an unsupported type', async () => {
    await expect(extractScope('x.pdf', Buffer.from('not a pdf'))).rejects.toBeInstanceOf(UserError)
    await expect(extractScope('x.doc', Buffer.from('old word'))).rejects.toThrow(/Only PDF and DOCX/)
  })
})

describe('isNearEmpty', () => {
  it('flags little text overall or per page', () => {
    expect(isNearEmpty('', 1)).toBe(true)
    expect(isNearEmpty('a'.repeat(199), 1)).toBe(true)
    expect(isNearEmpty('a'.repeat(200), 1)).toBe(false)
    expect(isNearEmpty('a'.repeat(290), 10)).toBe(true) // 29 per page
    expect(isNearEmpty('a'.repeat(300), 10)).toBe(false)
  })
})
