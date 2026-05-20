import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMChatParams, LLMStreamChunk } from './base';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(params: LLMChatParams): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: params.messages.find(m => m.role === 'system')?.content,
    });

    const chatMessages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }));

    const lastMessage = chatMessages.pop();
    if (!lastMessage) throw new Error('No messages provided');

    const chat = model.startChat({
      history: chatMessages,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens ?? 4096,
      },
    });

    const result = await chat.sendMessage(lastMessage.parts[0].text);
    return result.response.text();
  }

  async *chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: params.messages.find(m => m.role === 'system')?.content,
    });

    const chatMessages = params.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }],
      }));

    const lastMessage = chatMessages.pop();
    if (!lastMessage) throw new Error('No messages provided');

    const chat = model.startChat({
      history: chatMessages,
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxTokens ?? 4096,
      },
    });

    const result = await chat.sendMessageStream(lastMessage.parts[0].text);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { text, done: false };
      }
    }
    yield { text: '', done: true };
  }
}
