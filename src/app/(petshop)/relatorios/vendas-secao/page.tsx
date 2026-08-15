import { apiFetch, qs, getFilial } from '@/lib/api';
import { RelatorioVendasSecaoResponse, SecaoResponse } from '@/types/petshop';
import RelatorioVendasSecao from '@/components/petshop/relatorios/RelatorioVendasSecao';

interface SearchParams {
  data_ini?: string;
  data_fim?: string;
  secao_id?: string;
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

const emptySecoes: SecaoResponse = { dados: [], Count: 0 };

export default async function RelatorioVendasSecaoPage({ searchParams }: { searchParams: SearchParams }) {
  const filial = getFilial();
  const dataIni = searchParams.data_ini || primeiroDiaMes();
  const dataFim = searchParams.data_fim || ultimoDiaMes();

  const [res, secoesRes] = await Promise.all([
    apiFetch<RelatorioVendasSecaoResponse>(
      `/api/petshop/relatorios/vendas-secao${qs({
        filial, data_ini: dataIni, data_fim: dataFim,
        secao_id: searchParams.secao_id || undefined,
      })}`,
    ).catch(() => empty),

    apiFetch<SecaoResponse>(`/api/petshop/secoes${qs({ filial, limit: 500 })}`).catch(() => emptySecoes),
  ]);

  return (
    <RelatorioVendasSecao
      dados={res}
      dataIni={dataIni}
      dataFim={dataFim}
      secoes={secoesRes.dados}
      secaoId={searchParams.secao_id || ''}
    />
  );
}
