import { apiFetch, qs, FILIAL } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse, ServicoResponse, VendedorResponse } from '@/types/petshop';
import AgendaView from '@/components/petshop/agenda/AgendaView';
import { getUsuarioLogado } from '@/lib/session';

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
  const data   = searchParams.data ?? hojeISO();
  const status = searchParams.status ?? '';

  // Padrão do profissional logado: se o usuário tem técnico vinculado
  // (TBLTECNICO.FK_USUARIO), a agenda abre filtrada por ele.
  // 'todos' na URL = usuário limpou o filtro manualmente.
  const usuario = getUsuarioLogado();
  const rawProf = searchParams.profissional_id;
  const profissionalId =
    rawProf === 'todos' ? ''
    : rawProf ?? (usuario?.tecnico_id ? String(usuario.tecnico_id) : '');

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [agendaRes, profRes, servRes, vendRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial: FILIAL,
        data,
        profissional_id: profissionalId || undefined,
        status: status || undefined,
        limit: 300,
      })}`
    ).catch(() => empty),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: FILIAL, limit: 200 })}`
    ).catch(() => empty),

    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: FILIAL, limit: 200 })}`
    ).catch(() => empty),
  ]);

  return (
    <AgendaView
      items={agendaRes.dados}
      profissionais={profRes.dados}
      servicos={servRes.dados}
      vendedores={vendRes.dados}
      dataAtual={data}
      profissionalIdAtual={profissionalId}
      statusAtual={status}
    />
  );
}
