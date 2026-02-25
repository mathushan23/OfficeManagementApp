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
  const fileInputRef = useRef(null);

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
        {items.map((item) => (
          <button
            key={item.key}
            className={activeKey === item.key
              ? 'rounded-xl bg-gradient-to-r from-[#fd7e14] to-orange-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-orange-500/40'
              : 'rounded-xl bg-slate-800/85 px-4 py-3 text-left text-sm font-semibold text-slate-100 hover:bg-slate-700/90'}
            onClick={() => selectAndClose(item.key)}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{item.label}</span>
              {Number(item.badge) > 0 && (
                <span className="min-w-6 rounded-full bg-rose-500 px-2 py-0.5 text-center text-xs font-bold text-white shadow shadow-rose-500/40">
                  {item.badge}
                </span>
              )}
            </span>
          </button>
        ))}
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
