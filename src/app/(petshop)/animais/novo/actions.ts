'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ApiWrite, Cliente, ClienteResponse } from '@/types/petshop';

export async function buscarClientes(q: string): Promise<Cliente[]> {
  if (!q.trim()) return [];
  try {
    const res = await apiFetch<ClienteResponse>(
      `/api/petshop/clientes/busca-rapida${qs({ filial: FILIAL, q })}`,
    );
    return res.dados ?? [];
  } catch {
    return [];
  }
}

export async function createAnimal(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const nome = (formData.get('nome') as string | null)?.trim() ?? '';
  if (!nome) return { error: 'Nome é obrigatório.' };

  const clienteId    = Number(formData.get('cliente_id')    || 0);
  const filialCliente = Number(formData.get('filial_cliente') || FILIAL);
  if (!clienteId) return { error: 'Selecione um cliente.' };

  const body = {
    filial:          FILIAL,
    id_cliente:      clienteId,
    filial_cliente:  filialCliente,
    nome,
    apelido:         formData.get('apelido')         ?? '',
    sexo:            formData.get('sexo')            ?? '',
    castrado:        formData.get('castrado') === '1' ? 1 : 0,
    data_nascimento: formData.get('data_nascimento') ?? '',
    peso:            formData.get('peso')            ?? '',
    cor:             formData.get('cor')             ?? '',
    tipo_animal:     formData.get('tipo_animal')     ?? '',
    id_especie:      Number(formData.get('id_especie')  || 0),
    especie:         formData.get('especie_nome')    ?? '',
    id_raca:         Number(formData.get('id_raca')     || 0),
    raca:            formData.get('raca_nome')        ?? '',
    id_pelo:         Number(formData.get('id_pelo')     || 0),
    pelo:            formData.get('pelo_nome')        ?? '',
    obs:             formData.get('obs')             ?? '',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/animais');
  revalidatePath(`/clientes/${clienteId}`);
  return { id: res.id as number | undefined };
}
