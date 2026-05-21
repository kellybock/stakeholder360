'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SessionUser {
  userId: string;
  fullName: string;
  agency: string;
  role: string;
  email: string;
}

const SessionContext = createContext<SessionUser | null>(null);

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setUser(data.user))
      .catch(() => {});
  }, []);

  return (
    <SessionContext.Provider value={user}>
      {children}
    </SessionContext.Provider>
  );
}
