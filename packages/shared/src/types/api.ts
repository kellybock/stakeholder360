export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface UploadPreviewResponse {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  details: ValidationDetail[];
  upsertPlan: {
    toInsert: number;
    toUpdate: number;
  };
  preview: Record<string, unknown>[];
}

export interface ValidationDetail {
  row: number;
  field: string;
  level: 'error' | 'warning';
  message: string;
}

export interface UploadResult {
  uploadId: string;
  status: 'completed' | 'failed';
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  errors: ValidationDetail[];
}

export type LLMProvider = 'claude' | 'openai' | 'gemini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  llmProvider: LLMProvider;
  stakeholderContext?: string[];
}

export interface BriefRequest {
  stakeholderId: string;
  llmProvider: LLMProvider;
}

export type TableTarget =
  | 'profiles'
  | 'relationship_managers'
  | 'areas_of_interest'
  | 'interactions'
  | 'events'
  | 'awards'
  | 'community'
  | 'overseas_representation';
