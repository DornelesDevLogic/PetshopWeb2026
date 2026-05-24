import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ContaReceberResponse, ContaReceberTotais } from '@/types/petshop';
import FinanceiroView from '@/components/petshop/financeiro/FinanceiroView';

interface SearchParams {
  data_de?:   string;
  data_ate?:  string;
  status?:    string;
  tipo_data?: string;
}

function primeiroDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function ultimoDiaMes() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().split('T')[0];
}

export default async function FinanceiroPage({ searchParams }: { searchParams: SearchParams }) {
  const dataDe   = searchParams.data_de   || primeiroDiaMes();
  const dataAte  = searchParams.data_ate  || ultimoDiaMes();
  const status   = searchParams.status    || 'A';   // A=aberto/parcial, P=pago, ''=todos
  const tipoData = searchParams.tipo_data || 'vencimento';

  const emptyList = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const emptyTot: ContaReceberTotais = { total: 0, total_valor: 0, total_saldo: 0 };

  const params = {
    filial:    FILIAL,
    data_de:   dataDe,
    data_ate:  dataAte,
    status:    status  || undefined,
    tipo_data: tipoData,
    limit:     200,
  };

  const [contasRes, totaisRes] = await Promise.all([
    apiFetch<ContaReceberResponse>(
      `/api/petshop/financeiro/contas-receber${qs(params)}`,
    ).catch(() => emptyList),

    apiFetch<ContaReceberTotais>(
      `/api/petshop/financeiro/contas-receber/count${qs(params)}`,
    ).catch(() => emptyTot),
  ]);

  return (
    <FinanceiroView
      contas={contasRes.dados}
      totais={totaisRes}
      dataDe={dataDe}
      dataAte={dataAte}
      statusAtual={status}
      tipoData={tipoData}
    />
  );
}
