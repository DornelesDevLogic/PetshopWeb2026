import { apiFetch, qs, getFilial } from '@/lib/api';
import { RelatorioComissaoResponse } from '@/types/petshop';
import RelatorioComissoes from '@/components/petshop/relatorios/RelatorioComissoes';

interface SearchParams {
  data_ini?: string;
  data_fim?: string;
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

const empty: RelatorioComissaoResponse = {
  periodo: '', dados: [], Count: 0, total_venda: 0, total_comissao: 0, StartsAt: '', EndsAt: '',
};

export default async function RelatorioComissoesPage({ searchParams }: { searchParams: SearchParams }) {
  const dataIni = searchParams.data_ini || primeiroDiaMes();
  const dataFim = searchParams.data_fim || ultimoDiaMes();

  const res = await apiFetch<RelatorioComissaoResponse>(
    `/api/petshop/relatorios/comissoes${qs({ filial: getFilial(), data_ini: dataIni, data_fim: dataFim })}`,
  ).catch(() => empty);

  return <RelatorioComissoes dados={res} dataIni={dataIni} dataFim={dataFim} />;
}
