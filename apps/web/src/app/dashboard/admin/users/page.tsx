'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  email: string;
  fullName: string;
  agency: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  actorName: string;
  actorEmail: string;
  targetType: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  timestamp: string;
};

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

const AGENCIES = [
  'National Youth Council (NYC)',
  'Ministry of Culture, Community and Youth (MCCY)',
  "People's Association (PA)",
  'Ministry of Education (MOE)',
  'Ministry of Social and Family Development (MSF)',
];

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'rm', label: 'Relationship Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'user.created': { label: 'User Created', color: 'bg-green-100 text-green-700' },
  'user.updated': { label: 'User Updated', color: 'bg-blue-100 text-blue-700' },
  'user.deleted': { label: 'User Deleted', color: 'bg-red-100 text-red-700' },
  'user.login': { label: 'Login', color: 'bg-gray-100 text-gray-700' },
  'user.logout': { label: 'Logout', color: 'bg-gray-100 text-gray-700' },
  'apikey.created': { label: 'API Key Created', color: 'bg-purple-100 text-purple-700' },
  'apikey.revoked': { label: 'API Key Revoked', color: 'bg-amber-100 text-amber-700' },
  'data.uploaded': { label: 'Data Upload', color: 'bg-cyan-100 text-cyan-700' },
  'settings.changed': { label: 'Settings Changed', color: 'bg-orange-100 text-orange-700' },
};

const emptyForm = { fullName: '', email: '', agency: AGENCIES[0], role: 'rm', password: '' };

export default function UserManagementPage() {
  const [tab, setTab] = useState<'users' | 'audit' | 'uploads'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/audit?limit=100').then(r => r.json()),
      fetch('/api/upload/history').then(r => r.json()),
    ])
      .then(([usersData, auditData, uploadData]) => {
        setUsers(usersData.users ?? []);
        setAudit(auditData.entries ?? []);
        setUploads(uploadData.history ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      agency: user.agency,
      role: user.role,
      password: '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.fullName || !form.email) {
      setFormError('Name and email are required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingUser) {
        const body: Record<string, string> = { id: editingUser.id };
        if (form.fullName !== editingUser.fullName) body.fullName = form.fullName;
        if (form.email !== editingUser.email) body.email = form.email;
        if (form.agency !== editingUser.agency) body.agency = form.agency;
        if (form.role !== editingUser.role) body.role = form.role;
        if (form.password) body.password = form.password;

        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user: User) {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, status: newStatus }),
    });
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    await fetch(`/api/admin/users?id=${deleteConfirm.id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    setDeleting(false);
    fetchAll();
  }

  const activeCount = users.filter(u => u.status === 'active').length;
  const agencyCount = new Set(users.map(u => u.agency)).size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">
            Manage portal users, view audit trails, and monitor system activity
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Total Users</p>
          <p className="mt-1 text-2xl font-bold">{users.length}</p>
          <p className="text-[10px] text-muted-foreground">{activeCount} active, {users.length - activeCount} suspended</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Agencies</p>
          <p className="mt-1 text-2xl font-bold">{agencyCount}</p>
          <p className="text-[10px] text-muted-foreground">With portal access</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Audit Events</p>
          <p className="mt-1 text-2xl font-bold">{audit.length}</p>
          <p className="text-[10px] text-muted-foreground">Tracked actions</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Data Uploads</p>
          <p className="mt-1 text-2xl font-bold">{uploads.length}</p>
          <p className="text-[10px] text-muted-foreground">Total imports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(['users', 'audit', 'uploads'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'users' ? 'Users' : t === 'audit' ? 'Audit Trail' : 'Upload History'}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Portal Users</h3>
            <button
              onClick={openCreate}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Add User
            </button>
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
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {user.fullName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-medium">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                        {user.agency.match(/\(([^)]+)\)/)?.[1] ?? user.agency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{user.role}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5',
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', user.status === 'active' ? 'bg-green-500' : 'bg-red-500')} />
                        {user.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(user)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {tab === 'audit' && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Audit Trail</h3>
            <p className="text-[10px] text-muted-foreground">All tracked admin actions</p>
          </div>
          {audit.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">No audit entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Actions like creating users, revoking API keys, etc. will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {audit.map(entry => {
                const actionInfo = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-0.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap', actionInfo.color)}>
                        {actionInfo.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium">{entry.actorName}</span>
                        {' '}
                        {entry.action.split('.')[1]}d
                        {entry.targetLabel && (
                          <> <span className="font-medium">{entry.targetLabel}</span></>
                        )}
                      </p>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {Object.entries(entry.details)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload History Tab */}
      {tab === 'uploads' && uploads.length > 0 && (
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

      {tab === 'uploads' && uploads.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No uploads yet</p>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
              <h3 className="text-lg font-semibold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {editingUser ? 'Update user details below' : 'Fill in the details to create a new portal user'}
              </p>

              {formError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="e.g. user@youth360.gov.sg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Agency</label>
                  <select
                    value={form.agency}
                    onChange={e => setForm(p => ({ ...p, agency: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {AGENCIES.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder={editingUser ? '••••••••' : 'demo1234'}
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-red-600">Delete User</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-medium text-foreground">{deleteConfirm.fullName}</span>?
                This action cannot be undone.
              </p>
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
