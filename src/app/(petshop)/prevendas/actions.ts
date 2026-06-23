'use server';

import { apiFetch, qs, FILIAL } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export interface PreVenda {
  id:          number;
  filial:      number;
  cliente_id:  number;
  cliente:     string;
  data:        string;
  hora:        string;
  valor:       number;
  sub_total:   number;
  desconto:    number;
  valor_frete: number;
  status:      number;
  situacao:    string;
  formapgto:   string;
  condpgto:    string;
  data_entrega: string;
  hora_entrega: string;
  animal:      string;
  profissional: string;
  pago:        string;
}

export interface PreVendaDetalhe extends PreVenda {
  val_produtos: number;
  val_acresc:   number;
  frete:        string;
  pz_entrega:   string;
  justificativa: string;
  dados:        string;
  tipo_servico: string;
}

export interface ItemPreVenda {
  id_prodorca:   number;
  id_orca:       number;
  cod_prod:      string;
  desc_pro:      string;
  descpro:       string;
  qtd:           number;
  valor:         number;
  valorliq:      number;
  desconto:      number;
  preco_tabela:  number;
  unid_pro:      string;
  status_vendido: string;
  ordem:         number;
}

// ── Listagem ──

export async function buscarPrevendas(params: {
  status?: string;
  data_de?: string;
  data_ate?: string;
  skip?: number;
  limit?: number;
}) {
  return apiFetch<{ dados: PreVenda[]; Count: number }>(
    `/api/petshop/prevendas${qs({
      filial:   FILIAL,
      status:   params.status || undefined,
      data_de:  params.data_de || undefined,
      data_ate: params.data_ate || undefined,
      skip:     params.skip ?? 0,
      limit:    params.limit ?? 100,
    })}`,
  ).catch(() => ({ dados: [] as PreVenda[], Count: 0 }));
}

export async function buscarPrevendaDetalhe(id: number) {
  return apiFetch<PreVendaDetalhe & { CodStatus?: number }>(
    `/api/petshop/prevendas/detalhe?id=${id}&filial=${FILIAL}`,
  );
}

export async function buscarItensPreVenda(id: number) {
  return apiFetch<{ dados: ItemPreVenda[]; Count: number }>(
    `/api/petshop/prevendas/itens?id=${id}&filial=${FILIAL}`,
  ).catch(() => ({ dados: [] as ItemPreVenda[], Count: 0 }));
}

// ── Mutações ──

export async function criarPreVenda(body: Record<string, unknown>) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string; id?: number }>(
    '/api/petshop/prevendas',
    { method: 'POST', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
  if (res.CodStatus === 1) revalidatePath('/prevendas');
  return res;
}

export async function atualizarPreVenda(body: Record<string, unknown>) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/prevendas',
    { method: 'PUT', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
  if (res.CodStatus === 1) revalidatePath('/prevendas');
  return res;
}

export async function confirmarPreVenda(id: number) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/prevendas/confirmar',
    { method: 'POST', body: JSON.stringify({ id, filial: FILIAL }) },
  );
  if (res.CodStatus === 1) revalidatePath('/prevendas');
  return res;
}

export async function cancelarPreVenda(id: number, justificativa: string) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/prevendas/cancelar',
    { method: 'POST', body: JSON.stringify({ id, filial: FILIAL, justificativa }) },
  );
  if (res.CodStatus === 1) revalidatePath('/prevendas');
  return res;
}

export async function adicionarItemPreVenda(body: Record<string, unknown>) {
  return apiFetch<{ CodStatus: number; DescricaoStatus: string; id_prodorca?: number }>(
    '/api/petshop/prevendas/itens',
    { method: 'POST', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
}

export async function editarItemPreVenda(body: Record<string, unknown>) {
  return apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/prevendas/itens',
    { method: 'PUT', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
}

export async function removerItemPreVenda(idProdorca: number) {
  return apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/prevendas/itens',
    { method: 'DELETE', body: JSON.stringify({ id_prodorca: idProdorca, filial: FILIAL }) },
  );
}

// ── Busca de suporte ──

export interface ClienteBuscaItem {
  id:       number;
  filial:   number;
  nome:     string;
  telefone: string;
  celular:  string;
}

export async function buscarClientesPrevenda(q: string): Promise<ClienteBuscaItem[]> {
  if (!q.trim() || q.trim().length < 2) return [];
  const res = await apiFetch<{ dados: ClienteBuscaItem[]; Count: number }>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: FILIAL })}`,
  ).catch(() => ({ dados: [] as ClienteBuscaItem[], Count: 0 }));
  return (res.dados ?? []).slice(0, 10);
}

export interface ClienteDetalhe {
  id: number; filial: number; nome: string;
  endereco: string; numero: string; bairro: string; cep: string;
  telefone: string; celular: string;
}

export async function buscarClienteDetalhe(id: number): Promise<ClienteDetalhe | null> {
  try {
    const res = await apiFetch<{ dados?: ClienteDetalhe[] }>(
      `/api/petshop/clientes?filial=${FILIAL}&filter1=${encodeURIComponent(`s.COD_CLI=${id}`)}&limit=1`,
    );
    return (res.dados ?? [])[0] ?? null;
  } catch {
    return null;
  }
}

export interface ProdutoBuscaItem {
  id_dadospro: number;
  filial:      number;
  cod_pro:     string;
  descricao:   string;
  unidade:     string;
  preco:       number;
  estoque:     number;
}

interface ProdutoApiRaw {
  id_dadospro: number; cod_filial: number; nome_produto: string;
  cod_pro: string; unidade: string; preco: number; estoque: number;
}

export async function buscarProdutosPrevenda(q: string): Promise<ProdutoBuscaItem[]> {
  if (!q.trim() || q.trim().length < 2) return [];
  const res = await apiFetch<{ dados: ProdutoApiRaw[]; Count: number }>(
    `/api/petshop/produtos${qs({ filial: FILIAL, busca: q.trim(), limit: 50 })}`,
  ).catch(() => ({ dados: [] as ProdutoApiRaw[], Count: 0 }));
  return (res.dados ?? []).map(p => ({
    id_dadospro: p.id_dadospro,
    filial:      p.cod_filial,
    cod_pro:     p.cod_pro,
    descricao:   p.nome_produto,
    unidade:     p.unidade,
    preco:       p.preco,
    estoque:     p.estoque,
  }));
}
