'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ApiWrite, ClienteResponse, AnimalResponse, Cliente, Animal } from '@/types/petshop';

/** Busca clientes por texto */
export async function buscarClientes(q: string): Promise<Cliente[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ClienteResponse>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: getFilial() })}`,
  ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados.slice(0, 10);
}

export interface AnimalBuscaItem {
  id: number; filial: number; nome: string; apelido: string;
  especie: string; raca: string; sexo: string; ativo: number; obito: number;
  id_cliente: number; nome_cliente: string;
}

/** Busca por nome do pet — sozinho encontra qualquer pet com esse nome; com
 * `q2` exige que o segundo termo também apareça (em qualquer campo: nome do
 * pet, apelido ou nome do dono) — usada pra "dono/pet" ou "pet/dono", igual
 * à Agenda. Numa petshop o "cliente" de verdade, na prática, é o pet. */
export async function buscarAnimaisPorNome(q: string, q2?: string): Promise<AnimalBuscaItem[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<{ dados: AnimalBuscaItem[]; Count: number }>(
    `/api/petshop/animais/busca-rapida${qs({ q: q.trim(), q2: q2?.trim() || undefined, filial: getFilial() })}`,
  ).catch(() => ({ dados: [] as AnimalBuscaItem[], Count: 0 }));
  return (res.dados ?? []).filter((a) => a.obito !== 1).slice(0, 10);
}

/** Carrega animais de um cliente */
export async function buscarAnimais(clienteId: number): Promise<Animal[]> {
  if (!clienteId) return [];
  const res = await apiFetch<AnimalResponse>(
    `/api/petshop/animais?filial=${getFilial()}&limit=50&filter1=a.PET_FK_ID_CLIENTE=${clienteId}`,
  ).catch(() => ({ dados: [] as Animal[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados;
}

export interface ItemAgendaConsulta {
  id_item:   number;
  cod_pro:   string;
  produto:   string;
  descricao: string;
  unidade:   string;
  qtd:       string;
  valor:     string;
}

/** Itens (produtos/medicamentos) já lançados na agenda de origem da consulta */
export async function buscarItensAgenda(agendaId: number, filial: number): Promise<ItemAgendaConsulta[]> {
  if (!agendaId) return [];
  const res = await apiFetch<{ dados: ItemAgendaConsulta[]; Count: number }>(
    `/api/petshop/agenda/itens${qs({ id: agendaId, filial })}`,
  ).catch(() => ({ dados: [] as ItemAgendaConsulta[], Count: 0 }));
  return res.dados ?? [];
}

/** Cria nova consulta */
export async function createConsulta(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const animalId = Number(formData.get('animal_id') || 0);
  const vetId    = Number(formData.get('vet_id')    || 0);

  if (!animalId) return { error: 'Selecione um animal.' };
  if (!vetId)    return { error: 'Selecione um veterinário.' };

  const agendaFilial = Number(formData.get('agenda_filial')) || getFilial();
  const body = {
    filial:               agendaFilial,
    agenda_id:            Number(formData.get('agenda_id')   || 0),
    agenda_filial:        agendaFilial,
    animal_id:            animalId,
    animal_filial:        Number(formData.get('animal_filial') || getFilial()),
    animal_nome:          formData.get('animal_nome')       ?? '',
    proprietario_id:      Number(formData.get('cliente_id') || 0),
    proprietario_filial:  Number(formData.get('cliente_filial') || getFilial()),
    proprietario_nome:    formData.get('cliente_nome')      ?? '',
    vet_id:               vetId,
    vet_filial:           Number(formData.get('vet_filial')  || getFilial()),
    vet_nome:             formData.get('vet_nome')          ?? '',
    data:                 formData.get('data')              ?? '',
    motivo:               formData.get('motivo')            ?? '',
    peso:                 formData.get('peso')              ?? '',
    temperatura:          formData.get('temperatura')       ?? '',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/consultas', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/consultas');
  return { id: res.id as number };
}
