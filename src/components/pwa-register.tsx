'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Em desenvolvimento (next dev) os arquivos de _next/static/ mantêm o
    // mesmo nome entre rebuilds (sem hash de conteúdo como em produção) —
    // a estratégia "cache first" do sw.js passa então a servir pra sempre o
    // JS antigo em cache, mesmo depois de reiniciar o servidor ou dar
    // hard refresh. PWA só faz sentido em produção; em dev, desregistra
    // qualquer service worker já instalado e limpa o cache pra garantir
    // que a página sempre reflita o código atual.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

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
  }, []);

  return null;
}
