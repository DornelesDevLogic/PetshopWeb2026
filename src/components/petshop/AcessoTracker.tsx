'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { registrarAcesso } from '@/app/(petshop)/favoritos-actions';

// Componente invisível: a cada troca de rota, registra o acesso (cookie por
// dispositivo) usado pelos cards de "Acesso rápido" da tela Início. Vive no
// layout do grupo (petshop) — monta uma vez, roda a cada mudança de pathname.
export default function AcessoTracker() {
  const pathname = usePathname();
  const ultimoRegistrado = useRef<string | null>(null);

  useEffect(() => {
    if (ultimoRegistrado.current === pathname) return;
    ultimoRegistrado.current = pathname;
    registrarAcesso(pathname).catch(() => {});
  }, [pathname]);

  return null;
}
