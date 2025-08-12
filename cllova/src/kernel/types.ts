export type Task = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
  priority?: number;
};

export type TaskResult = {
  taskId: string;
  status: 'success' | 'error';
  output?: unknown;
  error?: string;
  finishedAt: number;
};

export interface KernelPlugin {
  name: string;
  /** Return true if the plugin can handle this task type */
  canHandle(task: Task): boolean;
  /** Execute the task and return result */
  handle(task: Task, deps: PluginDeps): Promise<TaskResult>;
}

export type PluginDeps = {
  emit: (event: KernelEvent) => void;
  getMemory: () => MemoryApi;
};

export type KernelEvent =
  | { type: 'task:queued'; task: Task }
  | { type: 'task:started'; task: Task }
  | { type: 'task:finished'; result: TaskResult };

export type MemoryApi = {
  upsert: (doc: MemoryDocument) => Promise<void>;
  query: (q: MemoryQuery) => Promise<MemoryQueryResult[]>;
};

export type MemoryDocument = {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type MemoryQuery = {
  query: string;
  topK?: number;
  where?: Record<string, unknown>;
};

export type MemoryQueryResult = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number; // cosine similarity
};