'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ApiWrite, ClienteResponse, AnimalResponse, Cliente, Animal } from '@/types/petshop';

/** Busca clientes por texto */
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

/** Cria nova consulta */
export async function createConsulta(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const animalId = Number(formData.get('animal_id') || 0);
  const vetId    = Number(formData.get('vet_id')    || 0);

  if (!animalId) return { error: 'Selecione um animal.' };
  if (!vetId)    return { error: 'Selecione um veterinário.' };

  const body = {
    filial:               FILIAL,
    agenda_id:            Number(formData.get('agenda_id')   || 0),
    agenda_filial:        FILIAL,
    animal_id:            animalId,
    animal_filial:        Number(formData.get('animal_filial') || FILIAL),
    animal_nome:          formData.get('animal_nome')       ?? '',
    proprietario_id:      Number(formData.get('cliente_id') || 0),
    proprietario_filial:  Number(formData.get('cliente_filial') || FILIAL),
    proprietario_nome:    formData.get('cliente_nome')      ?? '',
    vet_id:               vetId,
    vet_filial:           Number(formData.get('vet_filial')  || FILIAL),
    vet_nome:             formData.get('vet_nome')          ?? '',
    data:                 formData.get('data')              ?? '',
    motivo:               formData.get('motivo')            ?? '',
    peso:                 formData.get('peso')              ?? '',
    temperatura:          formData.get('temperatura')       ?? '',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/consultas', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/consultas');
  return { id: res.id as number };
}
