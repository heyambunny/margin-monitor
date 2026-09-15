import axios from 'axios';

// Single source of truth for the backend base URL. Set NEXT_PUBLIC_API_URL
// at build time in production (e.g. https://app.marginmonitor.in/api) -
// falls back to localhost:8000 for local dev.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const dashboardApi = {
  getDashboard: () => api.get('/api/dashboard'),
};

export const reportsApi = {
  getReports: () => api.get('/api/reports'),
};
