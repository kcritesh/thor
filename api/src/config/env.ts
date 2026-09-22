import { z } from 'zod';

export const MOCK_MODES = [
  'success',
  'malformed',
  'invalid',
  'timeout',
  'error',
] as const;
export type MockMode = (typeof MOCK_MODES)[number];

const envSchema = z
  .object({
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    AI_PROVIDER: z.enum(['openrouter', 'mock']).default('mock'),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default('deepseek/deepseek-v4-flash'),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
    MOCK_MODE: z.enum(MOCK_MODES).default('success'),
  })
  .refine(
    (env) => env.AI_PROVIDER !== 'openrouter' || !!env.OPENROUTER_API_KEY,
    {
      message: 'OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter',
      path: ['OPENROUTER_API_KEY'],
    },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
