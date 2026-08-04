import { apiFetch, qs } from '@/lib/api';

interface ProdutoPorCodigo {
  CodStatus:  number;
  id_pro?:    number;
  cod_filial?: number;
  tem_imagem?: number;
}

// Muitos clientes cadastram a própria logo como um "produto coringa" (sem
// preço/estoque reais, e propositalmente INATIVO) só para guardar a imagem
// no banco — convenção usada aqui pelo código LOGO1001. Por ser inativo, não
// aparece na busca normal de produtos (filtra STATUS_ATIVO = 1) — por isso
// usa /produtos/por-codigo, que busca por código exato sem esse filtro.
// Cacheado por processo (10min) porque essa consulta rodaria em TODA
// navegação de TODO usuário (o layout é compartilhado por todas as páginas).
const COD_LOGO = 'LOGO1001';
const TTL_MS = 600_000;
const cache = new Map<string, { url: string | null; expira: number }>();

export async function obterLogoEmpresa(): Promise<string | null> {
  const chave = COD_LOGO;
  const c = cache.get(chave);
  if (c && c.expira > Date.now()) return c.url;

  let url: string | null = null;
  try {
    const res = await apiFetch<ProdutoPorCodigo>(
      `/api/petshop/produtos/por-codigo${qs({ cod_pro: COD_LOGO })}`,
    );
    if (res.CodStatus === 1 && res.tem_imagem && res.id_pro != null) {
      url = `/api/produto-imagem?id_pro=${res.id_pro}&filial=${res.cod_filial}`;
    }
  } catch {
    url = null;
  }

  cache.set(chave, { url, expira: Date.now() + TTL_MS });
  return url;
}
