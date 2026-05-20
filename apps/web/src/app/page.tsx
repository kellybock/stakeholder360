import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-sidebar-bg text-sidebar-fg">
      <header className="flex items-center justify-between px-6 py-4 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            Y3
          </div>
          <span className="text-sm font-semibold">Youth360</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg border border-sidebar-fg/20 px-4 py-2 text-sm font-medium hover:bg-sidebar-accent/50"
        >
          Sign In
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Youth360
          </h1>
          <p className="mt-3 text-lg text-sidebar-fg/70 max-w-xl">
            Multi-Agency AI-Powered Smart Stakeholder 360 Portal for Singapore Government Agencies
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-2xl w-full">
          {[
            { icon: '🔍', title: 'Identify', desc: 'Cross-agency stakeholder discovery and network sharing' },
            { icon: '📊', title: 'Engage', desc: 'AI-powered insights, scoring, and predictive analytics' },
            { icon: '🚀', title: 'Grow & Activate', desc: 'Proactive relationship management and journey tracking' },
          ].map(p => (
            <div key={p.title} className="rounded-xl border border-sidebar-fg/10 bg-sidebar-accent/30 p-5 text-left">
              <span className="text-2xl">{p.icon}</span>
              <h3 className="mt-2 text-sm font-semibold">{p.title}</h3>
              <p className="mt-1 text-xs text-sidebar-fg/60">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
          <span className="text-xs text-sidebar-fg/40">MCCY · NYC · PA · MOE · MSF</span>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-sidebar-fg/30">
        Government of Singapore · Youth360 Prototype
      </footer>
    </div>
  );
}
