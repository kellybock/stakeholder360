'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_ACCOUNTS = [
  { email: 'admin@youth360.gov.sg', label: 'Admin (NYC)' },
  { email: 'rm.mccy@youth360.gov.sg', label: 'Sarah Tan (MCCY)' },
  { email: 'rm.nyc@youth360.gov.sg', label: 'Ahmad Ibrahim (NYC)' },
  { email: 'rm.pa@youth360.gov.sg', label: 'Priya Nair (PA)' },
  { email: 'rm.moe@youth360.gov.sg', label: 'David Lim (MOE)' },
  { email: 'rm.msf@youth360.gov.sg', label: 'Rachel Wong (MSF)' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function selectDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('demo1234');
    setError('');
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar-bg p-12 text-sidebar-fg lg:flex">
        <div>
          <h1 className="text-3xl font-bold">Youth360</h1>
          <p className="mt-1 text-sm text-sidebar-fg/60">Smart Stakeholder Portal</p>
        </div>
        <div className="space-y-4">
          <p className="text-lg font-medium">
            Multi-Agency Stakeholder Relationship Management
          </p>
          <p className="text-sm text-sidebar-fg/70">
            Identify, engage, grow and activate youth stakeholders across
            Singapore government agencies.
          </p>
        </div>
        <p className="text-xs text-sidebar-fg/40">Government of Singapore</p>
      </div>

      {/* Right panel */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <h1 className="text-2xl font-bold">Youth360</h1>
            <p className="text-sm text-muted-foreground">Smart Stakeholder Portal</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access the portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="name@agency.gov.sg"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter your password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <button
            onClick={() => alert('Azure AD SSO integration will be available in production.')}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Sign in with Azure AD (SSO)
          </button>

          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              DEMO ACCOUNTS (password: demo1234)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  onClick={() => selectDemoAccount(account.email)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
