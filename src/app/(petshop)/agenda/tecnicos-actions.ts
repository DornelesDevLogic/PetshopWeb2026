'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite, ProfissionalResponse, Profissional } from '@/types/petshop';

/**
 * Gestão de "agenda aberta/fechada" por técnico.
 * Convenção (temporária, combinada com o usuário): usamos o campo TBLTECNICO.TEC_EMAIL
 * como flag — 'ON' = agenda aparece no grid, qualquer outro valor (ou 'OFF') = não aparece.
 * Reaproveita o endpoint existente PUT /api/petshop/profissionais (sem recompilar o backend).
 */

export interface TecnicoGerencia {
  id:           number;
  nome:         string;
  agendaAberta: boolean;   // TEC_EMAIL === 'ON'
  ativo:        boolean;   // STATUS_ATIVO <> 1
}

const EMPTY = { dados: [] as Profissional[], Count: 0, StartsAt: '', EndsAt: '' };

/** Lista TODOS os técnicos (ativos e inativos) para a tela de gerenciamento. */
export async function listarTecnicos(): Promise<TecnicoGerencia[]> {
  const res = await apiFetch<ProfissionalResponse>(
    `/api/petshop/profissionais${qs({ filial: getFilial(), limit: 999 })}`,
  ).catch(() => EMPTY);
  return res.dados
    .map((p) => ({
      id:           p.id,
      nome:         p.nome,
      agendaAberta: (p.email ?? '').trim().toUpperCase() === 'ON',
      ativo:        p.status_ativo !== 1,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Abre/fecha a agenda do técnico (grava 'ON'/'OFF' em TEC_EMAIL). */
export async function definirAgendaTecnico(id: number, aberta: boolean): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/profissionais', {
      method: 'PUT',
      body: JSON.stringify({ id, email: aberta ? 'ON' : 'OFF' }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath('/agenda');
  return {};
}

/** Ativa/inativa o técnico (STATUS_ATIVO: 0 = ativo, 1 = inativo). */
export async function ativarTecnico(id: number, ativo: boolean): Promise<{ error?: string }> {
  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/profissionais', {
      method: 'PUT',
      body: JSON.stringify({ id, status_ativo: ativo ? 0 : 1 }),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath('/agenda');
  return {};
}
