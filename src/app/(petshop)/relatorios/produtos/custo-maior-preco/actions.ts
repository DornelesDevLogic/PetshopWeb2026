'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

export interface ProdutoCustoMaiorPreco {
  id_pro:     number;
  cod_filial: number;
  descricao:  string;
  especie:    string;
  fabricante: string;
  cod_pro:    string;
  custo:      number;
  preco:      number;
  diferenca:  number;
}

/**
 * Produtos com preço de custo (TBLDADOSPRO.CUSTO) cadastrado acima do preço
 * de venda (TBLDADOSPRO.PRECO) na filial de estoque — indica erro de
 * precificação/reajuste esquecido. Somente leitura.
 */
export async function buscarProdutosCustoMaiorPreco(): Promise<ProdutoCustoMaiorPreco[]> {
  const res = await apiFetch<{ dados: ProdutoCustoMaiorPreco[]; Count: number }>(
    `/api/petshop/relatorios/produtos/custo-maior-preco${qs({ filial: getFilial(), limit: 500 })}`,
  ).catch(() => ({ dados: [] as ProdutoCustoMaiorPreco[], Count: 0 }));
  return res.dados ?? [];
}
