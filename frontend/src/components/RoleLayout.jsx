import { useState } from 'react';
import BrandLogo from './BrandLogo';

export default function RoleLayout({ title, user, items, activeKey, onSelect, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectAndClose = (key) => {
    onSelect(key);
    setMobileOpen(false);
  };

  const MenuPanel = (
    <div className="h-full border-r border-slate-800/60 bg-gradient-to-b from-slate-950 to-slate-900 px-5 py-6 text-white shadow-2xl">
      <BrandLogo size="sm" className="mb-6 max-w-full" />

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-800/85 to-slate-900/85 p-5 shadow-xl ring-1 ring-slate-700/50 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#fd7e14] to-orange-600 text-base font-bold text-white shadow-lg">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <p className="text-xl font-bold tracking-wide text-white">{title}</p>
        </div>
        <div className="ml-12 space-y-1">
          <p className="text-sm font-semibold text-slate-100">{user.name}</p>
          <p className="text-xs font-mono text-slate-300">{user.office_id}</p>
        </div>
      </div>

      <nav className="grid gap-2.5">
        {items.map((item) => (
          <button
            key={item.key}
            className={activeKey === item.key
              ? 'rounded-xl bg-gradient-to-r from-[#fd7e14] to-orange-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-orange-500/40'
              : 'rounded-xl bg-slate-800/85 px-4 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700/90'}
            onClick={() => selectAndClose(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/30"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-100 lg:grid lg:grid-cols-[320px_1fr]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="mb-2 flex items-center justify-center overflow-hidden">
          <BrandLogo dark size="sm" className="max-w-full" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">{title} Dashboard</p>
            <p className="truncate text-xs text-slate-500">{user.name} ({user.office_id})</p>
          </div>
          <button
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-slate-700"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span className="relative block h-4 w-5">
              <span className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-current transition-all ${mobileOpen ? 'translate-y-[7px] rotate-45' : ''}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded bg-current transition-all ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded bg-current transition-all ${mobileOpen ? '-translate-y-[7px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-[86%] max-w-[320px] lg:hidden">
            {MenuPanel}
          </aside>
        </>
      )}

      <aside className="hidden h-screen overflow-y-auto lg:block">
        {MenuPanel}
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-7 lg:h-screen lg:p-8">{children}</main>
    </div>
  );
}
