'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';

export interface Vendedor {
  id:     number;
  filial: number;
  nome:   string;
}

export async function buscarVendedores(): Promise<Vendedor[]> {
  const res = await apiFetch<{ dados: Vendedor[] }>(
    `/api/petshop/vendedores${qs({ filial: getFilial() })}`,
  ).catch(() => ({ dados: [] }));
  return res.dados ?? [];
}
