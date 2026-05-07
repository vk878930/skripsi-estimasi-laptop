import axios from 'axios';

// #11 — Single source of truth for API base URL
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Shared axios instance with auth interceptor (#2 — JWT sent on every call)
const api = axios.create({
  baseURL: API_BASE,
});

// Attach Bearer token automatically to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// If the server ever returns 401, clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
