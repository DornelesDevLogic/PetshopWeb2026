'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

// ── Tipos do Dashboard Executivo ────────────────────────────────────────────
export interface KpiPeriodo {
  faturamento:  number;
  qtd_vendas:   number;
  qtd_clientes: number;
  ticket_medio: number;
}

export interface PontoSerie {
  dia:   string;   // YYYY-MM-DD
  total: number;
  qtd:   number;
}

export interface CupomResumo {
  total:       number;
  faturamento: number;
}

export interface AgendaPorTipo {
  tipo_servico: string;
  qtd:          number;
}

export interface AgendaResumo {
  total:    number;
  por_tipo: AgendaPorTipo[];
}

export interface ContagemSimples {
  total: number;
}

export interface ProdutoRanking {
  cod_pro:   string;
  descricao: string;
  qtd:       number;
  total:     number;
}

export interface DashboardExecutivo {
  periodo:                KpiPeriodo;
  periodo_anterior:       KpiPeriodo;
  serie:                  PontoSerie[];
  cupons:                 CupomResumo;
  agendas:                AgendaResumo;
  tele_entregas:          ContagemSimples;
  prevendas:              ContagemSimples;
  produtos_mais_vendidos: ProdutoRanking[];
}

/**
 * Carrega o Dashboard Executivo (KPIs + comparativo + série diária).
 * Fonte: endpoint agregado /api/petshop/dashboard/executivo (GROUP BY no Firebird).
 * Retorna null se o backend ainda não expõe o endpoint (ex.: antes de recompilar).
 */
export async function carregarDashboardExecutivo(
  dataIni: string,
  dataFim: string,
): Promise<DashboardExecutivo | null> {
  try {
    return await apiFetch<DashboardExecutivo>(
      `/api/petshop/dashboard/executivo${qs({
        filial:   getFilial(),
        data_ini: dataIni,
        data_fim: dataFim,
      })}`,
    );
  } catch {
    // Endpoint indisponível (backend não recompilado) ou erro de conexão
    return null;
  }
}
