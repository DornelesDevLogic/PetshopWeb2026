'use server';

import { apiFetch, qs } from '@/lib/api';

export interface ItemCupomEspelho {
  cod_pro:   string;
  descricao: string;
  unidade:   string;
  qtd:       number;
  preco:     number;
  total:     number;
  cancelado: boolean;
}

export interface PagamentoCupom {
  descricao:      string;
  valor:          number;
  bruto:          number;
  saida:          number;
  descricao_ecf:  string;
  troco:          number;
  taxa:           number;
}

/** Itens (produtos) de um cupom específico — drill-down do Espelho de Cupons */
export async function buscarItensCupom(
  numeroCupom: number,
  filial:      number,
  data:        string,
): Promise<ItemCupomEspelho[]> {
  const res = await apiFetch<{ dados: ItemCupomEspelho[]; Count: number }>(
    `/api/petshop/relatorios/espelho-cupons/itens${qs({ numero_cupom: numeroCupom, filial, data })}`,
  ).catch(() => ({ dados: [] as ItemCupomEspelho[], Count: 0 }));
  return res.dados ?? [];
}

/** Formas de pagamento de um cupom específico — para a visualização do cupom e o relatório sintético */
export async function buscarPagamentosCupom(
  numeroCupom: number,
  filial:      number,
  caixa:       string | number,
  digito:      number,
): Promise<PagamentoCupom[]> {
  const res = await apiFetch<{ dados: PagamentoCupom[]; Count: number }>(
    `/api/petshop/relatorios/espelho-cupons/pagamentos${qs({ numero_cupom: numeroCupom, filial, caixa, digito })}`,
  ).catch(() => ({ dados: [] as PagamentoCupom[], Count: 0 }));
  return res.dados ?? [];
}
