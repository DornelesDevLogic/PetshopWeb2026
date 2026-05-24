/**
 * Helper de acesso ao backend Delphi.
 * Todas as chamadas passam pelo servidor Next.js — nunca do browser.
 * As credenciais Basic Auth ficam APENAS em variáveis de ambiente server-side.
 */

const BASE   = process.env.BACKEND_URL!;
const USER   = process.env.BACKEND_USER!;
const PASS   = process.env.BACKEND_PASS!;
export const FILIAL = Number(process.env.FILIAL ?? 1);

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
}

/** Fetch tipado com Basic Auth. Lança Error em resposta não-ok. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Backend ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/** Monta query string a partir de um objeto, ignorando valores null/undefined/''. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? '?' + pairs.join('&') : '';
}
