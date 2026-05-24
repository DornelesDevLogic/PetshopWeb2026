'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ApiWrite, ClienteResponse, AnimalResponse, Cliente, Animal } from '@/types/petshop';

/** Busca clientes por texto (nome, CPF, telefone) */
export async function buscarClientes(q: string): Promise<Cliente[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ClienteResponse>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: FILIAL })}`,
  ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados.slice(0, 10);
}

/** Carrega animais de um cliente */
export async function buscarAnimais(clienteId: number): Promise<Animal[]> {
  if (!clienteId) return [];
  const res = await apiFetch<AnimalResponse>(
    `/api/petshop/animais?filial=${FILIAL}&limit=50&filter1=a.PET_FK_ID_CLIENTE=${clienteId}`,
  ).catch(() => ({ dados: [] as Animal[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados;
}

/** Cria um novo agendamento */
export async function createAgenda(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const clienteId = Number(formData.get('cliente_id') || 0);
  const data      = (formData.get('data') as string | null) ?? '';

  if (!clienteId) return { error: 'Selecione um cliente.' };
  if (!data)      return { error: 'Data é obrigatória.' };

  const valor    = parseFloat((formData.get('valor')    as string || '0').replace(',', '.')) || 0;
  const desconto = parseFloat((formData.get('desconto') as string || '0').replace(',', '.')) || 0;

  const body = {
    filial:           FILIAL,
    cliente_id:       clienteId,
    cliente_filial:   Number(formData.get('cliente_filial') || FILIAL),
    cliente_nome:     formData.get('cliente_nome')   ?? '',
    data,
    hora:             formData.get('hora')           ?? '',
    animal_id:        Number(formData.get('animal_id')    || 0),
    animal_filial:    Number(formData.get('animal_filial') || FILIAL),
    animal_nome:      formData.get('animal_nome')    ?? '',
    raca:             formData.get('raca')           ?? '',
    prof_id:          Number(formData.get('prof_id')      || 0),
    prof_filial:      Number(formData.get('prof_filial')   || FILIAL),
    prof_nome:        formData.get('prof_nome')      ?? '',
    servico_id:       Number(formData.get('servico_id')    || 0),
    servico_filial:   Number(formData.get('servico_filial') || FILIAL),
    servico_nome:     formData.get('servico_nome')   ?? '',
    valor,
    desconto,
    obs:              formData.get('obs')            ?? '',
    tipo_ocorrencia:  1,
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/agenda');
  return { id: res.id as number };
}
