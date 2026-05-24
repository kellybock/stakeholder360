'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface EngagementTimelineProps {
  interactions: { meetingDate?: string | null; agency?: string | null; interactionDetails?: string | null }[];
  events: { startDate?: string | null; organizerAgency?: string | null; eventTitle?: string | null }[];
  awards: { year?: number | null; awardName?: string | null }[];
  community: { startDate?: string | null; orgGroupName?: string | null; role?: string | null }[];
}

const AGENCY_COLORS: Record<string, string> = {
  NYC: 'bg-blue-500',
  MCCY: 'bg-violet-500',
  MOE: 'bg-emerald-500',
  MSF: 'bg-amber-500',
  MINDEF: 'bg-red-500',
  MHA: 'bg-cyan-500',
  Other: 'bg-slate-400',
  Unknown: 'bg-slate-300',
};

const AGENCY_BORDER_COLORS: Record<string, string> = {
  NYC: 'border-blue-500',
  MCCY: 'border-violet-500',
  MOE: 'border-emerald-500',
  MSF: 'border-amber-500',
  MINDEF: 'border-red-500',
  MHA: 'border-cyan-500',
  Other: 'border-slate-400',
  Unknown: 'border-slate-300',
};

type EntryType = 'interaction' | 'event' | 'award' | 'community';

const TYPE_SHAPES: Record<EntryType, string> = {
  interaction: 'rounded-full',
  event: 'rounded-sm',
  award: 'rotate-45 rounded-[1px]',
  community: 'rounded-full border-2 bg-transparent',
};

const TYPE_LABELS: Record<EntryType, string> = {
  interaction: 'Interaction',
  event: 'Event',
  award: 'Award',
  community: 'Community',
};

interface DotEntry {
  id: string;
  type: EntryType;
  date: string;
  name: string;
  agency: string;
  timestamp: number;
}

function getAgencyBg(agency: string): string {
  return AGENCY_COLORS[agency] ?? AGENCY_COLORS['Other'];
}

function getAgencyBorder(agency: string): string {
  return AGENCY_BORDER_COLORS[agency] ?? AGENCY_BORDER_COLORS['Other'];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EngagementTimeline({ interactions, events, awards, community }: EngagementTimelineProps) {
  const [hoveredDot, setHoveredDot] = useState<DotEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { entries, agencies, minTime, maxTime, agencyRows } = useMemo(() => {
    const dots: DotEntry[] = [];
    let idx = 0;

    interactions.forEach(i => {
      if (i.meetingDate) {
        dots.push({
          id: `int-${idx++}`,
          type: 'interaction',
          date: i.meetingDate,
          name: i.interactionDetails ?? 'Interaction',
          agency: i.agency ?? 'Unknown',
          timestamp: new Date(i.meetingDate).getTime(),
        });
      }
    });
    events.forEach(e => {
      if (e.startDate) {
        dots.push({
          id: `evt-${idx++}`,
          type: 'event',
          date: e.startDate,
          name: e.eventTitle ?? 'Event',
          agency: e.organizerAgency ?? 'Unknown',
          timestamp: new Date(e.startDate).getTime(),
        });
      }
    });
    awards.forEach(a => {
      if (a.year) {
        dots.push({
          id: `awd-${idx++}`,
          type: 'award',
          date: `${a.year}-06-01`,
          name: a.awardName ?? 'Award',
          agency: 'Other',
          timestamp: new Date(`${a.year}-06-01`).getTime(),
        });
      }
    });
    community.forEach(c => {
      if (c.startDate) {
        dots.push({
          id: `com-${idx++}`,
          type: 'community',
          date: c.startDate,
          name: c.role ? `${c.role} at ${c.orgGroupName ?? 'Organisation'}` : (c.orgGroupName ?? 'Community'),
          agency: 'Other',
          timestamp: new Date(c.startDate).getTime(),
        });
      }
    });

    const agencySet = new Set<string>();
    dots.forEach(d => agencySet.add(d.agency));
    const agencyList = Array.from(agencySet).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });

    const now = Date.now();
    const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000).getTime();
    const validDots = dots.filter(d => !isNaN(d.timestamp));
    const min = validDots.length > 0 ? Math.min(oneYearAgo, ...validDots.map(d => d.timestamp)) : oneYearAgo;
    const max = validDots.length > 0 ? Math.max(now, ...validDots.map(d => d.timestamp)) : now;

    const rows: Record<string, DotEntry[]> = {};
    agencyList.forEach(a => { rows[a] = []; });
    validDots.forEach(d => { rows[d.agency]?.push(d); });

    return { entries: validDots, agencies: agencyList, minTime: min, maxTime: max, agencyRows: rows };
  }, [interactions, events, awards, community]);

  const totalActivities = entries.length;
  const timeRange = maxTime - minTime || 1;

  function getXPercent(timestamp: number): number {
    return ((timestamp - minTime) / timeRange) * 100;
  }

  const tickCount = 5;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = minTime + (timeRange / (tickCount - 1)) * i;
    const d = new Date(t);
    return {
      percent: (i / (tickCount - 1)) * 100,
      label: d.toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
    };
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Engagement Timeline</h3>
          <p className="text-[10px] text-muted-foreground">{totalActivities} activities across {agencies.length} {agencies.length === 1 ? 'agency' : 'agencies'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span className={cn(
                'inline-block h-2.5 w-2.5 bg-foreground/70',
                TYPE_SHAPES[type as EntryType],
                type === 'community' && 'bg-transparent border-foreground/70'
              )} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Dot timeline */}
      <div className="relative">
        {agencies.map((agency) => (
          <div key={agency} className="flex items-center gap-2 mb-2">
            <div className="w-14 flex-shrink-0">
              <span className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white',
                getAgencyBg(agency)
              )}>
                {agency}
              </span>
            </div>
            <div className="relative flex-1 h-6 bg-muted/30 rounded">
              {agencyRows[agency]?.map((dot) => {
                const x = getXPercent(dot.timestamp);
                return (
                  <div
                    key={dot.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer"
                    style={{ left: `${x}%` }}
                    onMouseEnter={(e) => {
                      setHoveredDot(dot);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget.closest('.rounded-xl')?.getBoundingClientRect();
                      if (parent) {
                        setTooltipPos({ x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top - 4 });
                      }
                    }}
                    onMouseLeave={() => setHoveredDot(null)}
                  >
                    <div className={cn(
                      'h-3 w-3 transition-transform hover:scale-150',
                      dot.type === 'community'
                        ? cn(TYPE_SHAPES[dot.type], getAgencyBorder(agency), 'bg-transparent')
                        : cn(TYPE_SHAPES[dot.type], getAgencyBg(agency))
                    )} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Date axis */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-14 flex-shrink-0" />
          <div className="relative flex-1 h-4">
            {ticks.map((tick, i) => (
              <span
                key={i}
                className="absolute text-[9px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${tick.percent}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredDot && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="rounded-md bg-foreground px-2.5 py-1.5 text-[10px] text-background shadow-lg whitespace-nowrap">
              <div className="font-medium">{TYPE_LABELS[hoveredDot.type]}</div>
              <div className="mt-0.5 max-w-[200px] truncate">{hoveredDot.name}</div>
              <div className="mt-0.5 text-background/70">{formatDate(hoveredDot.date)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-3 flex gap-4 border-t border-border pt-3">
        <div className="text-center flex-1">
          <p className="text-lg font-bold">{totalActivities}</p>
          <p className="text-[10px] text-muted-foreground">Total Activities</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold">{agencies.length}</p>
          <p className="text-[10px] text-muted-foreground">Agencies</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-lg font-bold">
            {entries.length > 0
              ? formatDate(entries.sort((a, b) => b.timestamp - a.timestamp)[0].date)
              : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Last Activity</p>
        </div>
      </div>
    </div>
  );
}
