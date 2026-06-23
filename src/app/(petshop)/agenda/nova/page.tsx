import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  ProfissionalResponse, ServicoResponse,
  EspecieResponse, RacaResponse, TipoPeloResponse, VendedorResponse,
} from '@/types/petshop';
import NovoAgendamentoForm from '@/components/petshop/agenda/NovoAgendamentoForm';
import { getProximoNumeroAgenda } from '@/app/(petshop)/agenda/nova/actions';

interface Props {
  searchParams: { data?: string; hora?: string };
}

export default async function NovoAgendamentoPage({ searchParams }: Props) {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [profsRes, servsRes, especiesRes, racasRes, pelosRes, vendsRes, proximoNumero] = await Promise.all([
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
    getProximoNumeroAgenda(),
  ]);

  return (
    <NovoAgendamentoForm
      profissionais={profsRes.dados}
      servicos={servsRes.dados}
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
      vendedores={vendsRes.dados}
      dataInicial={searchParams.data ?? ''}
      horaInicial={searchParams.hora ?? ''}
      filial={FILIAL}
      proximoNumero={proximoNumero ?? undefined}
    />
  );
}
