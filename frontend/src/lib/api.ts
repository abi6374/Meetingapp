import axios from 'axios';
import { useAuthStore, getTokenFromStorage } from '../store/useAuthStore';

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/?$/, '/'),
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    // Only attach the cached token if the Authorization header is not already explicitly set
    if (!config.headers.Authorization) {
      let token = useAuthStore.getState().token;
      if (!token) {
        token = getTokenFromStorage();
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Bypass ngrok browser warning page if backend is hosted on ngrok
    config.headers['ngrok-skip-browser-warning'] = 'true';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not redirect if we are already on the login page or trying to log in
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
