import { z } from 'zod'

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    // "mock" is deliberately absent: the mock provider is injected by tests only.
    AI_PROVIDER: z.enum(['none', 'openai-compatible']).default('none'),
    AI_BASE_URL: z.string().optional(),
    AI_MODEL: z.string().optional(),
    AI_API_KEY: z.string().optional(),
  })
  .refine((e) => e.AI_PROVIDER === 'none' || (e.AI_BASE_URL && e.AI_MODEL), {
    message: 'AI_BASE_URL and AI_MODEL are required when AI_PROVIDER=openai-compatible',
  })

export const env = schema.parse(process.env)

export const aiLabel = env.AI_PROVIDER === 'none' ? 'AI off' : env.AI_MODEL!
