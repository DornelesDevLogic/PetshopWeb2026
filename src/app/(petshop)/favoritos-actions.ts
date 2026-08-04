'use server';

import { cookies } from 'next/headers';
import { NAV_ITEMS } from '@/lib/nav-items';
import { COOKIE_ACESSOS, UM_ANO_SEGUNDOS, lerContagemAcessos } from '@/lib/acessos-rapidos';

// Cada clique no menu (via AcessoTracker) chama isso — guardado por
// navegador/dispositivo (cookie), não por usuário no backend: cada posto de
// trabalho vai naturalmente destacar o que é mais usado NAQUELE dispositivo.
export async function registrarAcesso(pathname: string): Promise<void> {
  // Considera só a rota "raiz" do item de menu (ex: /agenda/nova → /agenda)
  const item = NAV_ITEMS.find((i) => i.href !== '/home' && pathname.startsWith(i.href));
  if (!item) return;

  const contagem = lerContagemAcessos();
  contagem[item.href] = (contagem[item.href] ?? 0) + 1;

  cookies().set(COOKIE_ACESSOS, JSON.stringify(contagem), {
    maxAge: UM_ANO_SEGUNDOS,
    path: '/',
    sameSite: 'lax',
  });
}
