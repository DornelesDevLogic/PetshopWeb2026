import { apiFetch, qs, getFilial } from '@/lib/api';
import { CurvaAbcResponse, SecaoResponse, CriterioCurvaAbc } from '@/types/petshop';
import RelatorioCurvaAbc from '@/components/petshop/relatorios/RelatorioCurvaAbc';

interface SearchParams {
  data_de?:   string;
  data_ate?:  string;
  criterio?:  string;
  secao_id?:  string;
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

const CRITERIOS_VALIDOS: CriterioCurvaAbc[] = ['receita', 'lucro', 'custo', 'qtd'];

const empty: CurvaAbcResponse = {
  CodStatus: 1, periodo: '', criterio: 'receita', dados: [], Count: 0,
  total_qtd: 0, total_receita: 0, total_custo: 0, total_lucro: 0,
  resumo_a: { produtos: 0, receita: 0 },
  resumo_b: { produtos: 0, receita: 0 },
  resumo_c: { produtos: 0, receita: 0 },
};

const emptySecoes: SecaoResponse = { dados: [], Count: 0 };

export default async function RelatorioCurvaAbcPage({ searchParams }: { searchParams: SearchParams }) {
  const filial   = getFilial();
  const dataDe   = searchParams.data_de  || primeiroDiaMes();
  const dataAte  = searchParams.data_ate || ultimoDiaMes();
  const criterio = CRITERIOS_VALIDOS.includes(searchParams.criterio as CriterioCurvaAbc)
    ? (searchParams.criterio as CriterioCurvaAbc)
    : 'receita';

  const [res, secoesRes] = await Promise.all([
    apiFetch<CurvaAbcResponse>(
      `/api/petshop/relatorios/curva-abc${qs({
        filial, data_de: dataDe, data_ate: dataAte, criterio,
        secao_id: searchParams.secao_id || undefined,
      })}`,
    ).catch((e) => ({ ...empty, CodStatus: -1, DescricaoStatus: String(e?.message ?? 'Erro ao conectar com o servidor.') })),

    apiFetch<SecaoResponse>(`/api/petshop/secoes${qs({ filial, limit: 500 })}`).catch(() => emptySecoes),
  ]);

  // Backend pode responder 200 com CodStatus de erro (ex: SQL, endpoint
  // ainda nao recompilado) sem os campos resumo_a/b/c — normaliza aqui pra
  // nao quebrar o componente, mantendo a mensagem de erro pra exibir.
  const dados: CurvaAbcResponse = res && res.CodStatus === 1
    ? res
    : { ...empty, CodStatus: res?.CodStatus ?? -1, DescricaoStatus: res?.DescricaoStatus ?? 'Erro ao carregar relatório.' };

  return (
    <RelatorioCurvaAbc
      dados={dados}
      dataDe={dataDe}
      dataAte={dataAte}
      criterio={criterio}
      secoes={secoesRes.dados}
      secaoId={searchParams.secao_id || ''}
    />
  );
}
