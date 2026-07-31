'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Estimativa {
  id:             number;
  filial:         number;
  status:         number;   // 0=Pendente 1=Enviada 2=Cancelada (Vencida é calculada)
  cliente_id:     number;
  cliente_nome:   string;
  animal_id:      number;
  animal_nome:    string;
  produto:        string;
  dadospro_id:    number;
  qtd:            number;
  data_compra:    string;   // yyyy-mm-dd
  data_estimada:  string;   // yyyy-mm-dd
  data_lembrete:  string;   // yyyy-mm-dd (estimada - dias_lembrete da regra)
  dias_restantes: number;
  agenda_id:      number;
  celular:        string;
  telefone:       string;
}

export interface RegraEstimativa {
  id:            number;
  dadospro_id:   number;
  cod_prod:      string;
  produto:       string;
  dias_max:      number;
  dias_min:      number;
  dias_lembrete: number;
  cria_lembrete: number;
}

/** Regra simplificada usada na pergunta min/max ao gravar agenda */
export interface RegraProduto {
  id:            number;
  dadospro_id:   number;
  produto:       string;
  dias_max:      number;
  dias_min:      number;
  dias_lembrete: number;
}

export type FiltroStatus =
  | 'todas' | 'pendentes' | 'lembrete' | 'vencidas' | 'enviadas' | 'canceladas';

// ─── Listagem ────────────────────────────────────────────────────────────────

export async function buscarEstimativas(params: {
  status?:   FiltroStatus;
  busca?:    string;
  dataDe?:   string;
  dataAte?:  string;
  animalId?: number;
}): Promise<Estimativa[]> {
  const res = await apiFetch<{ dados: Estimativa[]; Count: number }>(
    `/api/petshop/estimativas${qs({
      filial:    getFilial(),
      status:    params.status && params.status !== 'todas' ? params.status : undefined,
      busca:     params.busca || undefined,
      data_de:   params.dataDe || undefined,
      data_ate:  params.dataAte || undefined,
      animal_id: params.animalId || undefined,
      limit:     300,
    })}`,
  ).catch(() => ({ dados: [] as Estimativa[], Count: 0 }));
  return res.dados ?? [];
}

export async function atualizarStatusEstimativa(
  id: number,
  status: number,
): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/estimativas/status', {
      method: 'POST',
      body: JSON.stringify({ id, filial: getFilial(), status }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/estimativas');
    return {};
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

// ─── Regras ──────────────────────────────────────────────────────────────────

export async function buscarRegras(busca?: string): Promise<RegraEstimativa[]> {
  const res = await apiFetch<{ dados: RegraEstimativa[]; Count: number }>(
    `/api/petshop/estimativas/regras${qs({ filial: getFilial(), busca: busca || undefined })}`,
  ).catch(() => ({ dados: [] as RegraEstimativa[], Count: 0 }));
  return res.dados ?? [];
}

export async function criarRegra(dados: {
  dadosproId:   number;
  codProd:      string;
  descPro:      string;
  diasMin:      number;
  diasMax:      number;
  diasLembrete: number;
}): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/estimativas/regras', {
      method: 'POST',
      body: JSON.stringify({
        filial:        getFilial(),
        dadospro_id:   dados.dadosproId,
        cod_prod:      dados.codProd,
        desc_pro:      dados.descPro,
        dias_min:      dados.diasMin,
        dias_max:      dados.diasMax,
        dias_lembrete: dados.diasLembrete,
      }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/estimativas');
    return {};
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

export async function atualizarRegra(
  id: number,
  dados: { diasMin: number; diasMax: number; diasLembrete: number },
): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/estimativas/regras', {
      method: 'PUT',
      body: JSON.stringify({
        id, filial: getFilial(),
        dias_min:      dados.diasMin,
        dias_max:      dados.diasMax,
        dias_lembrete: dados.diasLembrete,
      }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/estimativas');
    return {};
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

export async function excluirRegra(id: number): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/estimativas/regras', {
      method: 'DELETE',
      body: JSON.stringify({ id, filial: getFilial() }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/estimativas');
    return {};
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

// ─── Integração com a Agenda ─────────────────────────────────────────────────

/** Verifica quais produtos vendidos têm regra de estimativa cadastrada */
export async function verificarRegrasProdutos(
  dadosproIds: number[],
): Promise<RegraProduto[]> {
  if (dadosproIds.length === 0) return [];
  const res = await apiFetch<{ dados: RegraProduto[]; Count: number }>(
    `/api/petshop/estimativas/regras-por-produtos${qs({
      filial: getFilial(),
      ids:    dadosproIds.join(','),
    })}`,
  ).catch(() => ({ dados: [] as RegraProduto[], Count: 0 }));
  return res.dados ?? [];
}

/** Cria uma estimativa após a venda (regra legada: data_estimada = compra + dias × qtd) */
export async function criarEstimativa(dados: {
  clienteId:     number;
  clienteFilial: number;
  clienteNome:   string;
  animalId:      number;
  animalFilial:  number;
  animalNome:    string;
  dadosproId:    number;
  descPro:       string;
  qtd:           number;
  dataCompra:    string;   // yyyy-mm-dd
  dias:          number;   // prazo escolhido (mínimo ou máximo)
  orcaId:        number;
  orcaFilial:    number;
}): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/estimativas', {
      method: 'POST',
      body: JSON.stringify({
        filial:         getFilial(),
        cliente_id:     dados.clienteId,
        cliente_filial: dados.clienteFilial,
        cliente_nome:   dados.clienteNome,
        animal_id:      dados.animalId,
        animal_filial:  dados.animalFilial,
        animal_nome:    dados.animalNome,
        dadospro_id:    dados.dadosproId,
        desc_pro:       dados.descPro,
        qtd:            dados.qtd,
        data_compra:    dados.dataCompra,
        dias:           dados.dias,
        orca_id:        dados.orcaId,
        orca_filial:    dados.orcaFilial,
      }),
    });
    // CodStatus 2 = já existia (dedup) — não é erro
    if (res.CodStatus !== 1 && res.CodStatus !== 2) return { error: res.DescricaoStatus };
    return {};
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}
