'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

/**
 * Atualiza o status de um agendamento.
 * status aceito pelo backend: AGENDADO | CONFIRMADO | CHEGOU |
 *                             EM_ATENDIMENTO | FINALIZADO | CANCELADO | FALTA
 */
export async function atualizarStatus(
  id:      number,
  status:  string,
  obs?:    string,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda/status', {
      method: 'POST',
      body: JSON.stringify({ id, filial: FILIAL, status, obs: obs ?? '' }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/agenda/${id}`);
  revalidatePath('/agenda');
  return {};
}
