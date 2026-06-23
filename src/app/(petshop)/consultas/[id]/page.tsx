import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  ConsultaDetalhe,
  ProntuarioResponse,
  ExameResponse,
  VacinaResponse,
  ConfigAnamnese,
  AnimalResponse,
  Animal,
  AnexoExameResponse,
} from '@/types/petshop';
import ConsultaDetalheView from '@/components/petshop/consultas/ConsultaDetalheView';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function ConsultaDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const consulta = await apiFetch<ConsultaDetalhe>(
    `/api/petshop/consultas/detalhe${qs({ id, filial: FILIAL })}`,
  ).catch(() => null);

  if (!consulta || consulta.CodStatus === -5) notFound();

  const emptyProntuario: ProntuarioResponse = { consulta_id: id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyExame: ExameResponse            = { consulta_id: id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyVacina: VacinaResponse          = { animal_id: consulta.animal_id, dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyAnimal: AnimalResponse          = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const emptyAnexo: AnexoExameResponse = { dados: [], Count: 0 };

  const [prontuariosRes, examesRes, vacinasRes, configRes, animalRes, anexosRes] = await Promise.all([
    apiFetch<ProntuarioResponse>(
      `/api/petshop/prontuarios${qs({ consulta_id: id, filial: FILIAL })}`,
    ).catch(() => emptyProntuario),

    apiFetch<ExameResponse>(
      `/api/petshop/exames${qs({ consulta_id: id, filial: FILIAL })}`,
    ).catch(() => emptyExame),

    apiFetch<VacinaResponse>(
      `/api/petshop/animais/vacinas-aplicadas${qs({ animal_id: consulta.animal_id, filial: FILIAL })}`,
    ).catch(() => emptyVacina),

    apiFetch<ConfigAnamnese>(
      `/api/petshop/config-anamnese${qs({ filial: FILIAL })}`,
    ).catch(() => null),

    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: FILIAL, filter1: `a.PET_ID=${consulta.animal_id}`, limit: 1 })}`,
    ).catch(() => emptyAnimal),

    apiFetch<AnexoExameResponse>(
      `/api/petshop/exames/anexos${qs({ consulta_id: id, filial: FILIAL })}`,
    ).catch(() => emptyAnexo),
  ]);

  const animal: Animal | null = animalRes.dados[0] ?? null;

  return (
    <ConsultaDetalheView
      consulta={consulta}
      prontuarios={prontuariosRes.dados}
      exames={examesRes.dados}
      vacinas={vacinasRes.dados}
      config={configRes}
      animal={animal}
      anexos={anexosRes.dados ?? []}
    />
  );
}
