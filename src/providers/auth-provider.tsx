'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api/endpoints/auth';
import { useAuthStore } from '@/store/auth.store';

const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    async function silentRefresh() {
      setLoading(true);
      if (isPublicPath) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.refresh();
        const newToken = data.data.accessToken;

        const meRes = await authApi.me();
        setAuth(meRes.data.data, newToken);

        if (isPublicPath) {
          router.replace('/dashboard');
        }
      } catch {
        clearAuth();
        if (!isPublicPath) {
          router.replace('/login');
        }
      }
    }

    silentRefresh();
    // Run once on mount only — pathname is intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
