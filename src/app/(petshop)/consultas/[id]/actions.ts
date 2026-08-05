'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite, AnexoExame, AnexoExameResponse, ServicoResponse } from '@/types/petshop';

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

/**
 * Consulta "tradicional" (aberta direto, sem vir de uma Agenda) não tem onde
 * lançar produtos — não existe ORCA/PRODORCA vinculado. Ao clicar em
 * "Adicionar Produto" pela primeira vez, cria uma Agenda por trás (com os
 * mesmos dados de cliente/animal/veterinário já preenchidos na consulta) e
 * vincula via FK_ID_AGENDA/FK_FL_AGENDA — a partir daí a consulta passa a
 * lançar itens nessa agenda, igual ao fluxo que já vem de um agendamento.
 */
export async function criarAgendaParaConsulta(dados: {
  consultaId:      number;
  filial:          number;
  animalId:        number;
  animalNome:      string;
  proprietarioId:  number;
  proprietarioNome:string;
  veterinarioId:   number;
  veterinarioNome: string;
  data:            string; // yyyy-mm-dd
}): Promise<{ error?: string; agendaId?: number }> {
  const filial = dados.filial || getFilial();

  // Serviço padrão pra essa agenda "de bastidores": tenta achar um cadastrado
  // como "CONSULTA"; se não existir, usa o primeiro serviço disponível.
  let servicoId = 0;
  let servicoNome = 'CONSULTA';
  try {
    const resServ = await apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial, limit: 200 })}`,
    );
    const lista = resServ.dados ?? [];
    const consultaServ = lista.find((s) => s.descricao?.toUpperCase().includes('CONSULTA'));
    const escolhido = consultaServ ?? lista[0];
    if (escolhido) { servicoId = escolhido.id; servicoNome = escolhido.descricao; }
  } catch {
    // segue com servicoId=0 — a agenda ainda é criada, só sem serviço definido
  }

  let agendaId: number;
  try {
    const resAgenda = await apiFetch<ApiWrite>('/api/petshop/agenda', {
      method: 'POST',
      body: JSON.stringify({
        filial,
        cliente_id:     dados.proprietarioId,
        cliente_filial: filial,
        cliente_nome:   dados.proprietarioNome,
        data:           dados.data,
        hora:           new Date().toTimeString().slice(0, 8),
        animal_id:      dados.animalId,
        animal_filial:  filial,
        animal_nome:    dados.animalNome,
        raca:           '',
        prof_id:        dados.veterinarioId,
        prof_filial:    filial,
        prof_nome:      dados.veterinarioNome,
        servico_id:     servicoId || undefined,
        servico_filial: servicoId ? filial : undefined,
        servico_nome:   servicoNome,
        valor:          0,
        desconto:       0,
        obs:            'Agenda criada a partir do atendimento da consulta',
        tipo_ocorrencia: 1,
      }),
    });
    if (resAgenda.CodStatus !== 1 || !resAgenda.id) {
      return { error: resAgenda.DescricaoStatus || 'Não foi possível criar a agenda.' };
    }
    agendaId = resAgenda.id as number;
  } catch {
    return { error: 'Não foi possível conectar ao servidor (agenda).' };
  }

  try {
    const resLink = await apiFetch<ApiWrite>('/api/petshop/consultas', {
      method: 'PUT',
      body: JSON.stringify({
        id: dados.consultaId, filial,
        agenda_id: agendaId, agenda_filial: filial,
      }),
    });
    if (resLink.CodStatus !== 1) {
      return { error: `Agenda #${agendaId} criada, mas não foi possível vincular à consulta: ${resLink.DescricaoStatus}` };
    }
  } catch {
    return { error: `Agenda #${agendaId} criada, mas não foi possível conectar ao servidor pra vincular à consulta.` };
  }

  revalidatePath(`/consultas/${dados.consultaId}`);
  return { agendaId };
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
