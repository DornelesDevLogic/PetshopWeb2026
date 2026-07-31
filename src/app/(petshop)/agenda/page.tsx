import { apiFetch, qs, getFilial } from '@/lib/api';
import { AgendaResponse, ProfissionalResponse, ServicoResponse, VendedorResponse } from '@/types/petshop';
import AgendaView from '@/components/petshop/agenda/AgendaView';
import { getUsuarioLogado } from '@/lib/session';

interface FiliaisResponse { dados: { id: number; nome: string }[]; Count: number; }

interface Props {
  searchParams: {
    data?: string;
    profissional_id?: string;
    status?: string;
    filial?: string;
    periodo?: string;
  };
}

function hojeISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Segunda-feira da semana que contém a data (ISO YYYY-MM-DD) */
function segundaDaSemana(dataISO: string): string {
  const d = new Date(dataISO + 'T00:00:00');
  const diaSemana = d.getDay(); // 0=domingo .. 6=sábado
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + deslocamento);
  return d.toISOString().split('T')[0];
}

function addDiasISO(dataISO: string, n: number): string {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default async function AgendaPage({ searchParams }: Props) {
  const data    = searchParams.data ?? hojeISO();
  const status  = searchParams.status ?? '';
  const periodo = searchParams.periodo === 'semana' ? 'semana' : 'dia';

  // Visão semana: sempre ancorada na segunda-feira da semana da data selecionada
  const semanaInicio = periodo === 'semana' ? segundaDaSemana(data) : data;
  const semanaFim    = periodo === 'semana' ? addDiasISO(semanaInicio, 6) : data;

  const filialHome = getFilial();
  // Filial que está sendo visualizada no grid — pode ser outra loja, escolhida
  // pelo usuário no seletor de filial (não altera a filial padrão da sessão).
  const filialVisualizada = Number(searchParams.filial) || filialHome;

  // Padrão do profissional logado: se o usuário tem técnico vinculado
  // (TBLTECNICO.FK_USUARIO), a agenda abre filtrada por ele.
  // 'todos' na URL = usuário limpou o filtro manualmente.
  const usuario = getUsuarioLogado();
  const rawProf = searchParams.profissional_id;
  const profissionalId =
    rawProf === 'todos' ? ''
    : rawProf ?? (usuario?.tecnico_id ? String(usuario.tecnico_id) : '');

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  // Sem filtro de status explícito → busca 'todos' (inclui finalizadas/PAGAS, STATUS 3)
  // e escondemos apenas as canceladas (STATUS 4) mais abaixo. Se o usuário escolher
  // um status específico no filtro, respeitamos esse.
  const statusParam = status || 'todos';

  const [agendaRes, profRes, servRes, vendRes, filiaisRes] = await Promise.all([
    apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({
        filial:          filialVisualizada,
        // Visão dia: filtra por data exata. Visão semana: intervalo seg-dom.
        data:            periodo === 'semana' ? undefined : data,
        data_de:         periodo === 'semana' ? semanaInicio : undefined,
        data_ate:        periodo === 'semana' ? semanaFim    : undefined,
        profissional_id: profissionalId || undefined,
        status:          statusParam,
        // tipo_ocorrencia=1 → instrui o backend a retornar apenas agendamentos reais
        // (mesmo campo enviado na criação de agenda; Tele Entrega não possui esse valor)
        tipo_ocorrencia: 1,
        limit:           periodo === 'semana' ? 1500 : 300,
      })}`
    ).catch(() => empty),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: filialVisualizada, limit: 500 })}`
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: filialVisualizada, limit: 200 })}`
    ).catch(() => empty),

    apiFetch<VendedorResponse>(
      `/api/petshop/vendedores${qs({ filial: filialVisualizada, limit: 200 })}`
    ).catch(() => empty),

    apiFetch<FiliaisResponse>('/api/petshop/filiais').catch(() => ({ dados: [], Count: 0 })),
  ]);

  // Exclui Tele Entrega e Pré-venda do calendário.
  // O campo `servico` (nome do serviço já retornado pela API) é o discriminador
  // confiável — confirmado no print: card exibe badge "TELE-ENTREGA".
  // O campo `tipo_servico` é verificado como camada secundária caso o backend
  // passe a retorná-lo futuramente.
  const SERVICOS_EXCLUIDOS = new Set([
    'tele-entrega', 'tele entrega', 'teleentrega', 'tele',
    'pre-venda', 'pré-venda', 'prevenda',
  ]);
  const itensAgenda = agendaRes.dados.filter(item => {
    const servico    = (item.servico      ?? '').toLowerCase().trim();
    const tipoServico = (item.tipo_servico ?? '').toLowerCase().trim();
    // Na visão padrão (sem status escolhido) escondemos as canceladas (STATUS 4),
    // mas mantemos as pagas/finalizadas (STATUS 3).
    if (!status && item.status === 4) return false;
    // Regra principal: pré-venda e tele-entrega não têm tipo de serviço selecionado
    // (servico_id vem 0/nulo) — não devem aparecer na agenda.
    if (!item.servico_id) return false;
    return !SERVICOS_EXCLUIDOS.has(servico) && !SERVICOS_EXCLUIDOS.has(tipoServico);
  });

  // Somente profissionais ativos (STATUS_ATIVO <> 1, convenção do legado)
  const profissionaisAtivos = profRes.dados.filter((p) => p.status_ativo !== 1);

  return (
    <AgendaView
      items={itensAgenda}
      profissionais={profissionaisAtivos}
      servicos={servRes.dados}
      vendedores={vendRes.dados}
      dataAtual={data}
      profissionalIdAtual={profissionalId}
      statusAtual={status}
      filial={filialVisualizada}
      filialHome={filialHome}
      filiais={filiaisRes.dados}
      periodo={periodo}
      semanaInicio={semanaInicio}
    />
  );
}
