'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TimelineEntry {
  type: string;
  date: string;
}

interface EngagementTimelineProps {
  interactions: { meetingDate?: string | null }[];
  events: { startDate?: string | null }[];
  awards: { year?: number | null }[];
  community: { startDate?: string | null }[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function EngagementTimeline({ interactions, events, awards, community }: EngagementTimelineProps) {
  const { buckets, maxCount } = useMemo(() => {
    const now = new Date();
    const entries: TimelineEntry[] = [];

    interactions.forEach(i => {
      if (i.meetingDate) entries.push({ type: 'interaction', date: i.meetingDate });
    });
    events.forEach(e => {
      if (e.startDate) entries.push({ type: 'event', date: e.startDate });
    });
    awards.forEach(a => {
      if (a.year) entries.push({ type: 'award', date: `${a.year}-06-01` });
    });
    community.forEach(c => {
      if (c.startDate) entries.push({ type: 'community', date: c.startDate });
    });

    const months: { key: string; label: string; year: number; interactions: number; events: number; other: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: MONTHS[d.getMonth()],
        year: d.getFullYear(),
        interactions: 0,
        events: 0,
        other: 0,
      });
    }

    for (const entry of entries) {
      const ym = entry.date.slice(0, 7);
      const bucket = months.find(m => m.key === ym);
      if (!bucket) continue;
      if (entry.type === 'interaction') bucket.interactions++;
      else if (entry.type === 'event') bucket.events++;
      else bucket.other++;
    }

    const max = Math.max(1, ...months.map(m => m.interactions + m.events + m.other));
    return { buckets: months, maxCount: max };
  }, [interactions, events, awards, community]);

  const totalActivities = buckets.reduce((s, b) => s + b.interactions + b.events + b.other, 0);
  const activeMonths = buckets.filter(b => b.interactions + b.events + b.other > 0).length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Engagement Timeline</h3>
          <p className="text-[10px] text-muted-foreground">Activity over the last 12 months</p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-primary" />
            Interactions ({buckets.reduce((s, b) => s + b.interactions, 0)})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-400" />
            Events ({buckets.reduce((s, b) => s + b.events, 0)})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
            Other ({buckets.reduce((s, b) => s + b.other, 0)})
          </span>
        </div>
      </div>

      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {buckets.map((b) => {
          const total = b.interactions + b.events + b.other;
          const interactionH = (b.interactions / maxCount) * 100;
          const eventH = (b.events / maxCount) * 100;
          const otherH = (b.other / maxCount) * 100;

          return (
            <div key={b.key} className="group relative flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse" style={{ height: 88 }}>
                {total > 0 ? (
                  <>
                    <div
                      className="w-full rounded-t-sm bg-primary transition-opacity group-hover:opacity-80"
                      style={{ height: `${interactionH}%` }}
                    />
                    <div
                      className="w-full bg-blue-400 transition-opacity group-hover:opacity-80"
                      style={{ height: `${eventH}%` }}
                    />
                    <div
                      className="w-full bg-amber-400 transition-opacity group-hover:opacity-80"
                      style={{ height: `${otherH}%`, borderRadius: eventH === 0 && interactionH === 0 ? '2px 2px 0 0' : 0 }}
                    />
                  </>
                ) : (
                  <div className="w-full rounded-t-sm bg-muted/50" style={{ height: '3%' }} />
                )}
              </div>
              <span className={cn(
                'mt-1.5 text-[9px]',
                total > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {b.label}
              </span>
              {total > 0 && (
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="rounded-md bg-foreground px-2 py-1 text-[10px] text-background whitespace-nowrap shadow-lg">
                    {b.interactions > 0 && <div>{b.interactions} interaction{b.interactions !== 1 ? 's' : ''}</div>}
                    {b.events > 0 && <div>{b.events} event{b.events !== 1 ? 's' : ''}</div>}
                    {b.other > 0 && <div>{b.other} other</div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 border-t border-border pt-3">
        <div className="text-center flex-1">
          <p className="text-lg font-bold">{totalActivities}</p>
          <p className="text-[10px] text-muted-foreground">Total Activities</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold">{activeMonths}<span className="text-xs font-normal text-muted-foreground">/12</span></p>
          <p className="text-[10px] text-muted-foreground">Active Months</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold">{totalActivities > 0 ? (totalActivities / 12).toFixed(1) : '0'}</p>
          <p className="text-[10px] text-muted-foreground">Avg / Month</p>
        </div>
      </div>
    </div>
  );
}
