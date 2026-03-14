import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: 'http://192.168.1.6:8001/api/',
});

// Request interceptor to attach the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional response interceptor (e.g., to handle 401s across the app)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Typically we'd clear the cookie and redirect to login, but handling
      // redirects gracefully in Next.js Server & Client components requires
      // a bit more setup or checking if we're in the browser.
      if (typeof window !== 'undefined') {
        Cookies.remove('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
