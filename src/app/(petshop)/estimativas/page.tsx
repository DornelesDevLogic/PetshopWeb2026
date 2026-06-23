import { buscarEstimativas, buscarRegras, type FiltroStatus } from './actions';
import EstimativasView from '@/components/petshop/estimativas/EstimativasView';

interface Props {
  searchParams: {
    status?: string;
    busca?:  string;
    aba?:    string;
  };
}

const STATUS_VALIDOS = ['todas', 'pendentes', 'lembrete', 'vencidas', 'enviadas', 'canceladas'];

export default async function EstimativasPage({ searchParams }: Props) {
  const status = (STATUS_VALIDOS.includes(searchParams.status ?? '')
    ? searchParams.status
    : 'lembrete') as FiltroStatus;
  const busca = searchParams.busca ?? '';
  const aba   = searchParams.aba === 'regras' ? 'regras' : 'lista';

  const [estimativas, regras] = await Promise.all([
    buscarEstimativas({ status, busca }),
    buscarRegras(),
  ]);

  return (
    <EstimativasView
      estimativas={estimativas}
      regras={regras}
      statusAtual={status}
      buscaAtual={busca}
      abaAtual={aba}
    />
  );
}
