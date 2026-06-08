export type { LLMProvider, LLMMessage, LLMStreamChunk, LLMChatParams, EmbeddingProvider } from './providers/base';
export { ClaudeProvider } from './providers/claude';
export { OpenAIProvider } from './providers/openai';
export { GeminiProvider } from './providers/gemini';
export { OllamaProvider } from './providers/ollama';
export { PerplexityProvider } from './providers/perplexity';

import type { LLMProvider } from './providers/base';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';
import { PerplexityProvider } from './providers/perplexity';

export function createLLMProvider(provider: string, apiKey?: string): LLMProvider {
  switch (provider) {
    case 'claude': {
      const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
      return new ClaudeProvider(key);
    }
    case 'openai': {
      const key = apiKey ?? process.env.OPENAI_API_KEY;
      if (!key) throw new Error('OPENAI_API_KEY is not set');
      return new OpenAIProvider(key);
    }
    case 'gemini': {
      const key = apiKey ?? process.env.GOOGLE_AI_API_KEY;
      if (!key) throw new Error('GOOGLE_AI_API_KEY is not set');
      return new GeminiProvider(key);
    }
    case 'ollama': {
      const baseUrl = apiKey ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL ?? 'phi3:mini';
      return new OllamaProvider(baseUrl, model);
    }
    case 'perplexity': {
      const key = apiKey ?? process.env.PERPLEXITY_API_KEY;
      if (!key) throw new Error('PERPLEXITY_API_KEY is not set');
      return new PerplexityProvider(key);
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

export function createEmbeddingProvider(apiKey?: string) {
  const key = apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is required for embeddings');
  return new OpenAIProvider(key);
}
