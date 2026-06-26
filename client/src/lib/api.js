/**
 * QRForge — API Client
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const { method = 'GET', body, headers: customHeaders = {} } = options;
  const url = `${API_BASE}${path}`;
  
  const headers = { 'Content-Type': 'application/json', ...customHeaders };
  
  // Get token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('qrforge_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed: ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getMe: () => request('/api/auth/me'),

  // QR Codes
  listQR: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/qr${qs ? `?${qs}` : ''}`);
  },
  createQR: (body) => request('/api/qr', { method: 'POST', body }),
  getQR: (id) => request(`/api/qr/${id}`),
  updateQR: (id, body) => request(`/api/qr/${id}`, { method: 'PATCH', body }),
  deleteQR: (id) => request(`/api/qr/${id}`, { method: 'DELETE' }),
  setRedirect: (id, body) => request(`/api/qr/${id}/redirect`, { method: 'POST', body }),
  getQRImage: (id, fmt = 'png') => `${API_BASE}/api/qr/${id}/image?fmt=${fmt}`,
  getQRAnalytics: (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/qr/${id}/analytics${qs ? `?${qs}` : ''}`);
  },

  // Analytics
  getAnalytics: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/analytics${qs ? `?${qs}` : ''}`);
  },

  // Health
  health: () => request('/api/health'),
};

export default api;
