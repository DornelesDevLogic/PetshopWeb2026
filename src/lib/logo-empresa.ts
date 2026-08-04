import { apiFetch, qs, getFilial } from '@/lib/api';

interface ProdutoBusca {
  id_pro:     number;
  cod_filial: number;
  cod_pro:    string;
  tem_imagem: number;
}

// Muitos clientes cadastram a própria logo como um "produto" (sem preço/estoque
// reais) só para guardar a imagem no banco — convenção usada aqui pelo código
// LOGO1001. Cacheado por processo (10min) porque essa consulta rodaria em TODA
// navegação de TODO usuário (o layout é compartilhado por todas as páginas).
const COD_LOGO = 'LOGO1001';
const TTL_MS = 600_000;
const cache = new Map<string, { url: string | null; expira: number }>();

export async function obterLogoEmpresa(): Promise<string | null> {
  const filial = getFilial();
  const chave = `${filial}`;
  const c = cache.get(chave);
  if (c && c.expira > Date.now()) return c.url;

  let url: string | null = null;
  try {
    const res = await apiFetch<{ dados: ProdutoBusca[] }>(
      `/api/petshop/produtos/pesquisa${qs({ filial, busca: COD_LOGO, limit: 5 })}`,
    );
    const item = (res.dados ?? []).find(
      (p) => p.cod_pro?.toUpperCase() === COD_LOGO && p.tem_imagem,
    );
    if (item) url = `/api/produto-imagem?id_pro=${item.id_pro}&filial=${item.cod_filial}`;
  } catch {
    url = null;
  }

  cache.set(chave, { url, expira: Date.now() + TTL_MS });
  return url;
}
