import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Send tenant slug from cookie (set by middleware from subdomain)
    const slugMatch = document.cookie.match(/(?:^|;\s*)tenant-slug=([^;]*)/);
    const tenantSlug = slugMatch ? decodeURIComponent(slugMatch[1]) : '';
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  me: () => apiClient.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Query (Chat)
export const queryApi = {
  send: (data: { user_id: string; query: string; department?: string; conversation_id?: string }) =>
    apiClient.post('/query', data),
};

// Admin - Users
export const usersApi = {
  list: (department?: string) => apiClient.get('/admin/users', { params: { department } }),
  create: (data: any) => apiClient.post('/admin/users', data),
  update: (id: string, data: any) => apiClient.put(`/admin/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/users/${id}`),
};

// Admin - Stats
export const statsApi = {
  get: (days: number = 30) => apiClient.get('/admin/stats', { params: { days } }),
};

// Admin - Knowledge
export const knowledgeApi = {
  list: (knowledgeBase?: string, status?: string) =>
    apiClient.get('/admin/knowledge/list', { params: { knowledge_base: knowledgeBase, status } }),
  upload: (formData: FormData) =>
    apiClient.post('/admin/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large files
    }),
  edit: (docId: string, data: { title?: string; description?: string; tags?: string[] }) =>
    apiClient.put(`/admin/knowledge/${docId}`, data),
  delete: (docId: string) => apiClient.delete(`/admin/knowledge/${docId}`),
  importDrive: (data: {
    folder_url: string; knowledge_base: string;
    name?: string; description?: string; product_tags?: string[];
  }) => apiClient.post('/admin/knowledge/import-drive', data),
  importLink: (data: {
    url: string; knowledge_base: string;
    title?: string; description?: string; product_tags?: string[];
  }) => apiClient.post('/admin/knowledge/import-link', data),
  importWeb: (data: {
    url: string; knowledge_base: string;
    title?: string; description?: string; product_tags?: string[];
  }) => apiClient.post('/admin/knowledge/import-web', data),
  importTasks: () => apiClient.get('/admin/knowledge/import-tasks'),
  driveStatus: () => apiClient.get('/admin/knowledge/drive-status'),
  // Sources
  listSources: () => apiClient.get('/admin/knowledge/sources'),
  deleteSource: (sourceId: string) => apiClient.delete(`/admin/knowledge/sources/${sourceId}`),
  // Re-index by URL
  searchByUrl: (url: string) => apiClient.post('/admin/knowledge/search-by-url', { url }),
  reindexByUrl: (url: string) => apiClient.post('/admin/knowledge/reindex-by-url', { url }),
  // Auto-summary
  autoSummary: (docId: string) => apiClient.post(`/admin/knowledge/${docId}/auto-summary`),
};

// Admin - Logs
export const logsApi = {
  list: (params: { page?: number; limit?: number; channel?: string; department?: string; date_from?: string; date_to?: string }) =>
    apiClient.get('/admin/logs', { params }),
};

// Chat Conversations
export const chatApi = {
  listConversations: () => apiClient.get('/chat/conversations'),
  getMessages: (convId: string) => apiClient.get(`/chat/conversations/${convId}/messages`),
  createConversation: () => apiClient.post('/chat/conversations'),
  saveMessage: (convId: string, data: { role: string; content: string; sources?: any[] }) =>
    apiClient.post(`/chat/conversations/${convId}/messages`, data),
  deleteConversation: (convId: string) => apiClient.delete(`/chat/conversations/${convId}`),
};

// Feedback
export const feedbackApi = {
  submit: (data: any) => apiClient.post('/feedback', data),
  list: (params?: any) => apiClient.get('/admin/feedback', { params }),
  updateStatus: (id: string, data: any) => apiClient.put(`/admin/feedback/${id}/status`, data),
};

// Tenant
export const tenantApi = {
  get: () => apiClient.get('/tenant'),
  update: (data: any) => apiClient.put('/tenant', data),
};

// Products (Rich model with versioning)
export const productApi = {
  list: () => apiClient.get('/products'),
  get: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: any) => apiClient.post('/products', data),
  update: (id: string, data: any) => apiClient.put(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
  // Versions
  listVersions: (id: string) => apiClient.get(`/products/${id}/versions`),
  getVersion: (id: string, ver: number) => apiClient.get(`/products/${id}/versions/${ver}`),
  restoreVersion: (id: string, ver: number) => apiClient.post(`/products/${id}/versions/${ver}/restore`),
  // Related documents
  getDocuments: (id: string) => apiClient.get(`/products/${id}/documents`),
};

// Solutions (customer-facing names linking to Products)
export const solutionApi = {
  list: () => apiClient.get('/solutions'),
  get: (id: string) => apiClient.get(`/solutions/${id}`),
  create: (data: any) => apiClient.post('/solutions', data),
  update: (id: string, data: any) => apiClient.put(`/solutions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/solutions/${id}`),
};

// Proposals
export const proposalApi = {
  // Legacy products config (backward compat)
  getProducts: () => apiClient.get('/proposals/products'),
  updateProducts: (products: any[]) => apiClient.put('/proposals/products', products),
  // RFI templates
  listRfi: () => apiClient.get('/proposals/rfi'),
  getRfi: (industry: string) => apiClient.get(`/proposals/rfi/${industry}`),
  createRfi: (data: any) => apiClient.post('/proposals/rfi', data),
  updateRfi: (industry: string, data: any) => apiClient.put(`/proposals/rfi/${industry}`, data),
  deleteRfi: (industry: string) => apiClient.delete(`/proposals/rfi/${industry}`),
  // Legal entities
  getEntities: () => apiClient.get('/proposals/entities'),
  // Company lookup
  lookupCompany: (data: { tax_code?: string; website?: string; company_name?: string }) =>
    apiClient.post('/proposals/lookup-company', data),
  // Parse brief
  parseBrief: (data: { brief: string; industry: string; products?: string[] }) =>
    apiClient.post('/proposals/parse-brief', data, { timeout: 60000 }),
  // Generate
  generate: (data: any) => apiClient.post('/proposals/generate', data),
  tasks: () => apiClient.get('/proposals/tasks'),
  downloadUrl: (taskId: string) => `${API_URL}/proposals/${taskId}/download`,
};
