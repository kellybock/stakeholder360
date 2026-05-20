'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type UploadRecord = {
  id: string;
  fileName: string;
  tableTarget: string;
  rowCount: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsFailed: number;
  status: string;
  createdAt: string;
};

const USERS = [
  { name: 'Admin User', email: 'admin@youth360.gov.sg', agency: 'NYC', role: 'Admin' },
  { name: 'Sarah Tan', email: 'rm.mccy@youth360.gov.sg', agency: 'MCCY', role: 'RM' },
  { name: 'Ahmad Ibrahim', email: 'rm.nyc@youth360.gov.sg', agency: 'NYC', role: 'RM' },
  { name: 'Priya Nair', email: 'rm.pa@youth360.gov.sg', agency: 'PA', role: 'RM' },
  { name: 'David Lim', email: 'rm.moe@youth360.gov.sg', agency: 'MOE', role: 'RM' },
  { name: 'Rachel Wong', email: 'rm.msf@youth360.gov.sg', agency: 'MSF', role: 'RM' },
];

export default function UserManagementPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number } | null>(null);

  useEffect(() => {
    fetch('/api/upload/history').then(r => r.json()).then(d => setUploads(d.history ?? [])).catch(() => {});
    fetch('/api/dashboard').then(r => r.json()).then(d => setStats({ total: d.totalStakeholders, active: d.activeThisMonth })).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage portal users, view system status, and audit upload history
          </p>
        </div>
      </div>

      {/* System stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Portal Users</p>
          <p className="mt-1 text-2xl font-bold">{USERS.length}</p>
          <p className="text-[10px] text-muted-foreground">Across {new Set(USERS.map(u => u.agency)).size} agencies</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Total Stakeholders</p>
          <p className="mt-1 text-2xl font-bold">{stats?.total ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground">In data store</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Data Uploads</p>
          <p className="mt-1 text-2xl font-bold">{uploads.length}</p>
          <p className="text-[10px] text-muted-foreground">Total imports</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Portal Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agency</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((user) => (
                <tr key={user.email} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{user.agency}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{user.role}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload History */}
      {uploads.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Upload History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">File</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Table</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Rows</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Inserted</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Updated</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Failed</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(u => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-medium text-xs">{u.fileName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{u.tableTarget}</td>
                    <td className="px-4 py-2 text-center text-xs">{u.rowCount}</td>
                    <td className="px-4 py-2 text-center text-xs text-green-600">{u.rowsInserted}</td>
                    <td className="px-4 py-2 text-center text-xs text-blue-600">{u.rowsUpdated}</td>
                    <td className="px-4 py-2 text-center text-xs text-red-600">{u.rowsFailed}</td>
                    <td className="px-4 py-2">
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        u.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
