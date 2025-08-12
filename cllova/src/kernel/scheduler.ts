import { v4 as uuidv4 } from 'uuid';

import { KernelEvent, Task, TaskResult } from './types.js';

type Executor = (task: Task) => Promise<TaskResult>;

export class Scheduler {
  private queue: Task[] = [];
  private running = false;
  private emitEvent: (e: KernelEvent) => void;

  constructor(emitEvent: (e: KernelEvent) => void) {
    this.emitEvent = emitEvent;
  }

  enqueue(type: string, payload: unknown, priority = 0): Task {
    const task: Task = {
      id: uuidv4(),
      type,
      payload,
      createdAt: Date.now(),
      priority,
    };
    this.queue.push(task);
    this.emitEvent({ type: 'task:queued', task });
    return task;
  }

  async run(executor: Executor) {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        this.emitEvent({ type: 'task:started', task });
        const result = await executor(task);
        this.emitEvent({ type: 'task:finished', result });
      }
    } finally {
      this.running = false;
    }
  }
}