'use server';

import { apiFetch, qs, FILIAL } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export interface TeleEntrega {
  id:          number;
  filial:      number;
  cliente_id:  number;
  cliente:     string;
  data:        string;
  hora:        string;
  valor:       number;
  status:      number;
  data_entrega: string;
  hora_entrega: string;
  endereco:    string;
  bairro:      string;
  cep:         string;
  nro_endereco: string;
  animal:      string;
  profissional: string;
  formapgto:   string;
  condpgto:    string;
  pago:        string;
}

export interface TeleEntregaDetalhe extends TeleEntrega {
  sub_total:   number;
  val_produtos: number;
  desconto:    number;
  valor_frete: number;
  justificativa: string;
  dados:       string;
  tipo_servico: string;
}

export interface ItemEntrega {
  id_item:   number;
  agenda_id: number;
  cod_pro:   string;
  produto:   string;
  descricao: string;
  unidade:   string;
  qtd:       number;
  valor:     number;
  valor_liq: number;
  desconto:  number;
  preco_tab: number;
  vendido:   string;
}

export async function buscarTeleEntregas(params: {
  busca?: string;
  status?: string;
  data_de?: string;
  data_ate?: string;
  skip?: number;
  limit?: number;
}) {
  return apiFetch<{ dados: TeleEntrega[]; Count: number }>(
    `/api/petshop/tele-entregas${qs({
      filial:   FILIAL,
      busca:    params.busca || undefined,
      status:   params.status || undefined,
      data_de:  params.data_de || undefined,
      data_ate: params.data_ate || undefined,
      skip:     params.skip ?? 0,
      limit:    params.limit ?? 100,
    })}`,
  ).catch(() => ({ dados: [] as TeleEntrega[], Count: 0 }));
}

export async function buscarTeleEntregaDetalhe(id: number) {
  return apiFetch<TeleEntregaDetalhe>(
    `/api/petshop/tele-entregas/detalhe?id=${id}&filial=${FILIAL}`,
  );
}

export async function buscarItensTeleEntrega(id: number) {
  return apiFetch<{ dados: ItemEntrega[]; Count: number }>(
    `/api/petshop/agenda/itens?id=${id}&filial=${FILIAL}`,
  ).catch(() => ({ dados: [] as ItemEntrega[], Count: 0 }));
}

export async function criarTeleEntrega(body: Record<string, unknown>) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string; id?: number }>(
    '/api/petshop/tele-entregas',
    { method: 'POST', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
  if (res.CodStatus === 1) revalidatePath('/tele-entregas');
  return res;
}

export async function atualizarTeleEntrega(body: Record<string, unknown>) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/tele-entregas',
    { method: 'PUT', body: JSON.stringify({ filial: FILIAL, ...body }) },
  );
  if (res.CodStatus === 1) revalidatePath('/tele-entregas');
  return res;
}

export async function confirmarTeleEntrega(id: number, dataReal?: string) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/tele-entregas/confirmar',
    { method: 'POST', body: JSON.stringify({ id, filial: FILIAL, data_entrega_real: dataReal }) },
  );
  if (res.CodStatus === 1) revalidatePath('/tele-entregas');
  return res;
}

export async function cancelarTeleEntrega(id: number, justificativa: string) {
  const res = await apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/tele-entregas/cancelar',
    { method: 'POST', body: JSON.stringify({ id, filial: FILIAL, justificativa }) },
  );
  if (res.CodStatus === 1) revalidatePath('/tele-entregas');
  return res;
}

export async function adicionarItemEntrega(body: Record<string, unknown>) {
  return apiFetch<{ CodStatus: number; DescricaoStatus: string; id_item?: number }>(
    '/api/petshop/agenda/itens',
    { method: 'POST', body: JSON.stringify({ agenda_filial: FILIAL, ...body }) },
  );
}

export async function removerItemEntrega(idItem: number) {
  return apiFetch<{ CodStatus: number; DescricaoStatus: string }>(
    '/api/petshop/agenda/itens',
    { method: 'DELETE', body: JSON.stringify({ id_item: idItem, filial: FILIAL }) },
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

export async function buscarClientesTele(q: string): Promise<ClienteBuscaItem[]> {
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
  filial:      number;  // mapeado de cod_filial
  cod_pro:     string;
  descricao:   string;  // mapeado de nome_produto
  unidade:     string;
  preco:       number;
  estoque:     number;
}

interface ProdutoApiRaw {
  id_dadospro: number; cod_filial: number; nome_produto: string;
  cod_pro: string; unidade: string; preco: number; estoque: number;
}

export async function buscarProdutosTele(q: string): Promise<ProdutoBuscaItem[]> {
  if (!q.trim() || q.trim().length < 2) return [];
  const res = await apiFetch<{ dados: ProdutoApiRaw[]; Count: number }>(
    `/api/petshop/produtos${qs({ filial: FILIAL, busca: q.trim(), ativo: 1, limit: 50 })}`,
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

/** Item de sugestão = produto + quanto foi vendido no período */
export interface SugestaoItem extends ProdutoBuscaItem {
  total_vendido: number;
}

interface SugestaoApiRaw extends ProdutoApiRaw {
  total_vendido: number;
}

/** Histórico completo de tele-entregas de um cliente específico */
export async function buscarHistoricoClienteTele(
  clienteId: number,
): Promise<TeleEntrega[]> {
  const res = await apiFetch<{ dados: TeleEntrega[]; Count: number }>(
    `/api/petshop/tele-entregas${qs({ filial: FILIAL, cliente_id: clienteId, limit: 300 })}`,
  ).catch(() => ({ dados: [] as TeleEntrega[], Count: 0 }));
  return (res.dados ?? []).map((t: any) => ({
    id:           t.id           ?? 0,
    filial:       t.filial       ?? FILIAL,
    cliente_id:   t.cliente_id   ?? clienteId,
    cliente:      t.cliente      ?? '',
    data:         t.data         ?? '',
    hora:         t.hora         ?? '',
    valor:        Number(t.valor ?? 0),
    status:       Number(t.status ?? 0),
    data_entrega: t.data_entrega ?? '',
    hora_entrega: t.hora_entrega ?? '',
    endereco:     t.endereco     ?? '',
    bairro:       t.bairro       ?? '',
    cep:          t.cep          ?? '',
    nro_endereco: t.nro_endereco ?? '',
    animal:       t.animal       ?? '',
    profissional: t.profissional ?? '',
    formapgto:    t.formapgto    ?? '',
    condpgto:     t.condpgto     ?? '',
    pago:         t.pago         ?? '',
  }));
}

/** Produtos mais vendidos nas tele-entregas dos últimos N dias (padrão 2) */
export async function buscarSugestoesTele(
  dias = 2,
  limit = 2,
): Promise<SugestaoItem[]> {
  const res = await apiFetch<{ dados: SugestaoApiRaw[]; Count: number }>(
    `/api/petshop/tele-entregas/sugestoes${qs({ filial: FILIAL, dias, limit })}`,
  ).catch(() => ({ dados: [] as SugestaoApiRaw[], Count: 0 }));
  return (res.dados ?? []).map(p => ({
    id_dadospro:   p.id_dadospro,
    filial:        p.cod_filial,
    cod_pro:       p.cod_pro,
    descricao:     p.nome_produto,
    unidade:       p.unidade,
    preco:         p.preco,
    estoque:       p.estoque ?? 0,
    total_vendido: p.total_vendido ?? 0,
  }));
}
