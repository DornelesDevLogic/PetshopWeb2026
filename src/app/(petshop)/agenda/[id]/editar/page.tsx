import { notFound } from 'next/navigation';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  AgendaDetalhe,
  ProfissionalResponse, ServicoResponse,
  EspecieResponse, RacaResponse, TipoPeloResponse, VendedorResponse,
} from '@/types/petshop';
import NovoAgendamentoForm from '@/components/petshop/agenda/NovoAgendamentoForm';

interface Props {
  params: { id: string };
}

export default async function EditarAgendaPage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [detalhe, profsRes, servsRes, especiesRes, racasRes, pelosRes, vendsRes] = await Promise.all([
    apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe${qs({ id, filial: FILIAL })}`,
    ).catch(() => null),
    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: FILIAL, limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: FILIAL, limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: FILIAL, limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
  ]);

  if (!detalhe) notFound();

  return (
    <NovoAgendamentoForm
      modo="editar"
      agendaId={id}
      agendaInicial={detalhe}
      profissionais={profsRes.dados}
      servicos={servsRes.dados}
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
      vendedores={vendsRes.dados}
      filial={FILIAL}
    />
  );
}
