import { apiFetch, qs, FILIAL } from '@/lib/api';
import { RelatorioVendasSecaoResponse } from '@/types/petshop';
import RelatorioVendasSecao from '@/components/petshop/relatorios/RelatorioVendasSecao';

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

const empty: RelatorioVendasSecaoResponse = {
  periodo: '', dados: [], Count: 0, total_geral: 0, StartsAt: '', EndsAt: '',
};

export default async function RelatorioVendasSecaoPage({ searchParams }: { searchParams: SearchParams }) {
  const dataIni = searchParams.data_ini || primeiroDiaMes();
  const dataFim = searchParams.data_fim || ultimoDiaMes();

  const res = await apiFetch<RelatorioVendasSecaoResponse>(
    `/api/petshop/relatorios/vendas-secao${qs({ filial: FILIAL, data_ini: dataIni, data_fim: dataFim })}`,
  ).catch(() => empty);

  return <RelatorioVendasSecao dados={res} dataIni={dataIni} dataFim={dataFim} />;
}
