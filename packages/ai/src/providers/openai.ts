import OpenAI from 'openai';
import type { LLMProvider, LLMChatParams, LLMStreamChunk, EmbeddingProvider } from './base';

export class OpenAIProvider implements LLMProvider, EmbeddingProvider {
  readonly name = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(params: LLMChatParams): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content ?? '';
  }

  async *chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o',
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      messages: params.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        yield { text, done: false };
      }
    }
    yield { text: '', done: true };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }
}
