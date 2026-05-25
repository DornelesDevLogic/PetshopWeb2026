'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

export async function baixarConta(
  nroDoc: number,
  parcela: number,
  valorPago: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/financeiro/contas-receber/baixar', {
      method: 'POST',
      body: JSON.stringify({
        nro_doc:    nroDoc,
        parcela,
        filial:     FILIAL,
        valor_pago: valorPago,
      }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/financeiro');
  return {};
}
