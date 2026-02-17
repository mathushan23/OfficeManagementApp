const STORAGE_KEY = 'office_app_auth';

export function saveAuth(auth) {
  const normalized = auth?.user ? { user: auth.user } : null;
  if (!normalized) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function readAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.user) return { user: parsed.user };
    return null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
