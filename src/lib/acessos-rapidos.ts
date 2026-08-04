import { cookies } from 'next/headers';
import { NAV_ITEMS, type NavItem } from '@/lib/nav-items';

export const COOKIE_ACESSOS = 'ps_acessos';
export const UM_ANO_SEGUNDOS = 60 * 60 * 24 * 365;

// Ordem padrão pra usuário/dispositivo novo, sem nenhum histórico de uso ainda.
const PADRAO: string[] = ['/agenda', '/clientes', '/animais', '/consultas'];

type Contagem = Record<string, number>;

export function lerContagemAcessos(): Contagem {
  try {
    const raw = cookies().get(COOKIE_ACESSOS)?.value;
    if (!raw) return {};
    const obj = JSON.parse(raw) as Contagem;
    return typeof obj === 'object' && obj ? obj : {};
  } catch {
    return {};
  }
}

export type AcessoRapido = NavItem;

// Usado pela tela Início: top N itens por uso real (cookie por dispositivo);
// sem histórico ainda, cai no padrão acima.
export function obterAcessosRapidos(limite = 4): AcessoRapido[] {
  const contagem = lerContagemAcessos();
  const usados = Object.keys(contagem).filter((h) => contagem[h] > 0);

  const ordem = usados.length > 0
    ? [...usados].sort((a, b) => contagem[b] - contagem[a])
    : PADRAO;

  const vistos = new Set<string>();
  const resultado: AcessoRapido[] = [];
  for (const href of [...ordem, ...PADRAO]) {
    if (vistos.has(href)) continue;
    const item = NAV_ITEMS.find((i) => i.href === href);
    if (!item) continue;
    vistos.add(href);
    resultado.push(item);
    if (resultado.length >= limite) break;
  }
  return resultado;
}
