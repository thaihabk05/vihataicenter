export interface User {
  id: string;
  name: string;
  email: string | null;
  department: string;
  role: string;
  zalo_id: string | null;
  telegram_id: number | null;
  knowledge_access: string[];
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface QueryResponse {
  status: string;
  answer: string;
  sources: Source[];
  conversation_id: string;
  tokens_used: { prompt: number; completion: number };
  processing_time_ms: number;
}

export interface Source {
  document: string;
  chunk: string;
  score: number;
}

export interface Stats {
  period: string;
  total_queries: number;
  by_department: Record<string, number>;
  by_channel: Record<string, number>;
  avg_response_time_ms: number;
  avg_confidence_score: number;
  tokens_used: { total: number; prompt: number; completion: number };
}

export interface KnowledgeDocument {
  id: string;
  knowledge_base: string;
  title: string;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  tags: string[];
  chunks_count: number | null;
  status: string;
  created_at: string;
}

export interface QueryLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  channel: string;
  query_text: string;
  answer_text: string | null;
  department_routed: string | null;
  sources: any;
  confidence_score: number | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  processing_time_ms: number | null;
  feedback_rating: number | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
}
