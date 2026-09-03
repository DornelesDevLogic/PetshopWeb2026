import { apiFetch, qs, getFilial } from '@/lib/api';
import { CurvaAbcClienteResponse, CriterioCurvaAbcCliente } from '@/types/petshop';
import RelatorioCurvaAbcClientes from '@/components/petshop/relatorios/RelatorioCurvaAbcClientes';

interface SearchParams {
  data_ini?: string;
  data_fim?: string;
  criterio?: string;
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

const CRITERIOS_VALIDOS: CriterioCurvaAbcCliente[] = ['receita', 'qtd'];

const empty: CurvaAbcClienteResponse = {
  CodStatus: 1, periodo: '', criterio: 'receita', dados: [], Count: 0,
  total_receita: 0, total_atendimentos: 0,
  resumo_a: { clientes: 0, receita: 0 },
  resumo_b: { clientes: 0, receita: 0 },
  resumo_c: { clientes: 0, receita: 0 },
};

export default async function RelatorioCurvaAbcClientesPage({ searchParams }: { searchParams: SearchParams }) {
  const filial   = getFilial();
  const dataIni  = searchParams.data_ini || primeiroDiaMes();
  const dataFim  = searchParams.data_fim || ultimoDiaMes();
  const criterio = CRITERIOS_VALIDOS.includes(searchParams.criterio as CriterioCurvaAbcCliente)
    ? (searchParams.criterio as CriterioCurvaAbcCliente)
    : 'receita';

  const res = await apiFetch<CurvaAbcClienteResponse>(
    `/api/petshop/relatorios/curva-abc-clientes${qs({
      filial, data_ini: dataIni, data_fim: dataFim, criterio,
    })}`,
  ).catch((e) => ({ ...empty, CodStatus: -1, DescricaoStatus: String(e?.message ?? 'Erro ao conectar com o servidor.') }));

  // Backend pode responder 200 com CodStatus de erro sem os campos
  // resumo_a/b/c - normaliza aqui pra nao quebrar o componente.
  const dados: CurvaAbcClienteResponse = res && res.CodStatus === 1
    ? res
    : { ...empty, CodStatus: res?.CodStatus ?? -1, DescricaoStatus: res?.DescricaoStatus ?? 'Erro ao carregar relatório.' };

  return (
    <RelatorioCurvaAbcClientes
      dados={dados}
      dataIni={dataIni}
      dataFim={dataFim}
      criterio={criterio}
    />
  );
}
