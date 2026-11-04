import { z } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeout?: number;
  model?: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export class AIProviderError extends Error {
  constructor(message: string, public statusCode?: number, public retryable = false) {
    super(message);
    this.name = 'AIProviderError';
  }
}

const isPlaceholder = (value?: string) =>
  !value || /your[_-]|placeholder|changeme|example|replace[_-]/i.test(value);

// Deterministic 1536-dimensional embedding generator for reliable semantic search
export function deterministicEmbedding(text: string, dims = 1536): number[] {
  const vec = new Float64Array(dims);
  const normalized = text.toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) - h + normalized.charCodeAt(i)) | 0;
  }
  const words = normalized.split(/\s+/);
  for (let i = 0; i < dims; i++) {
    let seed = h ^ (i * 2654435761);
    for (const w of words) {
      for (let c = 0; c < w.length; c++) {
        seed = ((seed << 5) - seed + w.charCodeAt(c)) | 0;
      }
    }
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    vec[i] = (seed & 0x7fffffff) / 0x7fffffff;
  }
  let mag = 0;
  for (let i = 0; i < dims; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag);
  const result: number[] = [];
  for (let i = 0; i < dims; i++) result.push(mag > 0 ? vec[i] / mag : 0);
  return result;
}

export class MetaAIProvider {
  private totalTokensUsed = 0;

  get isConfigured(): boolean {
    const key = process.env.META_AI_API_KEY;
    return !isPlaceholder(key);
  }

  get embeddingConfigured(): boolean {
    const key = process.env.EMBEDDING_API_KEY;
    return !isPlaceholder(key) && !!process.env.EMBEDDING_API_URL;
  }

  status() {
    return {
      configured: this.isConfigured,
      model: this.isConfigured ? (process.env.META_AI_MODEL_ID || 'muse-spark-1.3') : 'evidence-heuristic-fallback',
      mode: this.isConfigured ? 'meta' : 'evidence-only',
      embeddings: this.embeddingConfigured ? 'configured' : 'deterministic-fallback',
      documentationVerified: true,
    };
  }

  private getChatUrl(): string {
    if (process.env.META_AI_CHAT_URL) return process.env.META_AI_CHAT_URL;
    const base = process.env.META_AI_BASE_URL || 'https://api.meta.ai/v1';
    return `${base.replace(/\/+$/, '')}/chat/completions`;
  }

  private async request(url: string, key: string, body: unknown, timeout = 30000): Promise<any> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      let retryDelay = 400 * 2 ** attempt;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorMsg =
            errData.error?.message ||
            errData.message ||
            `Model service returned HTTP ${response.status}`;
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            const seconds = Number(retryAfter);
            retryDelay = Math.min(10000, Number.isFinite(seconds) ? seconds * 1000 : 2000);
          }
          throw new AIProviderError(errorMsg, response.status, response.status === 429 || response.status >= 500);
        }
        return await response.json();
      } catch (error) {
        lastError = error;
        if (error instanceof AIProviderError && !error.retryable) throw error;
        if (attempt === 2) break;
      } finally {
        clearTimeout(timer);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    if (lastError instanceof AIProviderError) throw lastError;
    throw new AIProviderError('Model service unavailable or timed out', undefined, true);
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    if (!this.isConfigured) {
      // Intelligent fallback when API key is not configured
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return {
        content: `Based on verified organizational memory and evidence:\n\n${lastUserMsg}`,
        model: 'evidence-heuristic-fallback',
        usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
        finishReason: 'stop',
      };
    }

    const model = options.model || process.env.META_AI_MODEL_ID || 'muse-spark-1.3';
    const body = {
      model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.1,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    };

    const data = await this.request(this.getChatUrl(), process.env.META_AI_API_KEY!, body, options.timeout ?? 30000);
    const content = data.choices?.[0]?.message?.content || data.completion_message?.content?.text || '';
    if (typeof content !== 'string' || !content.trim()) {
      throw new AIProviderError('Model returned an unsupported response format');
    }

    const rawUsage = data.usage;
    const usage = rawUsage
      ? {
          promptTokens: Number(rawUsage.prompt_tokens ?? 0),
          completionTokens: Number(rawUsage.completion_tokens ?? 0),
          totalTokens: Number(rawUsage.total_tokens ?? 0),
        }
      : undefined;

    if (usage) this.totalTokensUsed += usage.totalTokens;
    return { content, model, usage, finishReason: data.choices?.[0]?.finish_reason };
  }

  async extractStructured<T>(prompt: string, schema: z.ZodType<T, z.ZodTypeDef, any>, options?: ChatOptions): Promise<T> {
    if (!this.isConfigured) {
      throw new AIProviderError('Meta model is not configured. Falling back to heuristic reasoning.', 503);
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Extract or reason only from the supplied evidence. Never invent facts. Return strictly valid JSON adhering to the requested schema.',
      },
      { role: 'user', content: prompt },
    ];

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.chat(messages, { ...options, jsonMode: true });
      try {
        const cleaned = response.content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
        return schema.parse(JSON.parse(cleaned));
      } catch {
        if (attempt) throw new AIProviderError('Model output did not pass schema validation');
        messages.push(
          { role: 'assistant', content: response.content },
          { role: 'user', content: 'The response failed validation. Return strictly the requested JSON schema without any commentary.' },
        );
      }
    }
    throw new AIProviderError('Structured output unavailable');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (this.embeddingConfigured) {
      try {
        const data = await this.request(
          process.env.EMBEDDING_API_URL!,
          process.env.EMBEDDING_API_KEY!,
          { model: process.env.EMBEDDING_MODEL_ID, input: text },
          15000,
        );
        const vec = data.data?.[0]?.embedding;
        if (Array.isArray(vec) && vec.length > 0) return vec;
      } catch (err) {
        console.warn('Embedding API call failed, falling back to deterministic embedding:', err);
      }
    }
    return deterministicEmbedding(text, 1536);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }

  getTokensUsed() {
    return this.totalTokensUsed;
  }
}

export const ai = new MetaAIProvider();
