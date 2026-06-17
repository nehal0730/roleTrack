import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User { id: number; name: string; email: string; role_id: number }

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  role: () => 'admin' | 'project_manager' | 'employee' | null;
  setTokens: (access: string, refresh: string) => void;
}

const ROLES: Record<number, 'admin' | 'project_manager' | 'employee'> = {
  1: 'admin', 2: 'project_manager', 3: 'employee',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      role: () => get().user ? ROLES[get().user!.role_id] : null,

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken',  access);
        localStorage.setItem('refreshToken', refresh);
        set({ accessToken: access, refreshToken: refresh });
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken',  data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      logout: async () => {
        const refresh = localStorage.getItem('refreshToken');
        try {
          await api.post('/auth/logout', { refreshToken: refresh });
        } catch { /* best-effort */ }
        localStorage.clear();
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: 'auth-store',
      partialize: state => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);