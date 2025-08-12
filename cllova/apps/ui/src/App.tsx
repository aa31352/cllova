import React, { useEffect, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:3000';

type Health = { status: string; env: string; embeddingProvider: string };

type MemoryResult = { id: string; content: string; score: number };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [taskType, setTaskType] = useState('echo');
  const [taskPayload, setTaskPayload] = useState('{"hello":"world"}');
  const [taskResult, setTaskResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(async (r) => setHealth(await r.json()));
  }, []);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch(`${API_BASE}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setContent('');
  }

  async function searchMemory(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`${API_BASE}/api/memory/search?q=${encodeURIComponent(query)}`);
    const data = await r.json();
    setResults(data.results ?? []);
  }

  async function runTask(e: React.FormEvent) {
    e.preventDefault();
    let payload: any = taskPayload;
    try {
      payload = JSON.parse(taskPayload);
    } catch {
      // leave as string
    }
    const r = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: taskType, payload }),
    });
    const data = await r.json();
    setTaskResult(data.result ?? data);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cllova UI</h1>
          <div className="text-sm opacity-80">
            {health ? (
              <span>
                Status: <b>{health.status}</b> | Env: {health.env} | Embeddings: {health.embeddingProvider}
              </span>
            ) : (
              <span>Loading health...</span>
            )}
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-2">Add Memory</h2>
            <form onSubmit={addMemory} className="space-y-3">
              <textarea
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                rows={4}
                placeholder="Write something to remember..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" type="submit">
                Store
              </button>
            </form>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <h2 className="font-semibold mb-2">Search Memory</h2>
            <form onSubmit={searchMemory} className="space-y-3">
              <input
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                placeholder="search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700" type="submit">
                Search
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {results.map((r) => (
                <li key={r.id} className="p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div className="text-xs opacity-70">score: {r.score.toFixed(3)}</div>
                  <div>{r.content}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-semibold mb-2">Run Task</h2>
          <form onSubmit={runTask} className="grid md:grid-cols-3 gap-3 items-start">
            <input
              className="p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
              placeholder="type (echo|remember)"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
            />
            <input
              className="p-2 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
              placeholder='payload JSON or text'
              value={taskPayload}
              onChange={(e) => setTaskPayload(e.target.value)}
            />
            <button className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700" type="submit">
              Run
            </button>
          </form>
          {taskResult && (
            <pre className="mt-3 p-3 rounded bg-black/80 text-green-200 overflow-auto text-sm">
              {JSON.stringify(taskResult, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}