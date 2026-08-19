import { buscarEstimativas, buscarRegras, type FiltroStatus } from './actions';
import EstimativasView from '@/components/petshop/estimativas/EstimativasView';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { type ServicoResponse, type Servico } from '@/types/petshop';

interface Props {
  searchParams: {
    status?:    string;
    busca?:     string;
    aba?:       string;
    dataDe?:    string;
    dataAte?:   string;
    compraDe?:  string;
    compraAte?: string;
    servico?:   string;
  };
}

const STATUS_VALIDOS = ['todas', 'pendentes', 'lembrete', 'vencidas', 'enviadas', 'canceladas'];

export default async function EstimativasPage({ searchParams }: Props) {
  const status = (STATUS_VALIDOS.includes(searchParams.status ?? '')
    ? searchParams.status
    : 'lembrete') as FiltroStatus;
  const busca      = searchParams.busca      ?? '';
  const aba        = searchParams.aba === 'regras' ? 'regras' : 'lista';
  const dataDe     = searchParams.dataDe     ?? '';
  const dataAte    = searchParams.dataAte    ?? '';
  const compraDe   = searchParams.compraDe   ?? '';
  const compraAte  = searchParams.compraAte  ?? '';
  const servicoId  = Number(searchParams.servico) || 0;

  const [estimativas, regras, servicosRes] = await Promise.all([
    buscarEstimativas({ status, busca, dataDe, dataAte, compraDe, compraAte, tipoServicoId: servicoId || undefined }),
    buscarRegras(),
    apiFetch<ServicoResponse>(`/api/petshop/servicos${qs({ filial: getFilial(), limit: 200 })}`)
      .catch(() => ({ dados: [] as Servico[], Count: 0 })),
  ]);

  return (
    <EstimativasView
      estimativas={estimativas}
      regras={regras}
      servicos={servicosRes.dados ?? []}
      statusAtual={status}
      buscaAtual={busca}
      abaAtual={aba}
      dataDeAtual={dataDe}
      dataAteAtual={dataAte}
      compraDeAtual={compraDe}
      compraAteAtual={compraAte}
      servicoAtual={servicoId}
    />
  );
}
