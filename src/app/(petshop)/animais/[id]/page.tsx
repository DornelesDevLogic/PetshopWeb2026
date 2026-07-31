import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  AnimalResponse,
  AnimalHistoricoResponse,
  EspecieResponse,
  RacaResponse,
  TipoPeloResponse,
} from '@/types/petshop';
import AnimalDetalheView from '@/components/petshop/animais/AnimalDetalheView';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function AnimalDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [animalRes, historicoRes, especiesRes, racasRes, pelosRes] = await Promise.all([
    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: getFilial(), limit: 1, filter1: `a.PET_ID=${id}` })}`,
    ).catch(() => empty),

    apiFetch<AnimalHistoricoResponse>(
      `/api/petshop/animais/historico${qs({ filial: getFilial(), animal_id: id })}`,
    ).catch(() => ({
      animal_id: id, cliente_id: 0, dados: [], Count: 0, StartsAt: '', EndsAt: '',
    })),

    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),

    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: getFilial(), limit: 500 })}`,
    ).catch(() => empty),

    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
  ]);

  const animal = animalRes.dados[0];
  if (!animal) notFound();

  return (
    <AnimalDetalheView
      animal={animal}
      historico={historicoRes.dados}
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
    />
  );
}
