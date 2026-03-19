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
  delete: (docId: string) => apiClient.delete(`/admin/knowledge/${docId}`),
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
