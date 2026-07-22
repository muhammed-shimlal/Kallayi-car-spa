import axios from 'axios';
import Cookies from 'js-cookie';

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:8001/api`;
  }
  return 'http://127.0.0.1:8001/api';
};

const api = axios.create();

// Request interceptor to attach the auth token & resolve dynamic baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl() + '/';
    let token = Cookies.get('auth_token');
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || undefined;
    }
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthenticated redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        Cookies.remove('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
