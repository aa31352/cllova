import type { KernelPlugin, MemoryApi, Task, TaskResult } from '../types.js';

const ExamplePlugin: KernelPlugin = {
  name: 'example-plugin',
  canHandle(task: Task) {
    return task.type === 'echo' || task.type === 'remember';
  },
  async handle(task: Task, deps: { getMemory: () => MemoryApi }): Promise<TaskResult> {
    if (task.type === 'remember') {
      const mem = deps.getMemory();
      const { content, metadata } = (task.payload as any) ?? {};
      if (!content) {
        return {
          taskId: task.id,
          status: 'error',
          error: 'Missing content',
          finishedAt: Date.now(),
        };
      }
      await mem.upsert({ content, metadata });
      return { taskId: task.id, status: 'success', output: { stored: true }, finishedAt: Date.now() };
    }

    // echo
    return { taskId: task.id, status: 'success', output: task.payload, finishedAt: Date.now() };
  },
};

export default ExamplePlugin;