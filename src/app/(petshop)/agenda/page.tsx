import { apiFetch, qs, FILIAL } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse } from '@/types/petshop';
import AgendaView from '@/components/petshop/agenda/AgendaView';

interface Props {
  searchParams: {
    data?: string;
    profissional_id?: string;
    status?: string;
  };
}

function hojeISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default async function AgendaPage({ searchParams }: Props) {
  const data          = searchParams.data ?? hojeISO();
  const profissionalId = searchParams.profissional_id ?? '';
  const status        = searchParams.status ?? '';

  const [agendaRes, profRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial: FILIAL,
        data,
        profissional_id: profissionalId || undefined,
        status: status || undefined,
        limit: 300,
      })}`
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' })),
  ]);

  return (
    <AgendaView
      items={agendaRes.dados}
      profissionais={profRes.dados}
      dataAtual={data}
      profissionalIdAtual={profissionalId}
      statusAtual={status}
    />
  );
}
