'use client';

import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  Nominated: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Champion: 'bg-purple-100 text-purple-700',
  Advocate: 'bg-amber-100 text-amber-700',
  Dormant: 'bg-gray-100 text-gray-500',
};

interface ProfileHeaderProps {
  profile: {
    fullName: string;
    nricMasked: string;
    caseStatus: string | null;
    caseId: string | null;
    email: string | null;
    mobileNumber: string | null;
    employerOrg: string | null;
    designation: string | null;
  };
  crossAgencyCount: number;
  agencies: string[];
  engagement?: {
    lastContactDate: string | null;
    daysSinceContact: number | null;
    segment: string;
  } | null;
}

function formatLastContact(date: string | null, days: number | null): string {
  if (!date || days === null) return 'No contact recorded';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function lastContactColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground';
  if (days <= 30) return 'text-green-600';
  if (days <= 90) return 'text-amber-600';
  return 'text-red-600';
}

export function ProfileHeader({ profile, crossAgencyCount, agencies, engagement }: ProfileHeaderProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.fullName}</h1>
            {profile.caseStatus && (
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                STATUS_COLORS[profile.caseStatus] ?? 'bg-gray-100 text-gray-600'
              )}>
                {profile.caseStatus}
              </span>
            )}
            {crossAgencyCount >= 2 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                Known to {crossAgencyCount} agencies
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{profile.nricMasked}</span>
            {profile.caseId && <span>Case: {profile.caseId}</span>}
            {profile.employerOrg && <span>{profile.designation ? `${profile.designation} at ` : ''}{profile.employerOrg}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {profile.email && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                {profile.email}
              </span>
            )}
            {profile.mobileNumber && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                {profile.mobileNumber}
              </span>
            )}
            {engagement && (
              <span className={cn('flex items-center gap-1', lastContactColor(engagement.daysSinceContact))}>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Last engaged: {formatLastContact(engagement.lastContactDate, engagement.daysSinceContact)}
                {engagement.lastContactDate && (
                  <span className="text-muted-foreground text-[10px] ml-1">({engagement.lastContactDate})</span>
                )}
              </span>
            )}
          </div>

          {agencies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {agencies.map(a => {
                const short = a.match(/\(([^)]+)\)/)?.[1] ?? a.slice(0, 10);
                return (
                  <span key={a} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium" title={a}>
                    {short}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
