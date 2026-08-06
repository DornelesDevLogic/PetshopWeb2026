'use server';

import { apiFetch, qs } from '@/lib/api';
import { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';

/**
 * Acha o(s) cupom(ns) fiscal(is) mais provaveis de uma agenda ja vendida no
 * Frente de Caixa — equivalente ao F6 da Visualização Rápida do sistema
 * legado. Não há vínculo direto no banco entre a Agenda e o cupom (são
 * sistemas diferentes que só compartilham o banco), então o backend busca
 * por cliente + filial + janela de datas; pode vir mais de um candidato.
 */
export async function buscarCupomDaAgenda(id: number, filial: number): Promise<CupomEspelho[]> {
  const res = await apiFetch<{ dados: CupomEspelho[]; Count: number }>(
    `/api/petshop/agenda/cupom${qs({ id, filial })}`,
  ).catch(() => ({ dados: [] as CupomEspelho[], Count: 0 }));
  return res.dados ?? [];
}
