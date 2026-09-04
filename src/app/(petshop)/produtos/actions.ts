'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import type {
  HistoricoProdutoMovResponse,
  HistoricoProdutoMovItem,
  HistoricoProdutoGiroResponse,
} from '@/types/petshop';

export interface FiltrosHistoricoMov {
  idPro:      number;
  codFilial:  number;
  filial?:    number;   // 0/undefined = todas as filiais
  tipo?:      'T' | 'S' | 'E';
  dataDe?:    string;    // yyyy-mm-dd
  dataAte?:   string;
  semTransf?: boolean;
}

export async function buscarHistoricoProdutoMovimentacao(
  f: FiltrosHistoricoMov,
): Promise<{ dados: HistoricoProdutoMovItem[]; Count: number }> {
  const res = await apiFetch<HistoricoProdutoMovResponse>(
    `/api/petshop/produtos/historico-movimentacao${qs({
      id_pro:     f.idPro,
      cod_filial: f.codFilial,
      filial:     f.filial ?? getFilial(),
      tipo:       f.tipo || undefined,
      data_de:    f.dataDe || undefined,
      data_ate:   f.dataAte || undefined,
      sem_transf: f.semTransf ? 1 : undefined,
    })}`,
  ).catch(() => ({ dados: [] as HistoricoProdutoMovItem[], Count: 0 }));
  return { dados: res.dados ?? [], Count: res.Count ?? 0 };
}

export interface FiltrosHistoricoGiro {
  idPro:             number;
  codFilial:         number;
  filial?:           number;
  dataDe?:           string;
  dataAte?:          string;
  diasEstatistica?:  number;
  prazoEntrega?:     number;
  periodoCobertura?: number;
}

export async function buscarHistoricoProdutoGiro(
  f: FiltrosHistoricoGiro,
): Promise<HistoricoProdutoGiroResponse | null> {
  return apiFetch<HistoricoProdutoGiroResponse>(
    `/api/petshop/produtos/historico-giro${qs({
      id_pro:            f.idPro,
      cod_filial:        f.codFilial,
      filial:            f.filial ?? getFilial(),
      data_de:           f.dataDe || undefined,
      data_ate:          f.dataAte || undefined,
      dias_estatistica:  f.diasEstatistica || undefined,
      prazo_entrega:     f.prazoEntrega || undefined,
      periodo_cobertura: f.periodoCobertura || undefined,
    })}`,
  ).catch(() => null);
}
