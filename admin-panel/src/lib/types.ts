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
  description?: string;
  file_name: string | null;
  file_type: string | null;
  file_size_bytes: number | null;
  tags: string[];
  chunks_count: number | null;
  sections_count?: number | null;
  status: string;
  source_type?: string; // "upload" | "google_drive" | "google_sheet" | "google_doc"
  source_id?: string | null;
  source_name?: string | null;
  drive_url?: string;
  download_url?: string;
  uploaded_by?: string | null;
  uploaded_by_name?: string | null;
  created_at: string;
}

export interface DriveSource {
  id: string;
  name: string;
  description: string;
  type: "folder" | "sheet" | "doc";
  url: string;
  folder_id: string;
  knowledge_base: string;
  product_tags: string[];
  document_ids: string[];
  document_count: number;
  uploaded_by?: string;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
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

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  message_count: number;
}

export interface ProposalTask {
  task_id: string;
  status: 'generating_content' | 'creating_document' | 'completed' | 'error';
  customer_name: string;
  industry: string;
  products: string[];
  legal_entity: string;
  output_format: 'pptx' | 'docx';
  file_name?: string | null;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface RFIQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi_select';
  required?: boolean;
  options?: string[];
}

export interface RFITemplate {
  label: string;
  questions: RFIQuestion[];
}

export interface ProductConfig {
  id: string;
  label: string;
}

// Rich Product model (SaaS-ready, versioned)
export interface Product {
  id: string;
  tenant_id?: string;
  slug: string;
  name: string;
  short_description: string;
  full_description: string;
  features: string[];
  use_cases: string[];
  target_industries: string[];
  pricing_model: string;
  competitive_advantages: string[];
  integration_options: string[];
  status: 'active' | 'deprecated' | 'draft';
  sort_order: number;
  version_count?: number;
  related_docs_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVersion {
  id: string;
  version_number: number;
  version_label: string;
  changed_by: string;
  change_summary: string;
  snapshot: Omit<Product, 'id' | 'tenant_id' | 'created_at'>;
  created_at: string;
}

// Tenant model (SaaS-ready)
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  config: {
    legal_entities: LegalEntity[];
    departments: string[];
    channels: string[];
    features: Record<string, boolean>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalEntity {
  id: string;
  label: string;
  template: string;
}

export interface Feedback {
  id: string;
  query_text: string;
  answer_text: string;
  sources: any[];
  category: 'wrong_answer' | 'no_answer' | 'outdated';
  user_comment: string;
  conversation_id: string | null;
  status: 'new' | 'reviewing' | 'resolved';
  admin_note: string;
  created_at: string;
}
