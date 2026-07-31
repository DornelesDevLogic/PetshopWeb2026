'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite, ProdutoResponse, Produto } from '@/types/petshop';

async function postAction(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  return {};
}

/** Confirma a pré-venda (STATUS 1 → 2) */
export async function confirmarPrevenda(id: number): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/prevendas/confirmar', { id, filial: getFilial() });
  if (!r.error) { revalidatePath(`/vendas/${id}`); revalidatePath('/vendas'); }
  return r;
}

/** Cancela a pré-venda (STATUS → 4) */
export async function cancelarPrevenda(
  id: number,
  justificativa: string,
): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/prevendas/cancelar', { id, filial: getFilial(), justificativa });
  if (!r.error) { revalidatePath(`/vendas/${id}`); revalidatePath('/vendas'); }
  return r;
}

/** Busca produtos por texto */
export async function buscarProdutos(q: string): Promise<Produto[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ProdutoResponse>(
    `/api/petshop/produtos${qs({ filial: getFilial(), busca: q.trim(), limit: 15 })}`,
  ).catch(() => ({ dados: [] as Produto[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados;
}

/** Adiciona item à pré-venda */
export async function addItem(
  id: number,
  produto: Produto,
  qtd: number,
  valor: number,
  desconto: number,
): Promise<{ error?: string }> {
  const valorliq = qtd * valor - desconto;
  const body = {
    id_orca:       id,
    filial:        getFilial(),
    fk_id_dadospro:produto.id_dadospro,
    fk_cod_filial: produto.cod_filial,
    cod_prod:      String(produto.id_dadospro),
    desc_pro:      produto.nome_produto,
    descpro:       produto.nome_produto,
    qtd,
    valor,
    valorliq:      Math.max(0, valorliq),
    desconto,
    preco_tabela:  produto.preco,
    ordem:         0,
  };
  const r = await postAction('/api/petshop/prevendas/itens', body);
  if (!r.error) revalidatePath(`/vendas/${id}`);
  return r;
}

/** Remove item da pré-venda */
export async function deleteItem(
  vendaId: number,
  idProdorca: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/prevendas/itens', {
      method: 'DELETE',
      body: JSON.stringify({ id: idProdorca, filial: getFilial() }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/vendas/${vendaId}`);
  return {};
}
