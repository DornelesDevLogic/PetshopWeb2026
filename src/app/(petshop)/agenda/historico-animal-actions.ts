'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import { buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { buscarEstimativas, type Estimativa } from '@/app/(petshop)/estimativas/actions';
import type {
  Animal, AnimalResponse,
  Cliente,
  AgendaItem, AgendaResponse,
  Consulta, ConsultaResponse,
  Prontuario, ProntuarioResponse,
  Exame, ExameResponse,
} from '@/types/petshop';

export interface HistoricoAnimal {
  animal:      Animal | null;
  cliente:     Cliente | null;
  agendas:     AgendaItem[];
  consultas:   Consulta[];
  prontuarios: Prontuario[];
  exames:      Exame[];
  estimativas: Estimativa[];
}

/**
 * Histórico completo do animal — equivalente ao "Histórico do Animal" do
 * legado (aberto com F4 em cima de uma agenda). Busca em paralelo agendas,
 * consultas, prontuário, exames e estimativas do pet, além dos dados de
 * cabeçalho (raça/peso do animal, telefone/celular do cliente).
 */
export async function buscarHistoricoAnimal(
  animalId: number,
  clienteId: number,
  filial?: number,
): Promise<HistoricoAnimal> {
  const fil = filial ?? getFilial();
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [animalRes, cliente, agendaRes, consultaRes, prontRes, exameRes, estimativas] = await Promise.all([
    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: fil, filter1: `a.PET_ID=${animalId}`, limit: 1 })}`,
    ).catch(() => empty as AnimalResponse),

    clienteId ? buscarClienteCompleto(clienteId) : Promise.resolve(null),

    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({ filial: fil, animal_id: animalId, status: 'todos', limit: 200 })}`,
    ).catch(() => empty as AgendaResponse),

    apiFetch<ConsultaResponse>(
      `/api/petshop/consultas${qs({ filial: fil, animal_id: animalId, limit: 200 })}`,
    ).catch(() => empty as ConsultaResponse),

    apiFetch<ProntuarioResponse>(
      `/api/petshop/prontuarios${qs({ filial: fil, animal_id: animalId })}`,
    ).catch(() => ({ ...empty, consulta_id: 0 }) as ProntuarioResponse),

    apiFetch<ExameResponse>(
      `/api/petshop/exames${qs({ filial: fil, animal_id: animalId })}`,
    ).catch(() => ({ ...empty, consulta_id: 0 }) as ExameResponse),

    buscarEstimativas({ animalId }).catch(() => [] as Estimativa[]),
  ]);

  return {
    animal:      animalRes.dados[0] ?? null,
    cliente,
    agendas:     agendaRes.dados ?? [],
    consultas:   consultaRes.dados ?? [],
    prontuarios: prontRes.dados ?? [],
    exames:      exameRes.dados ?? [],
    estimativas,
  };
}
