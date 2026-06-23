import { apiFetch, qs, FILIAL } from '@/lib/api';
import ProdutosView, { type ProdutoPesquisa } from '@/components/petshop/produtos/ProdutosView';

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

  const res = await apiFetch<{ dados: ProdutoPesquisa[]; Count: number }>(
    `/api/petshop/produtos/pesquisa${qs({
      filial:     FILIAL,
      busca:      busca || undefined,
      fabricante: fabricante || undefined,
      preco_min:  precoMin || undefined,
      preco_max:  precoMax || undefined,
      limit:      200,
    })}`,
  ).catch(() => ({ dados: [] as ProdutoPesquisa[], Count: 0 }));

  return (
    <ProdutosView
      produtos={res.dados ?? []}
      filtros={{ busca, fabricante, precoMin, precoMax }}
    />
  );
}
