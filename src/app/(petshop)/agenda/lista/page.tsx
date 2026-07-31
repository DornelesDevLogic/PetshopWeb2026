import { apiFetch, qs, getFilial } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse, ServicoResponse } from '@/types/petshop';
import AgendaListaView, { Filtros } from '@/components/petshop/agenda/AgendaListaView';
import { getUsuarioLogado } from '@/lib/session';

interface Props {
  searchParams: {
    data_de?:         string;
    data_ate?:        string;
    prev_de?:         string;  // data_entrega De
    prev_ate?:        string;  // data_entrega Até
    status?:          string;
    profissional_id?: string;
    servico_id?:      string;
    busca?:           string;
    animal?:          string;
    numero?:          string;
    order_by?:        string;  // 'abertura' | 'previsao'
  };
}

function addDias(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default async function AgendaListaPage({ searchParams }: Props) {
  const hoje = new Date();
  const dataDe  = searchParams.data_de  ?? addDias(hoje, 0);
  const dataAte = searchParams.data_ate ?? addDias(hoje, 0);
  const prevDe  = searchParams.prev_de  ?? '';
  const prevAte = searchParams.prev_ate ?? '';
  const status  = searchParams.status   ?? 'todos';
  const animal  = searchParams.animal   ?? '';
  const orderBy = searchParams.order_by ?? 'abertura';

  const usuario = getUsuarioLogado();
  const rawProf = searchParams.profissional_id;
  const profId  =
    rawProf === 'todos' ? ''
    : rawProf ?? (usuario?.tecnico_id ? String(usuario.tecnico_id) : '');
  const servId  = searchParams.servico_id ?? '';
  const busca   = searchParams.busca    ?? '';
  const numero  = searchParams.numero   ?? '';

  // status '1' no filtro rápido representa "Em aberto" (status 1 e 2 no backend).
  // Quando o usuário clicar em "Em aberto" enviamos status=1; o backend filtra
  // por STATUS in (1,2) se receber status=1 (comportamento do legado).
  const statusApi = status === 'todos' ? undefined : status;

  // Ordernação: 'previsao' → ordena por data_entrega, padrão → data_previsao
  const orderByApi = orderBy === 'previsao' ? 'data_entrega' : undefined;

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [agendaRes, profRes, servRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial:             getFilial(),
        data_de:            numero ? undefined : dataDe,
        data_ate:           numero ? undefined : dataAte,
        data_entrega_de:    prevDe  || undefined,
        data_entrega_ate:   prevAte || undefined,
        status:             statusApi,
        profissional_id:    profId || undefined,
        servico_id:         servId || undefined,
        busca:              busca  || undefined,
        animal:             animal || undefined,
        numero:             numero || undefined,
        order_by:           orderByApi,
        tipo_ocorrencia:    1,
        limit:              500,
      })}`
    ).catch(() => empty),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: getFilial(), limit: 500 })}`
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: getFilial(), limit: 200 })}`
    ).catch(() => empty),
  ]);

  const SERVICOS_EXCLUIDOS = new Set([
    'tele-entrega', 'tele entrega', 'teleentrega', 'tele',
    'pre-venda', 'pré-venda', 'prevenda',
  ]);
  const itensAgenda = agendaRes.dados.filter(item => {
    const servico     = (item.servico      ?? '').toLowerCase().trim();
    const tipoServico = (item.tipo_servico ?? '').toLowerCase().trim();
    // Regra principal: pré-venda e tele-entrega não têm tipo de serviço selecionado
    // (servico_id vem 0/nulo) — não devem aparecer na agenda.
    if (!item.servico_id) return false;
    return !SERVICOS_EXCLUIDOS.has(servico) && !SERVICOS_EXCLUIDOS.has(tipoServico);
  });

  const filtros: Filtros = {
    dataDe,
    dataAte,
    prevDe,
    prevAte,
    status,
    profId: profId || 'todos',
    servId,
    busca,
    animal,
    numero,
    orderBy,
  };

  return (
    <AgendaListaView
      items={itensAgenda}
      profissionais={profRes.dados}
      servicos={servRes.dados}
      filtros={filtros}
    />
  );
}
