import { buscarVales, type StatusVale } from './actions';
import RelatorioVales from '@/components/petshop/relatorios/RelatorioVales';

interface SearchParams {
  cliente_id?:     string;
  cliente_filial?: string;
  cliente_nome?:   string;
  busca?:          string;
  status?:         string;
  data_ini?:       string;
  data_ate?:       string;
}

const STATUS_VALIDOS: StatusVale[] = ['aberto', 'usado', 'cancelado', 'todos'];

export default async function RelatorioValesPage({ searchParams }: { searchParams: SearchParams }) {
  const status = (STATUS_VALIDOS.includes(searchParams.status as StatusVale)
    ? searchParams.status
    : 'aberto') as StatusVale;

  const clienteId     = searchParams.cliente_id     ? Number(searchParams.cliente_id)     : undefined;
  const clienteFilial = searchParams.cliente_filial ? Number(searchParams.cliente_filial) : undefined;
  const busca         = searchParams.busca || '';

  const vales = await buscarVales({
    clienteId, clienteFilial, busca,
    status,
    dataIni: searchParams.data_ini || undefined,
    dataAte: searchParams.data_ate || undefined,
  });

  return (
    <RelatorioVales
      vales={vales}
      filtros={{
        clienteId:     searchParams.cliente_id     || '',
        clienteFilial: searchParams.cliente_filial || '',
        clienteNome:   searchParams.cliente_nome   || '',
        busca,
        status,
        dataIni: searchParams.data_ini || '',
        dataAte: searchParams.data_ate || '',
      }}
    />
  );
}
