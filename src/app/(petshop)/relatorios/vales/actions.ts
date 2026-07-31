'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

export interface Vale {
  id_vale:        number;
  filial:         number;
  data:           string; // YYYY-MM-DD
  hora:           string;
  total:          number;
  valor_util:     number;
  valor_saldo:    number;
  utilizado:      string; // N | P | S | C
  situacao:       string; // rótulo já traduzido pelo backend
  tipo:           string; // Vale | ContraVale | Vasilhame
  nro_nota:       number;
  cliente_id:     number;
  cliente_filial: number;
  cliente_nome:   string;
}

export type StatusVale = 'aberto' | 'usado' | 'cancelado' | 'todos';

export interface FiltrosVales {
  clienteId?:     number;
  clienteFilial?: number;
  busca?:         string;
  status?:        StatusVale;
  dataIni?:       string;
  dataAte?:       string;
}

/**
 * Consulta os vales (crédito/vale-troca) dos clientes — somente leitura,
 * equivalente à tela UDevolucao.pas do legado. Fonte: TBLVALE.
 */
export async function buscarVales(filtros: FiltrosVales): Promise<Vale[]> {
  const res = await apiFetch<{ dados: Vale[]; Count: number }>(
    `/api/petshop/relatorios/vales${qs({
      filial:         getFilial(),
      cliente_id:     filtros.clienteId     || undefined,
      cliente_filial: filtros.clienteFilial || undefined,
      busca:          filtros.busca         || undefined,
      status:         filtros.status        || undefined,
      data_ini:       filtros.dataIni       || undefined,
      data_fim:       filtros.dataAte       || undefined,
      limit:          200,
    })}`,
  ).catch(() => ({ dados: [] as Vale[], Count: 0 }));
  return res.dados ?? [];
}
