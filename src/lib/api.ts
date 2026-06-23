/**
 * Helper de acesso ao backend Delphi.
 * Todas as chamadas passam pelo servidor Next.js — nunca do browser.
 * As credenciais Basic Auth ficam APENAS em variáveis de ambiente server-side.
 *
 * Logs: grava em logs/api-YYYY-MM-DD.log (na raiz do petshop_web).
 *  - Sempre: erros (HTTP não-ok, falha de conexão, CodStatus negativo)
 *  - Com LOG_API=1 no .env: também todas as requisições (método, rota, duração)
 */

import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';

const BASE   = process.env.BACKEND_URL!;
const USER   = process.env.BACKEND_USER!;
const PASS   = process.env.BACKEND_PASS!;
export const FILIAL = Number(process.env.FILIAL ?? 1);

const LOG_TUDO = process.env.LOG_API === '1';
const LOG_DIR  = path.join(process.cwd(), 'logs');

function logLinha(nivel: 'INFO' | 'ERRO', msg: string) {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const agora = new Date();
    const arquivo = path.join(LOG_DIR, `api-${agora.toISOString().split('T')[0]}.log`);
    appendFileSync(
      arquivo,
      `[${agora.toLocaleTimeString('pt-BR')}] [${nivel}] ${msg}\n`,
      'utf8',
    );
  } catch {
    // logging nunca pode derrubar a aplicação
  }
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
}

/** Fetch tipado com Basic Auth. Lança Error em resposta não-ok. */
export async function apiFetch<T>(path_: string, init?: RequestInit): Promise<T> {
  const url    = `${BASE}${path_}`;
  const metodo = init?.method ?? 'GET';
  const inicio = Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  } catch (e) {
    logLinha('ERRO', `${metodo} ${path_} — FALHA DE CONEXÃO: ${e instanceof Error ? e.message : e}`
      + (init?.body ? ` | body=${init.body}` : ''));
    throw e;
  }

  const ms = Date.now() - inicio;

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    logLinha('ERRO', `${metodo} ${path_} — HTTP ${res.status} (${ms}ms): ${body.slice(0, 500)}`
      + (init?.body ? ` | enviado=${init.body}` : ''));
    throw new Error(`Backend ${res.status}: ${body}`);
  }

  const json = await res.json() as T;

  // Loga respostas com CodStatus de erro (validação/SQL do Delphi)
  const cod = (json as { CodStatus?: number })?.CodStatus;
  if (typeof cod === 'number' && cod < 0) {
    const desc = (json as { DescricaoStatus?: string })?.DescricaoStatus ?? '';
    logLinha('ERRO', `${metodo} ${path_} — CodStatus ${cod} (${ms}ms): ${desc}`
      + (init?.body ? ` | enviado=${init.body}` : ''));
  } else if (LOG_TUDO) {
    logLinha('INFO', `${metodo} ${path_} — OK (${ms}ms)`
      + (init?.body ? ` | enviado=${init.body}` : ''));
  }

  return json;
}

/** Monta query string a partir de um objeto, ignorando valores null/undefined/''. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? '?' + pairs.join('&') : '';
}
