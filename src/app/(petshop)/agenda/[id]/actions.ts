'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { agendaHub } from '@/lib/agenda-events';
import { ApiWrite, DadosEmpresa, AgendaHistoricoResponse, AgendaHistoricoItem } from '@/types/petshop';
import { isSupervisor } from '@/lib/session';

// ─── Histórico de edições (ANALYTICS.FDB) ───────────────────────────────────

/**
 * Busca o histórico de edições de uma agenda. Gate de Supervisor checado nos
 * dois lados: aqui (evita nem chamar o backend se não for supervisor) e no
 * backend (GetAgendaHistoricoEdicoes, CodStatus -7) — a regra de verdade é a
 * do backend, esta checagem aqui é só pra não gastar uma chamada à toa.
 */
export async function buscarHistoricoEdicoes(
  id: number,
  filial: number = getFilial(),
): Promise<{ itens: AgendaHistoricoItem[]; erro?: string }> {
  if (!isSupervisor()) {
    return { itens: [], erro: 'Apenas usuários com nível Supervisor podem consultar o histórico de edições.' };
  }
  const res = await apiFetch<AgendaHistoricoResponse>(
    `/api/petshop/agenda/historico-edicoes${qs({ id, filial })}`,
  ).catch(() => null);
  if (!res) return { itens: [], erro: 'Não foi possível conectar ao servidor.' };
  if (res.CodStatus !== 1) return { itens: [], erro: res.DescricaoStatus || 'Erro ao buscar histórico.' };
  return { itens: res.dados };
}

// ─── Dados da empresa (cabeçalho de impressão) ──────────────────────────────

interface FiliaisResponse { dados: DadosEmpresa[]; Count: number; StartsAt: string; EndsAt: string }

/** Busca dados cadastrais da filial (nome, endereço, CEP, telefone) para cabeçalho de impressão */
export async function buscarDadosEmpresa(filial: number = getFilial()): Promise<DadosEmpresa | null> {
  const res = await apiFetch<FiliaisResponse>(
    `/api/petshop/filiais${qs({ filial, limit: 1 })}`,
  ).catch(() => ({ dados: [] as DadosEmpresa[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados[0] ?? null;
}

// ─── Produtos / Itens ────────────────────────────────────────────────────────

export interface ProdutoResultado {
  id_dadospro:  number;
  cod_filial:   number;
  nome_produto: string;
  unidade:      string;
  preco:        number;
  secao:        string;
  grupo:        string;
  cod_pro:      string;
  estoque:      number;
}

interface ProdutosResponse { dados: ProdutoResultado[]; Count: number }

/** Busca produtos por nome (mín. 3 chars) */
export async function buscarProdutos(busca: string): Promise<ProdutoResultado[]> {
  if (busca.trim().length < 3) return [];
  const res = await apiFetch<ProdutosResponse>(
    `/api/petshop/produtos?filial=${getFilial()}&busca=${encodeURIComponent(busca.trim())}&limit=50`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return res.dados;
}

/** Adiciona um produto à agenda */
export async function adicionarItemAgenda(
  agendaId:    number,
  filial:      number,
  dadosproId:  number,
  prodFilial:  number,
  qtd:         number,
  valor:       number,
  desconto:    number,
  descricao:   string,
  precoTabela: number,
  codProd?:    string,
): Promise<{ error?: string; id_item?: number }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/itens', {
      method: 'POST',
      body: JSON.stringify({
        agenda_id:    agendaId,
        agenda_filial: filial,
        dadospro_id:  dadosproId,
        prod_filial:  prodFilial,
        qtd,
        valor,
        desconto,
        descricao,
        preco_tabela: precoTabela,
        cod_prod:     codProd ?? '',
      }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/agenda/${agendaId}`);
  return { id_item: res.id_item as number };
}

/** Atualiza um item da agenda (qtd, valor, desconto, descricao) */
export async function atualizarItemAgenda(
  agendaId:  number,
  idItem:    number,
  filial:    number,
  qtd:       number,
  valor:     number,
  desconto:  number,
  descricao: string,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/itens', {
      method: 'PUT',
      body: JSON.stringify({ id_item: idItem, filial, qtd, valor, desconto, descricao }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/agenda/${agendaId}`);
  return {};
}

/** Exclui um item da agenda */
export async function excluirItemAgenda(
  agendaId: number,
  idItem:   number,
  filial:   number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/itens', {
      method: 'DELETE',
      body: JSON.stringify({ id_item: idItem, filial }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/agenda/${agendaId}`);
  return {};
}

// ─── Reagendar ───────────────────────────────────────────────────────────────

/** Altera data e/ou hora de um agendamento via endpoint reagendar */
export async function reagendarHorario(
  id:                 number,
  filial:             number,
  novaData:           string,   // YYYY-MM-DD
  novaHora:           string,   // HH:MM
  novaDataPrevisao?:  string,   // YYYY-MM-DDTHH:MM
  novaDataEntrega?:   string,   // YYYY-MM-DDTHH:MM
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/reagendar', {
      method: 'POST',
      body: JSON.stringify({
        id,
        filial,
        nova_data:           novaData,
        nova_hora:           novaHora,
        nova_data_previsao:  novaDataPrevisao ?? '',
        nova_data_entrega:   novaDataEntrega  ?? '',
        motivo: 'Alterado via arrastar na grade',
      }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/agenda');
  revalidatePath(`/agenda/${id}`);
  agendaHub.publish({ tipo: 'AGENDA_ALTERADA', acao: 'UPDATE', idAgenda: id, filial, dataAgenda: novaData });
  return {};
}

/**
 * Atualiza o status de um agendamento.
 * status aceito pelo backend: AGENDADO | CONFIRMADO | CHEGOU |
 *                             EM_ATENDIMENTO | FINALIZADO | CANCELADO | FALTA
 */
export async function atualizarStatus(
  id:      number,
  status:  string,
  obs?:    string,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/status', {
      method: 'POST',
      body: JSON.stringify({ id, filial: getFilial(), status, obs: obs ?? '' }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/agenda/${id}`);
  revalidatePath('/agenda');
  agendaHub.publish({ tipo: 'AGENDA_ALTERADA', acao: 'UPDATE', idAgenda: id, filial: getFilial() });
  return {};
}
