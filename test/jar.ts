/** Cookie store behind the mocked next/headers. Kept import-free so the mock can't cycle back into itself. */
export const jar = new Map<string, string>()
