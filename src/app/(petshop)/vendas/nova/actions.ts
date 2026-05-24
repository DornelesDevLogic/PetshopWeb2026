'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ApiWrite, ClienteResponse, Cliente } from '@/types/petshop';

/** Busca clientes por texto */
export async function buscarClientes(q: string): Promise<Cliente[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ClienteResponse>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: FILIAL })}`,
  ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados.slice(0, 10);
}

/** Cria nova pré-venda */
export async function createPrevenda(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const clienteId = Number(formData.get('cliente_id') || 0);
  if (!clienteId) return { error: 'Selecione um cliente.' };

  const body = {
    filial:          FILIAL,
    cliente_id:      clienteId,
    cliente_filial:  Number(formData.get('cliente_filial') || FILIAL),
    cliente:         formData.get('cliente_nome') ?? '',
    hora:            '',
    valor:           0,
    sub_total:       0,
    val_produtos:    0,
    val_acresc:      0,
    desconto:        0,
    valor_frete:     0,
    formapgto:       formData.get('formapgto') ?? '',
    condpgto:        '',
    frete:           '',
    pz_entrega:      '',
    dados:           formData.get('obs') ?? '',
    animal:          '',
    profissional:    '',
    data_entrega:    '',
    hora_entrega:    '',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/prevendas', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/vendas');
  return { id: res.id as number };
}
