import OpenAI from 'openai';
import type { LLMProvider, LLMChatParams, LLMStreamChunk } from './base';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;
  private client: OpenAI;
  private model: string;

  constructor(
    baseUrl = 'http://localhost:11434',
    model = 'phi3:mini',
  ) {
    this.client = new OpenAI({ apiKey: 'ollama', baseURL: `${baseUrl}/v1` });
    this.model = model;
  }

  async chat(params: LLMChatParams): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
      messages: params.messages.map(m => ({ role: m.role, content: m.content })),
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async *chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
      messages: params.messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield { text, done: false };
    }
    yield { text: '', done: true };
  }
}
