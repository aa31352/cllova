#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { createVectorStore } from '../memory/vectorStore.js';
import { Kernel } from '../kernel/kernel.js';
import { logger } from '../utils/logger.js';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName('cllova')
    .usage('$0 <cmd> [args]')
    .command(
      'remember <content>',
      'Store a memory entry',
      (y) => y.positional('content', { type: 'string', describe: 'Text to remember' }),
      async (args) => {
        const store = createVectorStore();
        await store.upsert({ content: String(args.content), metadata: { source: 'cli' } });
        logger.info('Memory stored');
      }
    )
    .command(
      'query <q>',
      'Query memory for similar entries',
      (y) => y.positional('q', { type: 'string', describe: 'Query text' }).option('k', { type: 'number', default: 5 }),
      async (args) => {
        const store = createVectorStore();
        const res = await store.query({ query: String(args.q), topK: Number(args.k) });
        for (const r of res) {
          // eslint-disable-next-line no-console
          console.log(`Score=${r.score.toFixed(3)} id=${r.id} content=${r.content}`);
        }
      }
    )
    .command(
      'task <type> [payload]',
      'Enqueue and run a task',
      (y) =>
        y
          .positional('type', { type: 'string', describe: 'Task type, e.g., echo|remember' })
          .positional('payload', { type: 'string', describe: 'JSON payload for the task' }),
      async (args) => {
        const memory = createVectorStore();
        const kernel = new Kernel(memory);
        await kernel.init();
        kernel.onEvent((e) => logger.debug(e));
        let payload: unknown = undefined;
        if (args.payload) {
          try {
            payload = JSON.parse(String(args.payload));
          } catch {
            payload = String(args.payload);
          }
        }
        kernel.enqueueTask(String(args.type), payload);
        await kernel.run();
      }
    )
    .demandCommand(1)
    .help().argv;

  return argv;
}

main().catch((err) => {
  logger.error(err, 'CLI error');
  process.exit(1);
});