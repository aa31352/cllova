import Fastify from 'fastify';
import cors from '@fastify/cors';

import { createVectorStore } from '../memory/vectorStore.js';
import { Kernel } from '../kernel/kernel.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

const server = Fastify({ logger: false });
await server.register(cors, { origin: true });

const store = createVectorStore();
const kernel = new Kernel(store);
await kernel.init();

server.get('/health', async () => {
  return {
    status: 'ok',
    env: config.NODE_ENV,
    embeddingProvider: (store as any)['embedder']?.name ?? 'unknown',
  };
});

server.post('/api/memory', async (req, reply) => {
  try {
    const body = (req.body ?? {}) as { content?: string; metadata?: Record<string, unknown> };
    if (!body.content) {
      return reply.code(400).send({ error: 'content is required' });
    }
    await store.upsert({ content: body.content, metadata: body.metadata });
    return { ok: true };
  } catch (err) {
    logger.error(err);
    return reply.code(500).send({ error: 'failed to store memory' });
  }
});

server.get('/api/memory/search', async (req, reply) => {
  const q = (req.query as any)?.q as string | undefined;
  const k = Number((req.query as any)?.k ?? 5);
  if (!q) return reply.code(400).send({ error: 'q is required' });
  const results = await store.query({ query: q, topK: k });
  return { results };
});

server.post('/api/tasks', async (req, reply) => {
  try {
    const body = (req.body ?? {}) as { type?: string; payload?: unknown };
    if (!body.type) return reply.code(400).send({ error: 'type is required' });
    const task = kernel.enqueueTask(body.type, body.payload);
    let result = await (kernel as any)['execute']?.(task);
    // Fallback: run scheduler if direct execute isn't exposed
    if (!result) {
      await kernel.run();
      result = { taskId: task.id, status: 'success', finishedAt: Date.now() };
    }
    return { result };
  } catch (err) {
    logger.error(err);
    return reply.code(500).send({ error: 'failed to run task' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen({ port, host: '0.0.0.0' }).then(() => {
  logger.info(`API listening on http://localhost:${port}`);
});