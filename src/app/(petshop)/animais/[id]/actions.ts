'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, getFilial } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';
import { invalidarFotoCache } from '@/lib/fotoCache';

export async function uploadFoto(
  animalId: number,
  _clienteId: number,
  fotoBase64: string,
): Promise<{ error?: string }> {
  let res: Record<string, unknown>;
  try {
    res = await apiFetch<Record<string, unknown>>('/api/petshop/animais/foto', {
      method: 'POST',
      body: JSON.stringify({ animal_id: animalId, filial: getFilial(), foto_base64: fotoBase64 }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[uploadFoto]', msg);
    return { error: msg };
  }

  // Backend retorna {"ok":true} ou {"CodStatus":1,...}
  if (res['ok'] !== true && res['CodStatus'] !== 1) {
    return { error: (res['DescricaoStatus'] as string | undefined) ?? (res['erro'] as string | undefined) ?? 'Erro ao salvar foto.' };
  }

  // Sem isso, a rota GET da foto continua servindo do cache em memória
  // (até 2h) o resultado "sem foto" de antes do upload — o pet parece não
  // ter salvo a foto mesmo o backend tendo aceitado.
  invalidarFotoCache(animalId, getFilial());
  revalidatePath(`/animais/${animalId}`);
  return {};
}

export async function deleteFoto(
  animalId: number,
  _clienteId: number,
): Promise<{ error?: string }> {
  let res: Record<string, unknown>;
  try {
    res = await apiFetch<Record<string, unknown>>('/api/petshop/animais/foto', {
      method: 'DELETE',
      body: JSON.stringify({ animal_id: animalId, filial: getFilial() }),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[deleteFoto]', msg);
    return { error: msg };
  }

  if (res['ok'] !== true && res['CodStatus'] !== 1) {
    return { error: (res['DescricaoStatus'] as string | undefined) ?? (res['erro'] as string | undefined) ?? 'Erro ao remover foto.' };
  }

  invalidarFotoCache(animalId, getFilial());
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
    filial:          getFilial(),
    nome,
    apelido:         formData.get('apelido')         ?? '',
    sexo:            formData.get('sexo')            ?? '',
    castrado:        formData.get('castrado') === '1' ? 1 : 0,
    data_nascimento: formData.get('data_nascimento') ?? '',
    peso:            formData.get('peso')            ?? '',
    cor:             formData.get('cor')             ?? '',
    tipo_animal:     formData.get('tipo_animal')     ?? '',
    id_especie:      Number(formData.get('id_especie')  || 0),
    especie:         formData.get('especie')         ?? '',
    id_raca:         Number(formData.get('id_raca')     || 0),
    raca:            formData.get('raca')            ?? '',
    id_pelo:         Number(formData.get('id_pelo')     || 0),
    pelo:            formData.get('pelo')            ?? '',
    controla_racao:  Number(formData.get('controla_racao') || 0),
    obs:             formData.get('obs')             ?? '',
    obito:           Number(formData.get('obito')    || 0),
    ativo:           Number(formData.get('ativo')    || 0),
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
      body: JSON.stringify({ id: animalId, filial: getFilial() }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/animais');
  revalidatePath(`/clientes/${clienteId}`);
  return {};
}
