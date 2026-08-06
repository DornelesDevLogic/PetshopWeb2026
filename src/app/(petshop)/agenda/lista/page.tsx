import { Suspense } from 'react';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse, ServicoResponse } from '@/types/petshop';
import AgendaListaView, { Filtros } from '@/components/petshop/agenda/AgendaListaView';
import AgendaListaSkeleton from '@/components/petshop/agenda/AgendaListaSkeleton';
import { getUsuarioLogado } from '@/lib/session';

interface FiliaisResponse { dados: { id: number; nome: string }[]; Count: number; }

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
    filial?:          string;
  };
}

function addDias(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Página síncrona (sem await no topo): o cabeçalho e o esqueleto dos
// filtros/tabela aparecem na hora do clique em "Visualização Rápida" — os
// dados (agenda + profissionais + serviços) só bloqueiam o conteúdo interno,
// dentro do Suspense, não a navegação em si.
export default function AgendaListaPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AgendaListaSkeleton />}>
      <AgendaListaContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AgendaListaContent({ searchParams }: Props) {
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

  const filialHome = getFilial();
  // Filial sendo visualizada (pode ser outra loja, escolhida no seletor) —
  // não altera a filial padrão da sessão, só o que é exibido nesta tela.
  const filialVisualizada = Number(searchParams.filial) || filialHome;

  // O backend só deixa de aplicar o filtro padrão "só em aberto" (STATUS IN
  // (1,2)) quando recebe status="todos" literalmente na querystring — omitir
  // o parâmetro (o que `qs()` faz com `undefined`) é tratado como "sem
  // status escolhido ainda" e cai nesse mesmo filtro padrão. Por isso aqui
  // sempre manda o valor real, nunca `undefined`, mesmo quando é "todos".
  const statusApi = status;

  // Ordernação: 'previsao' → ordena por data_entrega, padrão → data_previsao
  const orderByApi = orderBy === 'previsao' ? 'data_entrega' : undefined;

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [agendaRes, profRes, servRes, filiaisRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial:             filialVisualizada,
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
      `/api/petshop/profissionais${qs({ filial: filialVisualizada, limit: 500 })}`
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: filialVisualizada, limit: 200 })}`
    ).catch(() => empty),

    apiFetch<FiliaisResponse>('/api/petshop/filiais').catch(() => ({ dados: [], Count: 0 })),
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
      filial={filialVisualizada}
      filialHome={filialHome}
      filiais={filiaisRes.dados}
    />
  );
}
