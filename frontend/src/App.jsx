import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import AttenderDashboard from './pages/attender/AttenderDashboard';
import BossDashboard from './pages/boss/BossDashboard';
import { clearAuth, readAuth, saveAuth } from './auth';
import { api } from './api';

export default function App() {
  const [auth, setAuth] = useState(readAuth());
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const user = await api.me();
        const next = { user };
        setAuth(next);
        saveAuth(next);
      } catch {
        clearAuth();
        setAuth(null);
      } finally {
        setBooting(false);
      }
    };

    restore();
  }, []);

  const handleLogin = (next) => {
    setAuth(next);
    saveAuth(next);
  };

  const handleLogout = () => {
    api.logout().catch(() => {});
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith('om:dismiss:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    }
    clearAuth();
    setAuth(null);
  };

  const handleUserUpdated = (user) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user };
      saveAuth(next);
      return next;
    });
  };

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-br from-orange-100 via-slate-100 to-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-[#fd7e14]"></div>
          <p className="text-lg font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!auth?.user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (auth.user.role === 'staff') {
    return <StaffDashboard user={auth.user} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />;
  }

  if (auth.user.role === 'attender') {
    return <AttenderDashboard user={auth.user} onLogout={handleLogout} />;
  }

  if (auth.user.role === 'boss') {
    return <BossDashboard user={auth.user} onLogout={handleLogout} />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-orange-100 via-slate-100 to-slate-200 p-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100 text-4xl">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-900">Unsupported Role</h2>
        <p className="mt-2 text-slate-600">Please contact your administrator</p>
      </div>
    </div>
  );
}
