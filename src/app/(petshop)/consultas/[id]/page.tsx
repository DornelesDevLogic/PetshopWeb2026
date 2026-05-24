import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  ConsultaDetalhe,
  ProntuarioResponse,
  ExameResponse,
  VacinaResponse,
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

  const [prontuariosRes, examesRes, vacinasRes] = await Promise.all([
    apiFetch<ProntuarioResponse>(
      `/api/petshop/prontuarios${qs({ consulta_id: id, filial: FILIAL })}`,
    ).catch(() => emptyProntuario),

    apiFetch<ExameResponse>(
      `/api/petshop/exames${qs({ consulta_id: id, filial: FILIAL })}`,
    ).catch(() => emptyExame),

    apiFetch<VacinaResponse>(
      `/api/petshop/animais/vacinas-aplicadas${qs({ animal_id: consulta.animal_id, filial: FILIAL })}`,
    ).catch(() => emptyVacina),
  ]);

  return (
    <ConsultaDetalheView
      consulta={consulta}
      prontuarios={prontuariosRes.dados}
      exames={examesRes.dados}
      vacinas={vacinasRes.dados}
    />
  );
}
