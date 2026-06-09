'use client';

import { create } from 'zustand';
import { setClientToken, clearClientToken } from '@/lib/api/client';
import type { AuthUser } from '@/types/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) => {
    setClientToken(accessToken);
    // Non-sensitive flag so Next.js middleware can make routing decisions.
    // Contains no token — the actual security is enforced by the backend.
    document.cookie = 'session_active=1; path=/; SameSite=Lax';
    set({ user, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    clearClientToken();
    document.cookie = 'session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
