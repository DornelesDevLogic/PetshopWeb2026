import { apiFetch, qs, getFilial } from '@/lib/api';
import { RelatorioComissaoResponse, ProfissionalResponse, VendedorResponse } from '@/types/petshop';
import RelatorioComissoes from '@/components/petshop/relatorios/RelatorioComissoes';

interface SearchParams {
  data_ini?:    string;
  data_fim?:    string;
  tecnico_id?:  string;
  codvend?:     string;
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

const emptyRef = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

export default async function RelatorioComissoesPage({ searchParams }: { searchParams: SearchParams }) {
  const filial = getFilial();
  const dataIni = searchParams.data_ini || primeiroDiaMes();
  const dataFim = searchParams.data_fim || ultimoDiaMes();

  const [res, profRes, vendRes] = await Promise.all([
    apiFetch<RelatorioComissaoResponse>(
      `/api/petshop/relatorios/comissoes${qs({
        filial, data_ini: dataIni, data_fim: dataFim,
        tecnico_id: searchParams.tecnico_id || undefined,
        codvend:    searchParams.codvend    || undefined,
      })}`,
    ).catch(() => empty),

    apiFetch<ProfissionalResponse>(`/api/petshop/profissionais${qs({ filial, limit: 500 })}`).catch(() => emptyRef),
    apiFetch<VendedorResponse>(`/api/petshop/vendedores${qs({ filial, limit: 200 })}`).catch(() => emptyRef),
  ]);

  const profissionaisAtivos = profRes.dados.filter((p) => p.status_ativo !== 1);

  return (
    <RelatorioComissoes
      dados={res}
      dataIni={dataIni}
      dataFim={dataFim}
      profissionais={profissionaisAtivos}
      vendedores={vendRes.dados}
      tecnicoId={searchParams.tecnico_id || ''}
      codvend={searchParams.codvend || ''}
    />
  );
}
