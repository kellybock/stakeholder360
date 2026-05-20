import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMChatParams, LLMStreamChunk } from './base';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(params: LLMChatParams): Promise<string> {
    const systemMessage = params.messages.find(m => m.role === 'system');
    const chatMessages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  async *chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk> {
    const systemMessage = params.messages.find(m => m.role === 'system');
    const chatMessages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      system: systemMessage?.content,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { text: event.delta.text, done: false };
      }
    }
    yield { text: '', done: true };
  }
}
