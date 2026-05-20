'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TimelineEntry {
  id: string;
  type: string;
  date: string;
  title: string;
  description: string | null;
  agency: string | null;
}

const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  interaction: { color: 'bg-blue-500', icon: '💬', label: 'Interaction' },
  event: { color: 'bg-green-500', icon: '📅', label: 'Event' },
  award: { color: 'bg-amber-500', icon: '🏆', label: 'Award' },
  community: { color: 'bg-purple-500', icon: '🤝', label: 'Community' },
  overseas: { color: 'bg-red-500', icon: '🌏', label: 'Overseas' },
};

interface TimelineProps {
  entries: TimelineEntry[];
}

export function Timeline({ entries }: TimelineProps) {
  const [filter, setFilter] = useState<string>('');
  const types = [...new Set(entries.map(e => e.type))];

  const filtered = filter ? entries.filter(e => e.type === filter) : entries;

  if (entries.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No activity recorded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !filter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          )}
        >
          All ({entries.length})
        </button>
        {types.map(type => {
          const config = TYPE_CONFIG[type];
          const count = entries.filter(e => e.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setFilter(type === filter ? '' : type)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === type ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {config?.label ?? type} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0 pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
        {filtered.map((entry) => {
          const config = TYPE_CONFIG[entry.type] ?? { color: 'bg-gray-400', icon: '•', label: entry.type };
          return (
            <div key={entry.id} className="relative pb-6 last:pb-0">
              <div className={cn('absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-background', config.color)} />
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">{config.label}</span>
                    {entry.agency && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                        {entry.agency.match(/\(([^)]+)\)/)?.[1] ?? entry.agency.slice(0, 15)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {entry.date || 'No date'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{entry.title}</p>
                {entry.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{entry.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
