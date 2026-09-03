import { apiFetch, qs, getFilial } from '@/lib/api';
import { EstimativasSemConversaoResponse, VendedorResponse } from '@/types/petshop';
import RelatorioEstimativasSemConversao from '@/components/petshop/relatorios/RelatorioEstimativasSemConversao';

interface SearchParams {
  data_ini?:        string;
  data_fim?:        string;
  dias_conversao?:  string;
  cliente_id?:      string;
  cliente_nome?:    string;
  vendedor_id?:     string;
  status?:          string;
  valor_min?:       string;
  valor_max?:       string;
}

function primeiroDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

const empty: EstimativasSemConversaoResponse = {
  CodStatus: 1, periodo: '', dias_conversao: 7, dados: [], Count: 0,
  total_convertidas: 0, total_aguardando: 0, total_sem_conversao: 0,
  valor_total_sem_conversao: 0,
};

const emptyVend: VendedorResponse = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

export default async function RelatorioEstimativasSemConversaoPage({ searchParams }: { searchParams: SearchParams }) {
  const filial   = getFilial();
  const dataIni  = searchParams.data_ini || primeiroDiaMes();
  const dataFim  = searchParams.data_fim || hojeISO();
  const diasConversao = searchParams.dias_conversao || '7';
  const status   = searchParams.status || 'todos';

  const [res, vendRes] = await Promise.all([
    apiFetch<EstimativasSemConversaoResponse>(
      `/api/petshop/relatorios/estimativas-sem-conversao${qs({
        filial, data_ini: dataIni, data_fim: dataFim,
        dias_conversao: diasConversao,
        cliente_id: searchParams.cliente_id || undefined,
        vendedor_id: searchParams.vendedor_id || undefined,
        status: status !== 'todos' ? status : undefined,
        valor_min: searchParams.valor_min || undefined,
        valor_max: searchParams.valor_max || undefined,
      })}`,
    ).catch((e) => ({ ...empty, CodStatus: -1, DescricaoStatus: String(e?.message ?? 'Erro ao conectar com o servidor.') })),

    apiFetch<VendedorResponse>(`/api/petshop/vendedores${qs({ filial, limit: 200 })}`).catch(() => emptyVend),
  ]);

  // Backend pode responder 200 com CodStatus de erro (ex: coluna DATA_ENVIO
  // ainda nao criada no banco) sem os campos de totais - normaliza aqui pra
  // nao quebrar o componente, mantendo a mensagem de erro pra exibir.
  const dados: EstimativasSemConversaoResponse = res && res.CodStatus === 1
    ? res
    : { ...empty, CodStatus: res?.CodStatus ?? -1, DescricaoStatus: res?.DescricaoStatus ?? 'Erro ao carregar relatório.' };

  return (
    <RelatorioEstimativasSemConversao
      dados={dados}
      vendedores={vendRes.dados}
      filtros={{
        dataIni, dataFim,
        diasConversao,
        clienteId:   searchParams.cliente_id   || '',
        clienteNome: searchParams.cliente_nome || '',
        vendedorId:  searchParams.vendedor_id  || 'todos',
        status,
        valorMin: searchParams.valor_min || '',
        valorMax: searchParams.valor_max || '',
      }}
    />
  );
}
