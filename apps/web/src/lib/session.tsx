import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Me } from './types';

const SessionCtx = createContext<Me | null>(null);

export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 30_000,
  });
}

export function SessionProvider({ me, children }: { me: Me; children: ReactNode }) {
  return <SessionCtx.Provider value={me}>{children}</SessionCtx.Provider>;
}

export function useSession(): Me {
  const me = useContext(SessionCtx);
  if (!me) throw new Error('useSession fuera de SessionProvider');
  return me;
}
