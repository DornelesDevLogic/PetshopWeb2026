import { apiFetch, qs, getFilial } from '@/lib/api';

interface EmpresaResposta {
  CodStatus:    number;
  nome?:        string;
  fantasia?:    string;
  logo_base64?: string;
  logo_mime?:   string;
}

export interface EmpresaInfo {
  nomeFantasia: string | null;
  logoUrl:      string | null;
}

const VAZIO: EmpresaInfo = { nomeFantasia: null, logoUrl: null };

// /api/petshop/empresa (TBLCAPFILIAIS) já devolve razão social, nome
// fantasia e o logo (via produto coringa LOGO1001) tudo junto — evita duas
// chamadas separadas. Cacheado por processo (10min): essa consulta rodaria
// em TODA navegação de TODO usuário, já que o layout é compartilhado.
const TTL_MS = 600_000;
const cache = new Map<string, { info: EmpresaInfo; expira: number }>();

export async function obterInfoEmpresa(): Promise<EmpresaInfo> {
  const filial = getFilial();
  const chave = `${filial}`;
  const c = cache.get(chave);
  if (c && c.expira > Date.now()) return c.info;

  let info: EmpresaInfo = VAZIO;
  try {
    const res = await apiFetch<EmpresaResposta>(`/api/petshop/empresa${qs({ filial })}`);
    if (res.CodStatus === 1) {
      const fantasia = (res.fantasia || res.nome || '').trim() || null;
      const logoUrl = res.logo_base64
        ? `data:${res.logo_mime || 'image/jpeg'};base64,${res.logo_base64}`
        : null;
      info = { nomeFantasia: fantasia, logoUrl };
    }
  } catch {
    info = VAZIO;
  }

  cache.set(chave, { info, expira: Date.now() + TTL_MS });
  return info;
}
