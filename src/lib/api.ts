/**
 * Helper de acesso ao backend Delphi.
 * Todas as chamadas passam pelo servidor Next.js — nunca do browser.
 *
 * Multi-tenant via giro360_backend: a URL do Delphi (backend_url) é resolvida
 * por CNPJ (ver lib/empresa.ts — cookie ps_empresa, definido em /registro ou
 * /confirmacao), não é mais fixa por .env. O Bearer usado é:
 *   - o token PESSOAL da sessão (ps_auth/lib/sessao.ts), quando logado;
 *   - senão, um token de APLICAÇÃO obtido do giro360_backend por CNPJ
 *     (lib/giroBackend.ts) — usado antes do login (ex: listar filiais).
 *
 * Logs: grava em logs/api-YYYY-MM-DD.log (na raiz do petshop_web).
 *  - Sempre: erros (HTTP não-ok, falha de conexão, CodStatus negativo)
 *  - Com LOG_API=1 no .env: também todas as requisições (método, rota, duração)
 */

import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { getEmpresaAtiva } from './empresa';
import { getSessaoAtiva } from './sessao';
import { getApiToken } from './giroBackend';

/**
 * Filial ativa da sessão (espelha o modelo do sistema legado:
 * escolhida no login, fixa até o logout).
 * Ordem de resolução: ps_user.filial (sessão) → cookie ps_filial
 * (última escolhida) → env FILIAL → 1.
 * Só pode ser chamada em request scope (pages, actions, route handlers).
 */
export function getFilial(): number {
  try {
    const store = cookies();
    const raw = store.get('ps_user')?.value;
    if (raw) {
      const f = Number((JSON.parse(raw) as { filial?: number }).filial);
      if (Number.isFinite(f) && f > 0) return f;
    }
    const fc = Number(store.get('ps_filial')?.value);
    if (Number.isFinite(fc) && fc > 0) return fc;
  } catch {
    // fora de request scope ou cookie corrompido → fallback env
  }
  return Number(process.env.FILIAL ?? 1);
}

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

/** URL do Delphi do tenant resolvido neste dispositivo (via /registro ou /confirmacao). */
export function getBackendUrl(): string {
  const empresa = getEmpresaAtiva();
  if (!empresa) throw new Error('Nenhuma empresa registrada neste dispositivo. Acesse /registro primeiro.');
  return empresa.backend_url.replace(/\/$/, '');
}

/**
 * Token Bearer para a próxima chamada: o pessoal (pós-login) tem prioridade;
 * sem sessão pessoal, cai para o token de aplicação (por CNPJ, via
 * giro360_backend) — cobre o /login buscando a lista de filiais antes de
 * o operador estar autenticado.
 */
async function resolverToken(forcarNovoAppToken = false): Promise<string> {
  const sessao = getSessaoAtiva();
  if (sessao?.token) return sessao.token;

  const empresa = getEmpresaAtiva();
  if (!empresa) throw new Error('Nenhuma empresa registrada neste dispositivo. Acesse /registro primeiro.');
  return getApiToken(empresa.cnpj, forcarNovoAppToken);
}

/** Exportado para rotas que montam o próprio fetch (ex.: proxy de imagem binária). */
export const getBearerToken = resolverToken;

/** Fetch tipado com Bearer (sessão pessoal ou token de aplicação). Lança Error em resposta não-ok. */
export async function apiFetch<T>(path_: string, init?: RequestInit): Promise<T> {
  const base   = getBackendUrl();
  const url    = `${base}${path_}`;
  const metodo = init?.method ?? 'GET';
  const inicio = Date.now();
  const usandoSessaoPessoal = !!getSessaoAtiva()?.token;

  async function disparar(token: string): Promise<Response> {
    return fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    });
  }

  let res: Response;
  try {
    res = await disparar(await resolverToken());
    // Token de aplicação pode ter sido invalidado no backend do tenant (ex:
    // reinício) mesmo dentro da janela de cache — tenta uma vez com token
    // novo. Não se aplica à sessão pessoal (401 ali é sessão expirada mesmo).
    if (res.status === 401 && !usandoSessaoPessoal) {
      res = await disparar(await resolverToken(true));
    }
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
