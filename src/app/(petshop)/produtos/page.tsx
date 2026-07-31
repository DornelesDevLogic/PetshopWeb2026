import { apiFetch, qs, getFilial } from '@/lib/api';
import ProdutosView, { type ProdutoPesquisa } from '@/components/petshop/produtos/ProdutosView';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';

interface Props {
  searchParams: {
    busca?:      string;
    fabricante?: string;
    preco_min?:  string;
    preco_max?:  string;
  };
}

export default async function ProdutosPage({ searchParams }: Props) {
  const busca      = searchParams.busca      ?? '';
  const fabricante = searchParams.fabricante ?? '';
  const precoMin   = searchParams.preco_min  ?? '';
  const precoMax   = searchParams.preco_max  ?? '';

  // Sem nenhum filtro não consulta o backend: a tela abre instantânea
  // e convida o usuário a pesquisar (a busca completa é pesada).
  const temFiltro = Boolean(busca || fabricante || precoMin || precoMax);

  const termos = normalizarTermosBusca(busca);

  const res = temFiltro
    ? await apiFetch<{ dados: ProdutoPesquisa[]; Count: number }>(
        `/api/petshop/produtos/pesquisa${qs({
          filial:     getFilial(),
          busca:      termos.length > 0 ? termoPrincipal(termos) : undefined,
          fabricante: fabricante || undefined,
          preco_min:  precoMin || undefined,
          preco_max:  precoMax || undefined,
          limit:      200,
        })}`,
      ).catch(() => ({ dados: [] as ProdutoPesquisa[], Count: 0 }))
    : { dados: [] as ProdutoPesquisa[], Count: 0 };

  const produtos = filtrarProdutosPorTermos(res.dados ?? [], termos, p => p.descricao + ' ' + p.cod_pro);

  return (
    <ProdutosView
      produtos={produtos}
      filtros={{ busca, fabricante, precoMin, precoMax }}
      pesquisou={temFiltro}
    />
  );
}
