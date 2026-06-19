import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jamat_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jamat_token');
      localStorage.removeItem('jamat_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth API ─────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Members API ──────────────────────────────────────────
export const membersAPI = {
  getAll: (params) => api.get('/members', { params }),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
};

// ── Finance API ──────────────────────────────────────────
export const financeAPI = {
  getTransactions: (p) => api.get('/finance/transactions', { params: p }),
  addTransaction: (d) => api.post('/finance/transactions', d),
  deleteTransaction: (id) => api.delete(`/finance/transactions/${id}`),
  getReceipt: (id) => api.get(`/finance/receipt/${id}`),
  getBalance: (userId) => api.get(`/finance/balance/${userId}`),
  getMyBalance: () => api.get('/finance/my-balance'),
  getBalances: () => api.get('/finance/balances'),
  getTreasury: () => api.get('/finance/treasury'),
  getDailyExpenses: (date) => api.get('/finance/daily', { params: { date } }),
  exportCSV: (p) => api.get('/finance/export', { params: p, responseType: 'blob' }),
  getApprovals: () => api.get('/finance/approvals'),
  processApproval: (id, d) => api.post(`/finance/approvals/${id}`, d),
  transfer: (d) => api.post('/finance/transfer', d),
  getPlanned: () => api.get('/finance/planned'),
  addPlanned: (d) => api.post('/finance/planned', d),
  updatePlanned: (id, d) => api.patch(`/finance/planned/${id}`, d),
  getSettings: () => api.get('/finance/settings'),
  updateSettings: (d) => api.put('/finance/settings', d),
};

// ── Routes API ───────────────────────────────────────────
export const routesAPI = {
  getAll: (params) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`),
};

// ── Tasks API ────────────────────────────────────────────
export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getMatrix: (params) => api.get('/tasks/matrix', { params }),
  create: (data) => api.post('/tasks', data),
  assign: (data) => api.post('/tasks/assign', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ── Duties API ───────────────────────────────────────────
export const dutiesAPI = {
  getRoster: (date) => api.get('/duties', { params: { date } }),
  assign: (data) => api.post('/duties', data),
  generateRotation: (data) => api.post('/duties/generate', data),
  updateStatus: (id, status) => api.patch(`/duties/${id}/status`, { status }),
  delete: (id) => api.delete(`/duties/${id}`),
};

// ── Attendance API ───────────────────────────────────────
export const attendanceAPI = {
  get: (date) => api.get('/attendance', { params: { date } }),
  mark: (data) => api.post('/attendance', data),
  getSummary: (params) => api.get('/attendance/summary', { params }),
};

// ── Meals API ────────────────────────────────────────────
export const mealsAPI = {
  get: (date) => api.get('/meals', { params: { date } }),
  create: (data) => api.post('/meals', data),
  update: (id, data) => api.put(`/meals/${id}`, data),
  delete: (id) => api.delete(`/meals/${id}`),
};

// ── Announcements API ────────────────────────────────────
export const announcementsAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// ── Dashboard API ────────────────────────────────────────
export const dashboardAPI = {
  getData: () => api.get('/dashboard'),
};

// ── Meal Split API ───────────────────────────────────────
export const mealSplitAPI = {
  getMeals: (date, meal_type) => api.get('/meal-split/meals', { params: { date, meal_type } }),
  calculate: (data) => api.post('/meal-split/calculate', data),
  generate: (data) => api.post('/meal-split/generate', data),
};

export default api;
