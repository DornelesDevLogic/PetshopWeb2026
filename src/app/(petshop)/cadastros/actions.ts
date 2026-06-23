'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, FILIAL } from '@/lib/api';
import { ApiWrite, ServicoResponse } from '@/types/petshop';
import { corServicoCss } from '@/lib/cores';

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

/** Valida se já existe outro serviço com a mesma descrição ou mesma cor */
async function validarServicoDuplicado(
  descricao: string,
  cor: string,
  ignorarId?: number,
): Promise<string | null> {
  const res = await apiFetch<ServicoResponse>(
    `/api/petshop/servicos?filial=${FILIAL}&limit=500`,
  ).catch(() => null);
  const descNorm = descricao.trim().toUpperCase();
  const corNorm  = corServicoCss(cor); // normaliza hex/TColor para comparar
  for (const s of res?.dados ?? []) {
    if (ignorarId && s.id === ignorarId) continue;
    if (descNorm && s.descricao.trim().toUpperCase() === descNorm)
      return `Já existe um serviço com a descrição "${s.descricao}".`;
    if (corNorm && corServicoCss(s.cor_status) === corNorm)
      return `A cor escolhida já está em uso pelo serviço "${s.descricao}". Escolha outra cor.`;
  }
  return null;
}

export async function createServico(_prev: unknown, fd: FormData): Promise<{ error?: string }> {
  const descricao = String(fd.get('descricao') ?? '').trim();
  const duracao   = String(fd.get('duracao') ?? '').trim();
  const cor       = String(fd.get('cor_status') ?? '').trim();

  const dup = await validarServicoDuplicado(descricao, cor);
  if (dup) return { error: dup };

  // Campos vazios são OMITIDOS: o Delphi não converte "" para TIME/numérico
  const body: Record<string, unknown> = { descricao };
  if (duracao) body.duracao    = duracao;
  if (cor)     body.cor_status = cor;

  const r = await post('/api/petshop/servicos', body);
  if (!r.error) revalidatePath('/cadastros');
  return r;
}

export async function updateServico(id: number, fd: FormData): Promise<{ error?: string }> {
  const descricao = String(fd.get('descricao') ?? '').trim();
  const duracao   = String(fd.get('duracao') ?? '').trim();
  const cor       = String(fd.get('cor_status') ?? '').trim();

  const dup = await validarServicoDuplicado(descricao, cor, id);
  if (dup) return { error: dup };

  // Campos vazios são OMITIDOS: o backend usa COALESCE e mantém o valor atual
  const body: Record<string, unknown> = { id, filial: FILIAL };
  if (descricao) body.descricao  = descricao;
  if (duracao)   body.duracao    = duracao;
  if (cor)       body.cor_status = cor;

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/servicos', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath('/cadastros');
  revalidatePath('/agenda');
  return {};
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
