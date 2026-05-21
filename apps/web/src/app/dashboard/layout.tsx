'use client';

import { useState } from 'react';
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SessionProvider } from '@/components/session-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuToggle={() => setMobileOpen(v => !v)} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
