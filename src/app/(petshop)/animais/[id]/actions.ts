'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

export async function uploadFoto(
  animalId: number,
  _clienteId: number,
  fotoBase64: string,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais/foto', {
      method: 'POST',
      body: JSON.stringify({ animal_id: animalId, filial: FILIAL, foto_base64: fotoBase64 }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/animais/${animalId}`);
  return {};
}

export async function deleteFoto(
  animalId: number,
  _clienteId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais/foto', {
      method: 'DELETE',
      body: JSON.stringify({ animal_id: animalId, filial: FILIAL }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/animais/${animalId}`);
  return {};
}

export async function updateAnimal(
  animalId: number,
  clienteId: number,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const nome = (formData.get('nome') as string | null)?.trim() ?? '';
  if (!nome) return { error: 'Nome é obrigatório.' };

  const body = {
    id:              animalId,
    filial:          FILIAL,
    nome,
    apelido:         formData.get('apelido')         ?? '',
    sexo:            formData.get('sexo')            ?? '',
    castrado:        formData.get('castrado') === '1' ? 1 : 0,
    data_nascimento: formData.get('data_nascimento') ?? '',
    peso:            formData.get('peso')            ?? '',
    cor:             formData.get('cor')             ?? '',
    id_especie:      Number(formData.get('id_especie')  || 0),
    id_raca:         Number(formData.get('id_raca')     || 0),
    id_pelo:         Number(formData.get('id_pelo')     || 0),
    obs:             formData.get('obs')             ?? '',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath(`/animais/${animalId}`);
  revalidatePath(`/clientes/${clienteId}`);
  return {};
}

export async function deactivateAnimal(
  animalId: number,
  clienteId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais', {
      method: 'DELETE',
      body: JSON.stringify({ id: animalId, filial: FILIAL }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/animais');
  revalidatePath(`/clientes/${clienteId}`);
  return {};
}
