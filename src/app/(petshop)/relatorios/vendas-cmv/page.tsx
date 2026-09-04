import { apiFetch, qs, getFilial } from '@/lib/api';
import { VendasCmvResponse } from '@/types/petshop';
import RelatorioVendasCmv from '@/components/petshop/relatorios/RelatorioVendasCmv';

interface SearchParams {
  data_de?:         string;
  data_ate?:        string;
  filial?:          string;
  caixa?:           string;
  sem_fp?:          string;
  somente_frente?:  string;
}

function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

const empty: VendasCmvResponse = {
  numero_vendas: 0, venda_bruta: 0, cmv: 0, lucro_bruto: 0, margem: 0, markup: 0,
  desconto: 0, acrescimo: 0, ticket_medio: 0, dados: [], Count: 0,
};

// "Geral de Vendas - Detalhamento CMV" — cópia fiel do relatório do
// Retaguarda legado (URelatGeralVendasCMV.pas): venda bruta, CMV, lucro,
// markup e margem agrupados por Seção.
export default async function RelatorioVendasCmvPage({ searchParams }: { searchParams: SearchParams }) {
  const filialSessao = getFilial();
  const dataDe  = searchParams.data_de  || hojeISO();
  const dataAte = searchParams.data_ate || hojeISO();
  const filial  = searchParams.filial   || String(filialSessao);
  const caixa   = searchParams.caixa    || '';
  const semFp          = searchParams.sem_fp === '1';
  const somenteFrente  = searchParams.somente_frente === '1';

  const res = await apiFetch<VendasCmvResponse>(
    `/api/petshop/relatorios/vendas-cmv${qs({
      filial:          filial === '0' ? undefined : filial,
      data_de:         dataDe,
      data_ate:        dataAte,
      caixa:           caixa || undefined,
      sem_fp:          semFp ? 1 : undefined,
      somente_frente:  somenteFrente ? 1 : undefined,
    })}`,
  ).catch(() => empty);

  return (
    <RelatorioVendasCmv
      dados={res}
      filtros={{ dataDe, dataAte, filial, caixa, semFp, somenteFrente }}
    />
  );
}
