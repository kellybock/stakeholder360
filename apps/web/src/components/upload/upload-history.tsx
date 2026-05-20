'use client';

import { cn } from '@/lib/utils';

interface UploadRecord {
  id: string;
  fileName: string;
  tableTarget: string;
  rowCount: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  status: string;
  createdAt: string;
}

interface UploadHistoryProps {
  history: UploadRecord[];
}

const TABLE_LABELS: Record<string, string> = {
  profiles: 'Profiles',
  relationship_managers: 'RMs',
  areas_of_interest: 'AOI',
  interactions: 'Interactions',
  events: 'Events',
  awards: 'Awards',
  community: 'Community',
  overseas_representation: 'Overseas',
};

export function UploadHistory({ history }: UploadHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        No uploads yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((record) => (
        <div key={record.id} className="rounded-lg border border-border p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium truncate max-w-40">{record.fileName}</p>
              <span className="mt-0.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium">
                {TABLE_LABELS[record.tableTarget] ?? record.tableTarget}
              </span>
            </div>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              record.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}>
              {record.status}
            </span>
          </div>
          <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
            <span>{record.rowCount} rows</span>
            <span className="text-green-600">+{record.rowsInserted}</span>
            <span className="text-blue-600">~{record.rowsUpdated}</span>
            {record.rowsFailed > 0 && <span className="text-red-600">x{record.rowsFailed}</span>}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {new Date(record.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
