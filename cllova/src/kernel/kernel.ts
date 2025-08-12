import { logger } from '../utils/logger.js';
import type { KernelEvent, KernelPlugin, MemoryApi, Task, TaskResult } from './types.js';
import { PluginManager } from './pluginManager.js';
import { Scheduler } from './scheduler.js';

export class Kernel {
  private readonly plugins = new PluginManager();
  private readonly scheduler = new Scheduler((e) => this.emit(e));
  private readonly memory: MemoryApi;
  private listeners: ((e: KernelEvent) => void)[] = [];

  constructor(memory: MemoryApi) {
    this.memory = memory;
  }

  async init() {
    await this.plugins.loadFromPluginsDir();
    logger.info({ plugins: this.plugins.list().map((p) => p.name) }, 'Kernel initialized');
  }

  onEvent(listener: (e: KernelEvent) => void) {
    this.listeners.push(listener);
  }

  private emit(event: KernelEvent) {
    for (const l of this.listeners) l(event);
  }

  enqueueTask(type: string, payload: unknown) {
    return this.scheduler.enqueue(type, payload);
  }

  async run() {
    await this.scheduler.run((task) => this.execute(task));
  }

  private async execute(task: Task): Promise<TaskResult> {
    const plugin = this.plugins.list().find((p) => p.canHandle(task));
    if (!plugin) {
      return {
        taskId: task.id,
        status: 'error',
        error: `No plugin to handle task type ${task.type}`,
        finishedAt: Date.now(),
      };
    }
    return plugin.handle(task, {
      emit: (e) => this.emit(e),
      getMemory: () => this.memory,
    });
  }
}