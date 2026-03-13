import { useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import { resolveImageUrl } from '../api';

export default function RoleLayout({
  title,
  user,
  items,
  activeKey,
  onSelect,
  onLogout,
  children,
  enableProfilePhotoActions = false,
  onProfilePhotoUpload,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [photoActionOpen, setPhotoActionOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [expandedMenuKey, setExpandedMenuKey] = useState('');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef(null);
  const mainRef = useRef(null);
  const pullStartYRef = useRef(0);
  const pullActiveRef = useRef(false);

  const profilePhotoUrl = user?.profile_photo ? resolveImageUrl(user.profile_photo) : '';

  const selectAndClose = (key) => {
    onSelect(key);
    setMobileOpen(false);
  };

  const openPhotoActions = () => {
    if (!enableProfilePhotoActions) return;
    setPhotoActionOpen(true);
    setPhotoError('');
  };

  const handleChoosePhoto = () => {
    if (!enableProfilePhotoActions || !fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handlePhotoFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onProfilePhotoUpload) return;

    setUploadingPhoto(true);
    setPhotoError('');
    try {
      await onProfilePhotoUpload(file);
      setPhotoActionOpen(false);
    } catch (err) {
      setPhotoError(err?.message || 'Failed to update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const MenuPanel = (
    <div className="h-full overflow-y-auto border-r border-slate-800/60 bg-gradient-to-b from-slate-950 to-slate-900 px-5 pb-6 pt-8 text-white shadow-2xl [padding-top:calc(env(safe-area-inset-top)+1rem)]">
      <div className="mb-6 overflow-visible pt-1">
        <BrandLogo size="sm" className="max-w-full" />
      </div>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-slate-800/85 to-slate-900/85 p-5 shadow-xl ring-1 ring-slate-700/50 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            className={`h-10 w-10 !rounded-full !bg-transparent !p-0 !shadow-none before:!hidden ${enableProfilePhotoActions ? 'cursor-pointer ring-2 ring-transparent transition hover:ring-orange-300' : 'cursor-default'}`}
            onClick={openPhotoActions}
            title={enableProfilePhotoActions ? 'View or edit profile photo' : 'Profile photo'}
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#fd7e14] to-orange-600 text-base font-bold text-white shadow-lg">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={`${user.name} profile`} className="block h-full w-full object-cover" />
              ) : (
                user.name?.charAt(0).toUpperCase() || 'U'
              )}
            </span>
          </button>
          <p className="text-xl font-bold tracking-wide text-white">{title}</p>
        </div>
        <div className="ml-12 space-y-1">
          <p className="text-sm font-semibold text-slate-100">{user.name}</p>
          <p className="text-xs font-mono text-slate-300">{user.office_id}</p>
          {enableProfilePhotoActions && (
            <p className="text-[11px] text-slate-400">Tap photo to view or edit</p>
          )}
          {photoError && <p className="text-xs text-rose-300">{photoError}</p>}
        </div>
      </div>

      <nav className="grid gap-2.5">
        {items.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0;
          const childActive = hasChildren && item.children.some((child) => child.key === activeKey);
          const parentActive = activeKey === item.key || childActive;

          return (
            <div key={item.key} className="group">
              <button
                className={parentActive
                  ? 'w-full rounded-xl !bg-gradient-to-r !from-orange-500 !to-amber-500 px-4 py-3 text-left text-sm font-bold !text-white shadow-lg shadow-orange-500/35'
                  : 'w-full rounded-xl border border-slate-700/80 !bg-slate-800/90 px-4 py-3 text-left text-sm font-semibold !text-slate-100 hover:!bg-slate-700/95'}
                onClick={() => {
                  if (!hasChildren) {
                    selectAndClose(item.key);
                    return;
                  }
                  setExpandedMenuKey((prev) => (prev === item.key ? '' : item.key));
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  <span className="flex items-center gap-2">
                    {Number(item.badge) > 0 && (
                      <span className="min-w-6 rounded-full bg-rose-500 px-2 py-0.5 text-center text-xs font-bold text-white shadow shadow-rose-500/40">
                        {item.badge}
                      </span>
                    )}
                    {hasChildren && (
                      <span className="text-xs text-white/80">{expandedMenuKey === item.key ? '▲' : '▼'}</span>
                    )}
                  </span>
                </span>
              </button>

              {hasChildren && (
                <div
                  className={`mt-2 grid gap-2 rounded-xl border border-slate-700/80 !bg-slate-900/70 p-2 shadow-lg shadow-slate-950/35 ${expandedMenuKey === item.key || childActive ? 'grid' : 'hidden'} lg:hidden lg:group-hover:grid lg:group-focus-within:grid`}
                >
                  {item.children.map((child) => (
                    <button
                      key={child.key}
                      className={activeKey === child.key
                        ? 'w-full rounded-lg border border-cyan-300/70 !bg-cyan-50 px-3 py-2 text-left text-xs font-bold !text-slate-900 shadow-sm shadow-cyan-700/20'
                        : 'w-full rounded-lg border border-slate-700/70 !bg-transparent px-3 py-2 text-left text-xs font-semibold !text-slate-200 hover:!bg-slate-800/85'}
                      onClick={() => selectAndClose(child.key)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className={activeKey === child.key ? 'h-1.5 w-1.5 rounded-full bg-cyan-500' : 'h-1.5 w-1.5 rounded-full bg-slate-500'} />
                          <span>{child.label}</span>
                        </span>
                        {Number(child.badge) > 0 && (
                          <span className="min-w-6 rounded-full bg-rose-500 px-2 py-0.5 text-center text-[10px] font-bold text-white shadow shadow-rose-500/40">
                            {child.badge}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button
        className="mt-6 w-full !rounded-xl !bg-gradient-to-r !from-red-600 !to-red-500 px-4 py-3 text-sm font-bold !text-white shadow-lg shadow-red-500/40 before:!hidden hover:!from-red-500 hover:!to-red-400"
        onClick={onLogout}
      >
        Logout
      </button>

      {enableProfilePhotoActions && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handlePhotoFileChange}
        />
      )}
    </div>
  );

  const handleMainTouchStart = (event) => {
    if (isRefreshing || mobileOpen) return;
    const main = mainRef.current;
    if (!main) return;
    if (main.scrollTop > 0) return;
    if (!event.touches?.length) return;
    pullStartYRef.current = event.touches[0].clientY;
    pullActiveRef.current = true;
  };

  const handleMainTouchMove = (event) => {
    if (!pullActiveRef.current || isRefreshing || mobileOpen) return;
    const touchY = event.touches?.[0]?.clientY;
    if (typeof touchY !== 'number') return;
    const delta = touchY - pullStartYRef.current;

    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    const damped = Math.min(120, delta * 0.45);
    setPullDistance(damped);
    if (damped > 0) {
      event.preventDefault();
    }
  };

  const handleMainTouchEnd = () => {
    const shouldRefresh = pullDistance >= 70 && !isRefreshing;
    pullActiveRef.current = false;
    setPullDistance(0);
    if (!shouldRefresh) return;

    setIsRefreshing(true);
    window.location.reload();
  };

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

      <main
        ref={mainRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-7 lg:h-screen lg:p-8"
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        onTouchCancel={handleMainTouchEnd}
      >
        <div
          className="pointer-events-none sticky top-0 z-20 flex justify-center transition-all duration-150"
          style={{
            height: pullDistance > 0 ? `${pullDistance}px` : '0px',
            opacity: pullDistance > 0 || isRefreshing ? 1 : 0,
          }}
        >
          <div className="mt-1 rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
            {isRefreshing ? 'Refreshing...' : pullDistance >= 70 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
        {children}
      </main>

      {enableProfilePhotoActions && photoActionOpen && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 p-4" onClick={() => setPhotoActionOpen(false)}>
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 text-sm font-semibold text-slate-900">Profile Photo</p>
            <div className="grid gap-2">
              <button type="button" className="!py-2.5 text-sm" onClick={() => { setPhotoActionOpen(false); setPhotoViewerOpen(true); }}>
                View Photo
              </button>
              <button type="button" className="!py-2.5 text-sm" onClick={handleChoosePhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? 'Updating...' : 'Edit Photo'}
              </button>
              <button type="button" className="ghost !py-2.5 text-sm" onClick={() => setPhotoActionOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {enableProfilePhotoActions && photoViewerOpen && (
        <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/80 p-4" onClick={() => setPhotoViewerOpen(false)}>
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute right-3 top-3 z-10 !h-8 !w-8 !rounded-full !bg-slate-200 !p-0 !text-lg !font-bold !leading-none !text-slate-700 !shadow-none before:!hidden hover:!bg-slate-300"
              onClick={() => setPhotoViewerOpen(false)}
              aria-label="Close photo viewer"
            >
              ×
            </button>
            <div className="grid min-h-[240px] place-items-center rounded-xl bg-slate-100 p-3">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={`${user.name} profile zoom`} className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
              ) : (
                <p className="text-sm text-slate-600">No profile photo uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
