import { notFound } from 'next/navigation';
import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  AgendaDetalhe,
  ProfissionalResponse, ServicoResponse,
  EspecieResponse, RacaResponse, TipoPeloResponse, VendedorResponse,
} from '@/types/petshop';
import NovoAgendamentoForm, { ItemSalvo } from '@/components/petshop/agenda/NovoAgendamentoForm';
import EdicaoLockGuard from '@/components/petshop/EdicaoLockGuard';

interface Props {
  params: { id: string };
}

export default async function EditarAgendaPage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [detalhe, itensRes, profsRes, servsRes, especiesRes, racasRes, pelosRes, vendsRes] = await Promise.all([
    apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe${qs({ id, filial: getFilial() })}`,
    ).catch(() => null),

    apiFetch<{ dados: ItemSalvo[]; Count: number }>(
      `/api/petshop/agenda/itens?id=${id}&filial=${getFilial()}`,
    ).catch(() => ({ dados: [] as ItemSalvo[], Count: 0 })),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: getFilial(), limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: getFilial(), limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: getFilial(), limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: getFilial(), limit: 100 })}`,
    ).catch(() => empty),
    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
  ]);

  if (!detalhe) notFound();

  return (
    <EdicaoLockGuard idOrca={id} filial={detalhe.filial} voltarHref={`/agenda/${id}`}>
      <NovoAgendamentoForm
        modo="editar"
        agendaId={id}
        agendaInicial={detalhe}
        itensIniciais={itensRes.dados}
        profissionais={profsRes.dados}
        servicos={servsRes.dados}
        especies={especiesRes.dados}
        racas={racasRes.dados}
        pelos={pelosRes.dados}
        vendedores={vendsRes.dados}
        filial={getFilial()}
      />
    </EdicaoLockGuard>
  );
}
