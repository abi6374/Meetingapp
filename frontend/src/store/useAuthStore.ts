import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  ai_provider: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Helper function to safely get the token directly from localStorage
// This is necessary because Zustand might not be fully hydrated when Axios sends its very first request.
export const getTokenFromStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const item = window.localStorage.getItem('auth-storage');
    if (!item) return null;
    const parsed = JSON.parse(item);
    return parsed.state?.token || null;
  } catch (e) {
    return null;
  }
};

