'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite, AnexoExame, AnexoExameResponse } from '@/types/petshop';

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

/** Atualiza dados clínicos + anamnese completa da consulta */
export async function updateConsulta(
  id: number,
  data: Record<string, string | number | undefined>,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/consultas', {
      method: 'PUT',
      body: JSON.stringify({ id, filial: getFilial(), ...data }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${id}`);
  return {};
}

/** Fecha a consulta (status → FECHADO) */
export async function fecharConsulta(id: number): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/consultas/fechar', { id, filial: getFilial() });
  if (!r.error) { revalidatePath(`/consultas/${id}`); revalidatePath('/consultas'); }
  return r;
}

/** Reabre a consulta (status → ABERTO) */
export async function reabrirConsulta(id: number): Promise<{ error?: string }> {
  const r = await postAction('/api/petshop/consultas/reabrir', { id, filial: getFilial() });
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
    consulta_filial: getFilial(),
    animal_id:       animalId,
    cliente_id:      clienteId,
    animal_nome:     animalNome,
    cliente_nome:    clienteNome,
    vet_id:          vetId,
    filial:          getFilial(),
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
      body: JSON.stringify({ id: prontuarioId, filial: getFilial() }),
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
    consulta_filial: getFilial(),
    animal_id:       animalId,
    filial:          getFilial(),
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
      body: JSON.stringify({ id: exameId, filial: getFilial() }),
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
    animal_filial:getFilial(),
    animal_nome:  animalNome,
    vacina_id:    vacinaId,
    vacina_nome:  vacinaNome,
    vet_id:       vetId,
    vet_nome:     vetNome,
    data:         formData.get('data')         ?? '',
    data_marcada: formData.get('data_marcada') ?? '',
    laboratorio:  formData.get('laboratorio')  ?? '',
    obs:          formData.get('obs')          ?? '',
    filial:       getFilial(),
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
      body: JSON.stringify({ id: vacinaId, filial: getFilial() }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}

// ─── Anexos de exames (PDF / imagem / documento) ──────────────────────────────

/** Lista os anexos de exame de uma consulta (metadados, sem o arquivo) */
export async function listarAnexos(consultaId: number): Promise<AnexoExame[]> {
  const res = await apiFetch<AnexoExameResponse>(
    `/api/petshop/exames/anexos${qs({ consulta_id: consultaId, filial: getFilial() })}`,
  ).catch(() => ({ dados: [] as AnexoExame[], Count: 0 }));
  return res.dados ?? [];
}

/** Faz upload de um anexo de exame (arquivo já convertido em base64) */
export async function uploadAnexo(
  consultaId: number,
  nome:       string,
  tipo:       string,   // extensão: .pdf, .jpg...
  arquivoBase64: string,
  obs = '',
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/exames/anexos', {
      method: 'POST',
      body: JSON.stringify({
        consulta_id:    consultaId,
        filial:         getFilial(),
        nome,
        tipo_arquivo:   tipo,
        arquivo_base64: arquivoBase64,
        obs,
      }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}

/** Remove um anexo de exame */
export async function deleteAnexo(
  consultaId: number,
  anexoId: number,
): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/exames/anexos', {
      method: 'DELETE',
      body: JSON.stringify({ id: anexoId, filial: getFilial() }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath(`/consultas/${consultaId}`);
  return {};
}
