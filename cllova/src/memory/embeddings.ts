import crypto from 'crypto';
import axios from 'axios';
import OpenAI from 'openai';

import { config } from '../utils/config.js';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  readonly dimension: number;
  readonly name: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  readonly dimension: number;
  readonly name = 'openai';

  constructor() {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for OpenAI embedding provider');
    }
    this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    this.dimension = config.VECTOR_DIM;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await this.client.embeddings.create({
      model: config.OPENAI_EMBEDDING_MODEL,
      input: texts,
    });
    return res.data.map((d) => d.embedding as unknown as number[]);
  }
}

export class HttpEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number;
  readonly name = 'http';

  constructor() {
    this.dimension = config.VECTOR_DIM;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await axios.post(
      config.EMBEDDING_HTTP_URL,
      { inputs: texts },
      { timeout: 30000 }
    );
    return res.data.embeddings as number[][];
  }
}

export class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number;
  readonly name = 'local';

  constructor() {
    this.dimension = config.VECTOR_DIM;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashToUnitVector(t));
  }

  private hashToUnitVector(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const vec = new Array(this.dimension).fill(0);
    for (let i = 0; i < this.dimension; i++) {
      vec[i] = hash[i % hash.length] / 255;
    }
    // L2 normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map((v) => v / (norm || 1));
  }
}

export function createEmbeddingProvider(): EmbeddingProvider {
  switch (config.EMBEDDING_PROVIDER) {
    case 'openai':
      return new OpenAIEmbeddingProvider();
    case 'http':
      return new HttpEmbeddingProvider();
    default:
      return new LocalDeterministicEmbeddingProvider();
  }
}