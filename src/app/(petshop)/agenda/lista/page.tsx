import { apiFetch, qs, FILIAL } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse, ServicoResponse } from '@/types/petshop';
import AgendaListaView from '@/components/petshop/agenda/AgendaListaView';
import { getUsuarioLogado } from '@/lib/session';

interface Props {
  searchParams: {
    data_de?:         string;
    data_ate?:        string;
    status?:          string;
    profissional_id?: string;
    servico_id?:      string;
    busca?:           string;
    numero?:          string;
  };
}

function addDias(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default async function AgendaListaPage({ searchParams }: Props) {
  const hoje = new Date();
  // Período padrão: últimos 7 dias até 7 dias à frente
  const dataDe  = searchParams.data_de  ?? addDias(hoje, -7);
  const dataAte = searchParams.data_ate ?? addDias(hoje, 7);
  const status  = searchParams.status   ?? 'todos';

  // Padrão do profissional logado (TBLTECNICO.FK_USUARIO); 'todos' = limpou manualmente
  const usuario = getUsuarioLogado();
  const rawProf = searchParams.profissional_id;
  const profId  =
    rawProf === 'todos' ? ''
    : rawProf ?? (usuario?.tecnico_id ? String(usuario.tecnico_id) : '');
  const servId  = searchParams.servico_id ?? '';
  const busca   = searchParams.busca    ?? '';
  const numero  = searchParams.numero   ?? '';

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [agendaRes, profRes, servRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial:          FILIAL,
        // pesquisa por número ignora o período (como no legado)
        data_de:         numero ? undefined : dataDe,
        data_ate:        numero ? undefined : dataAte,
        status,
        profissional_id: profId || undefined,
        servico_id:      servId || undefined,
        busca:           busca || undefined,
        numero:          numero || undefined,
        limit:           500,
      })}`
    ).catch(() => empty),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: FILIAL, limit: 200 })}`
    ).catch(() => empty),
  ]);

  return (
    <AgendaListaView
      items={agendaRes.dados}
      profissionais={profRes.dados}
      servicos={servRes.dados}
      filtros={{ dataDe, dataAte, status, profId, servId, busca, numero }}
    />
  );
}
