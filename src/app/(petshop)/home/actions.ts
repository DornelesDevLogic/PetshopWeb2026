'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

export interface ResumoHoje {
  agendas:       number;
  prevendas:     number;
  tele_entregas: number;
  cupons: {
    qtd:         number;
    faturamento: number;
  };
}

export interface ProdutoAltoGiro {
  cod_pro:   string;
  descricao: string;
  qtd:       number;
}

export interface ProdutoEstoqueBaixo {
  cod_pro:        string;
  descricao:      string;
  estoque:        number;
  qtd_hoje:       number;
  media_diaria:   number;   // média de venda diária dos últimos 14 dias
  dias_cobertura: number;   // estoque atual / média diária — quanto menor, mais crítico
}

// Cada bloco da Home é buscado numa chamada própria (em vez de um único
// endpoint agregado) para que a tela renderize instantaneamente e cada
// seção apareça assim que sua consulta terminar (streaming via Suspense),
// em vez de tudo esperar a consulta mais pesada (alto giro).

export async function carregarResumoHoje(): Promise<ResumoHoje | null> {
  try {
    return await apiFetch<ResumoHoje>(
      `/api/petshop/dashboard/home/hoje${qs({ filial: getFilial() })}`,
    );
  } catch {
    return null;
  }
}

export async function carregarAltoGiro(): Promise<ProdutoAltoGiro[] | null> {
  try {
    const res = await apiFetch<{ dados: ProdutoAltoGiro[] }>(
      `/api/petshop/dashboard/home/alto-giro${qs({ filial: getFilial() })}`,
    );
    return res.dados ?? [];
  } catch {
    return null;
  }
}

export async function carregarEstoqueBaixo(): Promise<ProdutoEstoqueBaixo[] | null> {
  try {
    const res = await apiFetch<{ dados: ProdutoEstoqueBaixo[] }>(
      `/api/petshop/dashboard/home/estoque-baixo${qs({ filial: getFilial() })}`,
    );
    return res.dados ?? [];
  } catch {
    return null;
  }
}
