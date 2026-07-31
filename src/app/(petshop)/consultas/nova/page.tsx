import { redirect } from 'next/navigation';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { ProfissionalResponse, ConsultaResponse, AgendaDetalhe } from '@/types/petshop';
import NovaConsultaForm, { AgendaOrigem } from '@/components/petshop/consultas/NovaConsultaForm';

interface Props {
  searchParams: { agenda_id?: string; filial?: string };
}

/** Converte DD/MM/YYYY (ou já ISO) para YYYY-MM-DD, para preencher <input type="date"> */
function paraIso(s: string): string {
  if (!s) return '';
  const parte = s.trim().split(/[T ]/)[0];
  if (parte.includes('/')) {
    const [d, m, y] = parte.split('/');
    return y ? `${y}-${m}-${d}` : '';
  }
  return parte;
}

export default async function NovaConsultaPage({ searchParams }: Props) {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const profsRes = await apiFetch<ProfissionalResponse>(
    `/api/petshop/profissionais${qs({ filial: getFilial(), limit: 100 })}`,
  ).catch(() => empty);

  const agendaId = Number(searchParams.agenda_id) || 0;
  let agendaOrigem: AgendaOrigem | undefined;

  if (agendaId > 0) {
    const filialAgenda = Number(searchParams.filial) || getFilial();

    // Já existe consulta vinculada a essa agenda? Abre ela em vez de criar outra.
    const consultasRes = await apiFetch<ConsultaResponse>(
      `/api/petshop/consultas${qs({ agenda_id: agendaId, filial: filialAgenda, limit: 1 })}`,
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' }));

    if (consultasRes.Count > 0 && consultasRes.dados[0]) {
      redirect(`/consultas/${consultasRes.dados[0].id}`);
    }

    const agenda = await apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe${qs({ id: agendaId, filial: filialAgenda })}`,
    ).catch(() => null);

    if (agenda && agenda.CodStatus !== -5) {
      agendaOrigem = {
        agendaId:      agenda.id,
        filial:        agenda.filial,
        clienteId:     agenda.cliente_id,
        clienteFilial: agenda.cliente_filial || agenda.filial,
        clienteNome:   agenda.cliente,
        animalId:      agenda.animal_id,
        animalFilial:  agenda.animal_filial || agenda.filial,
        animalNome:    agenda.animal,
        vetId:         agenda.prof_id,
        vetFilial:     agenda.prof_filial || agenda.filial,
        vetNome:       agenda.profissional,
        data:          paraIso(agenda.data_previsao || agenda.data || ''),
        motivo:        agenda.servico || '',
      };
    }
  }

  return <NovaConsultaForm profissionais={profsRes.dados} agendaOrigem={agendaOrigem} />;
}
