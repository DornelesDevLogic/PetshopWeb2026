import 'server-only';
import { cookies } from 'next/headers';

/**
 * Sessão pessoal do operador (pós-login) — Bearer JWT emitido pelo Delphi do
 * tenant em POST /api/petshop/auth/login, vinculado ao device_id. Separado
 * de EmpresaConfig (lib/empresa.ts): a empresa/tenant resolvida sobrevive ao
 * logout, a sessão pessoal não.
 */
export interface SessaoAtiva {
  token: string;
}

const COOKIE_AUTH = 'ps_auth';

export function getSessaoAtiva(): SessaoAtiva | null {
  try {
    const raw = cookies().get(COOKIE_AUTH)?.value;
    if (!raw) return null;
    const sessao = JSON.parse(raw) as SessaoAtiva;
    return sessao.token ? sessao : null;
  } catch {
    return null;
  }
}

export function salvarSessaoAtiva(token: string) {
  cookies().set(COOKIE_AUTH, JSON.stringify({ token }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas — mesma validade do JWT pessoal
  });
}

export function limparSessaoAtiva() {
  cookies().delete(COOKIE_AUTH);
}
