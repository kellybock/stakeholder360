'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-provider';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const user = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button onClick={onMenuToggle} className="rounded-md p-1.5 hover:bg-muted lg:hidden">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-sm font-medium text-muted-foreground">
          {user?.agency ?? ''}
        </h2>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {user?.fullName?.split(' ').map(n => n[0]).join('') ?? '?'}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-medium">{user?.fullName ?? 'Loading...'}</p>
            <p className="text-[10px] text-muted-foreground">{user?.role ?? ''}</p>
          </div>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
