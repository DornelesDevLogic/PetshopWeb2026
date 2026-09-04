'use server';

import { apiFetch, qs } from '@/lib/api';
import type { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';

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

/** Busca um único cupom pelo número — usado pelo botão "Ver cupom" fora da
 * tela do Espelho de Cupons (ex: Histórico do Produto), onde só se tem o
 * número do documento e a data do movimento, não caixa/dígito. */
export async function buscarCupomPorNumero(
  numeroCupom: number,
  filial:      number,
  data:        string,
): Promise<CupomEspelho | null> {
  if (!numeroCupom) return null;
  const res = await apiFetch<{ dados: CupomEspelho[]; Count: number }>(
    `/api/petshop/relatorios/espelho-cupons${qs({
      filial, numero_cupom: numeroCupom, data_de: data, data_ate: data, situacao: 'todos',
    })}`,
  ).catch(() => ({ dados: [] as CupomEspelho[], Count: 0 }));
  return res.dados?.[0] ?? null;
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
