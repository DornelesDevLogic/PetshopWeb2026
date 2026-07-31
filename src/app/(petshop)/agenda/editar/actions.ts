'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, getFilial } from '@/lib/api';
import { agendaHub } from '@/lib/agenda-events';
import { ApiWrite } from '@/types/petshop';

interface EditarAgendaParams {
  id:             number;
  filial:         number;
  animal_id?:     number;
  animal_filial?: number;
  prof_id?:       number;
  prof_filial?:   number;
  prof_nome?:     string;
  servico_id?:    number;
  servico_filial?:number;
  servico_nome?:  string;
  vend_id?:       number;
  vend_filial?:   number;
  obs?:           string;
  peso?:          number;
}

export async function editarAgenda(
  params: EditarAgendaParams,
): Promise<{ error?: string }> {
  const body: Record<string, unknown> = {
    id:     params.id,
    filial: params.filial ?? getFilial(),
  };

  if (params.prof_id)       body.prof_id       = params.prof_id;
  if (params.prof_filial)   body.prof_filial    = params.prof_filial;
  if (params.prof_nome)     body.prof_nome      = params.prof_nome;
  if (params.servico_id)    body.servico_id     = params.servico_id;
  if (params.servico_filial)body.servico_filial = params.servico_filial;
  if (params.servico_nome)  body.servico_nome   = params.servico_nome;
  if (params.vend_id)       body.vend_id        = params.vend_id;
  if (params.vend_filial)   body.vend_filial    = params.vend_filial;
  if (params.obs !== undefined) body.obs         = params.obs;
  if (params.peso && params.peso > 0) {
    body.peso          = params.peso;
    body.animal_id     = params.animal_id;
    body.animal_filial = params.animal_filial;
  }

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda', {
      method: 'PUT',
      body:   JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
  revalidatePath('/agenda');
  agendaHub.publish({ tipo: 'AGENDA_ALTERADA', acao: 'UPDATE', idAgenda: params.id, filial: params.filial ?? getFilial() });
  return {};
}
