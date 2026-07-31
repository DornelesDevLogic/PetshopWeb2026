import 'server-only';

/**
 * Cliente do giro360_backend (VPS) — infraestrutura multi-tenant compartilhada
 * com o giro_web. Toda chamada carrega `aplicacao: 'petshop_web'` — sem isso
 * o backend assume o default 'giro_web' e resolve o tunnel/dispositivo errado.
 *
 * Este arquivo é server-only e trata SÓ da emissão do token de aplicação
 * (GET /giro/token) — a doc do fluxo é explícita que esse endpoint nunca deve
 * ser chamado do browser. Captcha/registro/status são chamados direto do
 * browser (RegistroForm.tsx/confirmacao), como no giro_web — a origem do
 * petshop_web já está liberada em CORS_ORIGINS na VPS.
 */

const APLICACAO = 'petshop_web';

function vpsUrl(): string {
  const url = process.env.VPS_URL;
  if (!url) throw new Error('VPS_URL não configurado no .env do petshop_web.');
  return url.replace(/\/$/, '');
}

// Chave exigida pelo giro360_backend em GET /giro/token (header X-App-Key) —
// mesmo valor configurado no giro360_backend e no giro_web em produção. Sem
// isso, /giro/token responde 401. Se trocar, tem que trocar nos 3 lugares
// (giro360_backend, giro_web, petshop_web) ao mesmo tempo.
function appTokenKey(): string {
  const key = process.env.APP_TOKEN_KEY;
  if (!key) throw new Error('APP_TOKEN_KEY não configurado no .env do petshop_web.');
  return key;
}

// Cache em memória do processo — o token dura 8h no servidor, cacheia por 7h.
interface CachedToken { token: string; expiraEm: number }
const cacheToken = new Map<string, CachedToken>();

export async function getApiToken(cnpj: string, forcarNovo = false): Promise<string> {
  const cached = cacheToken.get(cnpj);
  if (!forcarNovo && cached && cached.expiraEm > Date.now() + 60_000) return cached.token;

  const url = `${vpsUrl()}/giro/token?cnpj=${encodeURIComponent(cnpj)}&aplicacao=${APLICACAO}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'X-App-Key': appTokenKey() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    throw new Error(body.erro || `Falha ao obter token de aplicação (HTTP ${res.status})`);
  }
  cacheToken.set(cnpj, { token: body.token, expiraEm: Date.now() + 7 * 60 * 60 * 1000 });
  return body.token;
}
