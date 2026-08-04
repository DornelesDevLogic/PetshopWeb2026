import { notFound } from 'next/navigation';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { AnimalResponse, ProfissionalResponse, ServicoResponse } from '@/types/petshop';
import { buscarHistoricoAnimal } from '../historico-actions';
import AnimalHistoricoView from '@/components/petshop/animais/AnimalHistoricoView';

interface Props {
  params: { id: string };
}

export default async function AnimalHistoricoPage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const filial = getFilial();

  const [animalRes, historico, profissionaisRes, servicosRes] = await Promise.all([
    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial, limit: 1, filter1: `a.PET_ID=${id}` })}`,
    ).catch(() => empty),
    buscarHistoricoAnimal(id, filial),
    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial, limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial, limit: 200 })}`,
    ).catch(() => empty),
  ]);

  const animal = animalRes.dados[0];
  if (!animal) notFound();

  return (
    <AnimalHistoricoView
      animal={animal}
      agendas={historico.agendas}
      compras={historico.compras}
      consultas={historico.consultas}
      estimativas={historico.estimativas}
      profissionais={profissionaisRes.dados}
      servicos={servicosRes.dados}
      filial={filial}
    />
  );
}
