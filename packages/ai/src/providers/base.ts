export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamChunk {
  text: string;
  done: boolean;
}

export interface LLMChatParams {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: 'claude' | 'openai' | 'gemini' | 'ollama';
  chat(params: LLMChatParams): Promise<string>;
  chatStream(params: LLMChatParams): AsyncIterable<LLMStreamChunk>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
