'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

async function postAction(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  return {};
}

/** Fecha a consulta (status → FECHADO) */
export async function fecharConsulta(id: number): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/consultas/fechar', { id, filial: FILIAL });
  if (!r.error) { revalidatePath(`/consultas/${id}`); revalidatePath('/consultas'); }
  return r;
}

/** Reabre a consulta (status → ABERTO) */
export async function reabrirConsulta(id: number): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/consultas/reabrir', { id, filial: FILIAL });
  if (!r.error) { revalidatePath(`/consultas/${id}`); revalidatePath('/consultas'); }
  return r;
}

/** Adiciona entrada de prontuário */
export async function addProntuario(
  consultaId: number,
  animalId: number,
  clienteId: number,
  animalNome: string,
  clienteNome: string,
  vetId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const body = {
    consulta_id:     consultaId,
    consulta_filial: FILIAL,
    animal_id:       animalId,
    cliente_id:      clienteId,
    animal_nome:     animalNome,
    cliente_nome:    clienteNome,
    vet_id:          vetId,
    filial:          FILIAL,
    data:            formData.get('data')     ?? '',
    hora:            formData.get('hora')     ?? '',
    box:             formData.get('box')      ?? '',
    obs:             formData.get('obs')      ?? '',
    medicacao:       formData.get('medicacao')?? '',
    dose:            formData.get('dose')     ?? '',
    dadospro_id:     0,
  };
  const r = await postAction('/api/petshop/prontuarios', body);
  if (!r.error) revalidatePath(`/consultas/${consultaId}`);
  return r;
}

/** Remove entrada de prontuário */
export async function deleteProntuario(
  consultaId: number,
  prontuarioId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/prontuarios', {
      method: 'DELETE',
      body: JSON.stringify({ id: prontuarioId, filial: FILIAL }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}

/** Adiciona exame solicitado */
export async function addExame(
  consultaId: number,
  animalId: number,
  tipoExame: string,
): Promise<{ error?: string }> {
  if (!tipoExame.trim()) return { error: 'Tipo de exame é obrigatório.' };
  const body = {
    consulta_id:     consultaId,
    consulta_filial: FILIAL,
    animal_id:       animalId,
    filial:          FILIAL,
    tipo_exame:      tipoExame.trim(),
  };
  const r = await postAction('/api/petshop/exames', body);
  if (!r.error) revalidatePath(`/consultas/${consultaId}`);
  return r;
}

/** Remove exame */
export async function deleteExame(
  consultaId: number,
  exameId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/exames', {
      method: 'DELETE',
      body: JSON.stringify({ id: exameId, filial: FILIAL }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}

/** Registra vacina para o animal */
export async function addVacina(
  consultaId: number,
  animalId: number,
  animalNome: string,
  vetId: number,
  vetNome: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const vacinaId = Number(formData.get('vacina_id') || 0);
  const vacinaNome = (formData.get('vacina_nome') as string) ?? '';
  if (!vacinaNome.trim()) return { error: 'Nome da vacina é obrigatório.' };

  const body = {
    animal_id:    animalId,
    animal_filial:FILIAL,
    animal_nome:  animalNome,
    vacina_id:    vacinaId,
    vacina_nome:  vacinaNome,
    vet_id:       vetId,
    vet_nome:     vetNome,
    data:         formData.get('data')         ?? '',
    data_marcada: formData.get('data_marcada') ?? '',
    laboratorio:  formData.get('laboratorio')  ?? '',
    obs:          formData.get('obs')          ?? '',
    filial:       FILIAL,
  };
  const r = await postAction('/api/petshop/animais/vacinas-aplicadas', body);
  if (!r.error) revalidatePath(`/consultas/${consultaId}`);
  return r;
}

/** Remove vacina */
export async function deleteVacina(
  consultaId: number,
  vacinaId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais/vacinas-aplicadas', {
      method: 'DELETE',
      body: JSON.stringify({ id: vacinaId, filial: FILIAL }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}
