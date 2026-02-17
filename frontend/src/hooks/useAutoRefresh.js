import { useEffect } from 'react';

export default function useAutoRefresh(callback, intervalMs = 30000, deps = []) {
  useEffect(() => {
    const id = setInterval(() => {
      callback();
    }, intervalMs);

    return () => clearInterval(id);
  }, deps);
}

