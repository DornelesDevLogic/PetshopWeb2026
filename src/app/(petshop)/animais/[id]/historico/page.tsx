import { notFound } from 'next/navigation';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { AnimalResponse } from '@/types/petshop';
import { buscarHistoricoAnimal } from '../historico-actions';
import AnimalHistoricoView from '@/components/petshop/animais/AnimalHistoricoView';

interface Props {
  params: { id: string };
}

export default async function AnimalHistoricoPage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [animalRes, historico] = await Promise.all([
    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: FILIAL, limit: 1, filter1: `a.PET_ID=${id}` })}`,
    ).catch(() => empty),
    buscarHistoricoAnimal(id, FILIAL),
  ]);

  const animal = animalRes.dados[0];
  if (!animal) notFound();

  return (
    <AnimalHistoricoView
      animal={animal}
      agendas={historico.agendas}
      compras={historico.compras}
      consultas={historico.consultas}
      filial={FILIAL}
    />
  );
}
