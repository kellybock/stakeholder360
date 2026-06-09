'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/session-provider';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
    ],
  },
  {
    section: 'Stakeholders',
    items: [
      { href: '/dashboard/stakeholders', label: 'Directory', icon: 'users' },
      { href: '/dashboard/network', label: 'Network Graph', icon: 'share' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/dashboard/analytics/engagement', label: 'Engagement', icon: 'activity' },
      { href: '/dashboard/analytics/influence', label: 'Influence Map', icon: 'target' },
    ],
  },
  {
    section: 'Workspace',
    items: [
      { href: '/dashboard/workspace', label: 'My Workspace', icon: 'briefcase' },
      { href: '/dashboard/ai-chat', label: 'AI Assistant', icon: 'bot' },
      { href: '/dashboard/research', label: 'Research', icon: 'search' },
    ],
  },
  {
    section: 'Data',
    items: [
      { href: '/dashboard/upload', label: 'Upload Data', icon: 'upload' },
      { href: '/dashboard/impact', label: 'Impact Dashboard', icon: 'bar-chart' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { href: '/dashboard/admin/users', label: 'User Management', icon: 'shield' },
      { href: '/dashboard/admin/settings', label: 'API Keys & Settings', icon: 'key' },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  users: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  share: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeWidth={2}/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeWidth={2}/></svg>,
  activity: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>,
  target: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/><circle cx="12" cy="12" r="6" strokeWidth={2}/><circle cx="12" cy="12" r="2" strokeWidth={2}/></svg>,
  briefcase: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" strokeWidth={2}/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeWidth={2}/></svg>,
  bot: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2" strokeWidth={2}/><circle cx="12" cy="5" r="2" strokeWidth={2}/><line x1="12" y1="7" x2="12" y2="11" strokeWidth={2}/><line x1="8" y1="16" x2="8" y2="16" strokeWidth={3} strokeLinecap="round"/><line x1="16" y1="16" x2="16" y2="16" strokeWidth={3} strokeLinecap="round"/></svg>,
  upload: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/><polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>,
  'bar-chart': <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10" strokeLinecap="round" strokeWidth={2}/><line x1="18" y1="20" x2="18" y2="4" strokeLinecap="round" strokeWidth={2}/><line x1="6" y1="20" x2="6" y2="16" strokeLinecap="round" strokeWidth={2}/></svg>,
  settings: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth={2}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth={2}/></svg>,
  shield: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  key: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  search: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" strokeWidth={2}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35"/></svg>,
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useSession();
  const [aiAvailable, setAiAvailable] = useState(true);

  useEffect(() => {
    fetch('/api/ai/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setAiAvailable(d.available); })
      .catch(() => {});
  }, []);

  const visibleSections = session?.role === 'admin'
    ? NAV_ITEMS
    : NAV_ITEMS.filter(s => s.section !== 'Admin');

  return (
    <>
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          Y3
        </div>
        <div>
          <p className="text-sm font-semibold">Youth360</p>
          <p className="text-[10px] text-sidebar-fg/50">Stakeholder Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.section} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-fg/40">
              {section.section}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const isAiItem = item.href === '/dashboard/ai-chat';
              const disabled = isAiItem && !aiAvailable;
              return (
                <Link
                  key={item.href}
                  href={disabled ? '#' : item.href}
                  onClick={(e) => {
                    if (disabled) { e.preventDefault(); return; }
                    onNavigate?.();
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    disabled
                      ? 'text-sidebar-fg/30 cursor-not-allowed'
                      : isActive
                        ? 'bg-sidebar-accent text-white'
                        : 'text-sidebar-fg/70 hover:bg-sidebar-accent/50 hover:text-white'
                  )}
                  title={disabled ? 'No AI API key configured' : undefined}
                >
                  {ICONS[item.icon]}
                  {item.label}
                  {disabled && <span className="ml-auto text-[9px] text-sidebar-fg/30">No key</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col bg-sidebar-bg text-sidebar-fg">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-bg text-sidebar-fg lg:hidden">
        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  );
}
