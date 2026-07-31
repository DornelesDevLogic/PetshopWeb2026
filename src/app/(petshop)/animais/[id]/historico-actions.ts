'use server';

import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  AgendaResponse,
  AgendaItem,
  AnimalHistoricoResponse,
  AnimalHistoricoItem,
  ConsultaAnimalResponse,
  ConsultaAnimalItem,
} from '@/types/petshop';

export interface HistoricoAnimal {
  agendas:  AgendaItem[];
  compras:  AnimalHistoricoItem[];
  consultas: ConsultaAnimalItem[];
}

export async function buscarHistoricoAnimal(
  animalId: number,
  filial?: number,
): Promise<HistoricoAnimal> {
  const fil = filial ?? getFilial();

  const [agendasRes, comprasRes, consultasRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({ filial: fil, animal_id: animalId, status: 'todos', limit: 999 })}`,
    ).catch(() => ({ dados: [] as AgendaItem[], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<AnimalHistoricoResponse>(
      `/api/petshop/animais/historico${qs({ filial: fil, animal_id: animalId, limit: 300 })}`,
    ).catch(() => ({ animal_id: animalId, cliente_id: 0, dados: [] as AnimalHistoricoItem[], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<ConsultaAnimalResponse>(
      `/api/petshop/consultas${qs({ filial: fil, animal_id: animalId, limit: 200 })}`,
    ).catch(() => ({ animal_id: animalId, dados: [] as ConsultaAnimalItem[], Count: 0, StartsAt: '', EndsAt: '' })),
  ]);

  return {
    agendas:  agendasRes.dados ?? [],
    compras:  comprasRes.dados  ?? [],
    consultas: consultasRes.dados ?? [],
  };
}
