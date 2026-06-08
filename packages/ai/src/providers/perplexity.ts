import OpenAI from 'openai';
import type { LLMProvider, LLMChatParams, LLMStreamChunk } from './base';

export class PerplexityProvider implements LLMProvider {
  readonly name = 'perplexity' as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'sonar-pro') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai',
    });
    this.model = model;
  }

  async chat(params: LLMChatParams): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: params.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.2,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async *chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: params.messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.2,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield { text, done: false };
    }
    yield { text: '', done: true };
  }
}
