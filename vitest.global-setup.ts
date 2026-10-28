import { execSync } from 'node:child_process'
import pg from 'pg'

// Brings the test database up to date, then empties every table so each run starts clean.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url || !/_test(\?|$)/.test(url)) throw new Error('TEST_DATABASE_URL must point at a database whose name ends in _test')
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' })

  const client = new pg.Client({ connectionString: url })
  await client.connect()
  const { rows } = await client.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'`,
  )
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} CASCADE`)
  await client.end()
}
