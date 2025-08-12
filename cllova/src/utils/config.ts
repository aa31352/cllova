import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('debug'),
  DATABASE_PATH: z.string().default('data/memory.db'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'http', 'local']).default('local'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_HTTP_URL: z.string().default('http://127.0.0.1:8000/embed'),
  VECTOR_DIM: z.coerce.number().default(1536),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse(process.env);