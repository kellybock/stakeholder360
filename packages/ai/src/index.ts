export type { LLMProvider, LLMMessage, LLMStreamChunk, LLMChatParams, EmbeddingProvider } from './providers/base';
export { ClaudeProvider } from './providers/claude';
export { OpenAIProvider } from './providers/openai';
export { GeminiProvider } from './providers/gemini';

import type { LLMProvider } from './providers/base';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';

export function createLLMProvider(provider: string): LLMProvider {
  switch (provider) {
    case 'claude':
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
      return new ClaudeProvider(process.env.ANTHROPIC_API_KEY);
    case 'openai':
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
      return new OpenAIProvider(process.env.OPENAI_API_KEY);
    case 'gemini':
      if (!process.env.GOOGLE_AI_API_KEY) throw new Error('GOOGLE_AI_API_KEY is not set');
      return new GeminiProvider(process.env.GOOGLE_AI_API_KEY);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function createEmbeddingProvider() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for embeddings');
  return new OpenAIProvider(process.env.OPENAI_API_KEY);
}
