import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { createEmbeddingProvider } from './embeddings.js';
import type { MemoryApi, MemoryDocument, MemoryQuery, MemoryQueryResult } from '../kernel/types.js';

export class VectorStore implements MemoryApi {
  private db: Database.Database;
  private embedder = createEmbeddingProvider();

  constructor(dbPath = config.DATABASE_PATH) {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        doc_id TEXT PRIMARY KEY,
        vector TEXT NOT NULL,
        FOREIGN KEY(doc_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      PRAGMA journal_mode=WAL;
    `);
  }

  async upsert(doc: MemoryDocument): Promise<void> {
    const id = doc.id ?? uuidv4();
    const metadataJson = doc.metadata ? JSON.stringify(doc.metadata) : null;
    const stmtUpsertDoc = this.db.prepare(
      `INSERT INTO documents (id, content, metadata) VALUES (@id, @content, @metadata)
       ON CONFLICT(id) DO UPDATE SET content=excluded.content, metadata=excluded.metadata`
    );
    stmtUpsertDoc.run({ id, content: doc.content, metadata: metadataJson });

    const [embedding] = await this.embedder.embed([doc.content]);
    const stmtUpsertEmb = this.db.prepare(
      `INSERT INTO embeddings (doc_id, vector) VALUES (@doc_id, @vector)
       ON CONFLICT(doc_id) DO UPDATE SET vector=excluded.vector`
    );
    stmtUpsertEmb.run({ doc_id: id, vector: JSON.stringify(embedding) });
  }

  async query(q: MemoryQuery): Promise<MemoryQueryResult[]> {
    const topK = Math.max(1, q.topK ?? 5);
    const [queryEmbedding] = await this.embedder.embed([q.query]);

    const rows = this.db
      .prepare(
        `SELECT d.id, d.content, d.metadata, e.vector as vector
         FROM documents d JOIN embeddings e ON d.id = e.doc_id`
      )
      .all();

    const results: MemoryQueryResult[] = [];
    for (const r of rows as any[]) {
      const emb: number[] = JSON.parse(r.vector);
      const score = cosineSimilarity(queryEmbedding, emb);
      results.push({
        id: r.id,
        content: r.content,
        metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function createVectorStore(): VectorStore {
  const store = new VectorStore();
  logger.debug({ provider: store['embedder'].name }, 'VectorStore initialized');
  return store;
}