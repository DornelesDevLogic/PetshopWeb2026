'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Verificar updates a cada 60 s
        intervalId = setInterval(() => {
          reg.update().catch(() => {
            // SW pode ter sido descartado (hot reload) — ignora silenciosamente
            if (intervalId) clearInterval(intervalId);
          });
        }, 60_000);

        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
              newSw.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        // SW não pôde ser registrado — app continua funcionando normalmente
      });

    return () => {
      if (intervalId) clearInterval(intervalId);
    };

    // Recarregar quando um novo SW assumir o controle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }, []);

  return null;
}
