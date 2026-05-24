'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite } from '@/types/petshop';

async function post(endpoint: string, body: Record<string, unknown>): Promise<{ error?: string; id?: number }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>(endpoint, { method: 'POST', body: JSON.stringify({ filial: FILIAL, ...body }) });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  return { id: res.id as number | undefined };
}

async function del(endpoint: string, id: number): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>(endpoint, { method: 'DELETE', body: JSON.stringify({ id, filial: FILIAL }) });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  return {};
}

// ── Serviços ──────────────────────────────────────────────────────────────
export async function createServico(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/servicos', {
    descricao:  fd.get('descricao') ?? '',
    duracao:    fd.get('duracao')   ?? '',
    cor_status: fd.get('cor_status')?? '',
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function deleteServico(id: number): Promise<{ error?: string }> {
  const r = await del('/api/petshop/servicos', id);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Profissionais ─────────────────────────────────────────────────────────
export async function createProfissional(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/profissionais', {
    nome:    fd.get('nome')    ?? '',
    cpf:     fd.get('cpf')     ?? '',
    celular: fd.get('celular') ?? '',
    email:   fd.get('email')   ?? '',
    crmv:    fd.get('crmv')    ?? '',
    tipo_profissional: Number(fd.get('tipo_profissional') || 0),
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Espécies ──────────────────────────────────────────────────────────────
export async function createEspecie(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/especies', { descricao: fd.get('descricao') ?? '' });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function deleteEspecie(id: number): Promise<{ error?: string }> {
  const r = await del('/api/petshop/especies', id);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Raças ─────────────────────────────────────────────────────────────────
export async function createRaca(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/racas', {
    descricao:  fd.get('descricao')  ?? '',
    id_especie: Number(fd.get('id_especie') || 0),
    porte:      fd.get('porte')       ?? '',
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function deleteRaca(id: number): Promise<{ error?: string }> {
  const r = await del('/api/petshop/racas', id);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Tipos de Pelo ─────────────────────────────────────────────────────────
export async function createTipoPelo(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/tipos-pelo', {
    descricao:  fd.get('descricao')  ?? '',
    id_especie: Number(fd.get('id_especie') || 0),
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function deleteTipoPelo(id: number): Promise<{ error?: string }> {
  const r = await del('/api/petshop/tipos-pelo', id);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Vacinas (catálogo) ────────────────────────────────────────────────────
export async function createVacinaCatalogo(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/vacinas', {
    descricao:  fd.get('descricao')  ?? '',
    id_especie: Number(fd.get('id_especie') || 0),
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function deleteVacinaCatalogo(id: number): Promise<{ error?: string }> {
  const r = await del('/api/petshop/vacinas', id);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

// ── Medicamentos ──────────────────────────────────────────────────────────
export async function createMedicamento(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const r = await post('/api/petshop/medicamentos', {
    medicamento: fd.get('medicamento') ?? '',
    laboratorio: fd.get('laboratorio') ?? '',
    aplicacao:   fd.get('aplicacao')   ?? '',
  });
  if (!r.error) revalidatePath('/cadastros');
  return r;
}
