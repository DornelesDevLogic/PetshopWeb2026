'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { isSupervisor } from '@/lib/session';
import { ApiWrite } from '@/types/petshop';

/** Valores das 4 tabelas de configuração, chaveados por coluna (lowercase). */
export interface ConfiguracoesData {
  config:     Record<string, string>;
  pet_config: Record<string, string>;
  confmail:   Record<string, string>;
  anamnese:   Record<string, string>;
}

export async function buscarConfiguracoes(): Promise<ConfiguracoesData | null> {
  if (!isSupervisor()) return null;
  try {
    const res = await apiFetch<ConfiguracoesData & { CodStatus: number }>(
      '/api/petshop/configuracoes',
    );
    return {
      config:     res.config     ?? {},
      pet_config: res.pet_config ?? {},
      confmail:   res.confmail   ?? {},
      anamnese:   res.anamnese   ?? {},
    };
  } catch {
    return null;
  }
}

/** Grava apenas os campos alterados. Restrito a Supervisor (SENHA.TIPO='S'). */
export async function salvarConfiguracoes(
  alteracoes: Partial<ConfiguracoesData>,
): Promise<{ error?: string; alterados?: number }> {
  // Validação server-side: mesmo que a UI esteja escondida, a action recusa
  if (!isSupervisor()) {
    return { error: 'Acesso negado: apenas usuários Supervisor podem alterar configurações.' };
  }
  try {
    const res = await apiFetch<ApiWrite & { campos_alterados?: number }>(
      '/api/petshop/configuracoes',
      { method: 'PUT', body: JSON.stringify(alteracoes) },
    );
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/configuracoes');
    return { alterados: res.campos_alterados ?? 0 };
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}
