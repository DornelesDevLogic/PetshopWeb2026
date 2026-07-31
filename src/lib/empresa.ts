import 'server-only';
import { cookies } from 'next/headers';

/**
 * Empresa/dispositivo resolvido neste navegador via giro360_backend
 * (registro + aprovação por e-mail/admin). Substitui o BACKEND_URL fixo do
 * .env — cada tenant tem sua própria URL de tunnel Cloudflare.
 *
 * Adaptação do padrão do giro_web (que guarda isso em localStorage, porque
 * lá o BROWSER fala direto com o Delphi do tenant). No petshop_web todo
 * acesso ao Delphi passa pelo servidor Next.js (Server Actions/Components),
 * então a mesma informação precisa estar visível no servidor — daí cookie
 * httpOnly em vez de localStorage.
 */
export interface EmpresaConfig {
  cnpj:        string;
  backend_url: string;
  device_id:   string;
  codigo?:     number;
  salvo_em:    string;
}

const COOKIE_EMPRESA = 'ps_empresa';

/** Lê a empresa resolvida neste dispositivo. null se ainda não passou por /registro ou /confirmacao. */
export function getEmpresaAtiva(): EmpresaConfig | null {
  try {
    const raw = cookies().get(COOKIE_EMPRESA)?.value;
    if (!raw) return null;
    const cfg = JSON.parse(raw) as EmpresaConfig;
    if (!cfg.cnpj || !cfg.backend_url || !cfg.device_id) return null;
    return cfg;
  } catch {
    return null;
  }
}

/** Salva a empresa resolvida (chamado a partir de /registro e /confirmacao, via Server Action). */
export function salvarEmpresaAtiva(cfg: EmpresaConfig) {
  cookies().set(COOKIE_EMPRESA, JSON.stringify(cfg), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // dispositivo fica aprovado indefinidamente, sobrevive ao logout
  });
}

export function limparEmpresaAtiva() {
  cookies().delete(COOKIE_EMPRESA);
}
