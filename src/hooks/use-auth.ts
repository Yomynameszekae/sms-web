'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { authApi, type LoginPayload } from '@/lib/api/endpoints/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  async function login(payload: LoginPayload) {
    const { data } = await authApi.login(payload);
    const { accessToken, user: authUser } = data.data;
    setAuth(authUser, accessToken);
    router.replace('/dashboard');
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Proceed with client-side cleanup even if the server call fails
    }
    clearAuth();
    router.replace('/login');
    toast.success('Signed out successfully');
  }

  return { user, isAuthenticated, isLoading, login, logout };
}
