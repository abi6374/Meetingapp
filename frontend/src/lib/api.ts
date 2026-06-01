import axios from 'axios';
import { useAuthStore, getTokenFromStorage } from '../store/useAuthStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
});

api.interceptors.request.use(
  (config) => {
    // Attempt to get token from Zustand state first, fallback to raw localStorage
    // This prevents 401s on hard refreshes where Axios runs before Zustand hydrates
    let token = useAuthStore.getState().token;
    if (!token) {
      token = getTokenFromStorage();
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
