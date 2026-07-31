import { apiFetch, qs, getFilial } from '@/lib/api';
import { ProfissionalResponse, VendedorResponse, ServicoResponse } from '@/types/petshop';
import RelatorioAtendimentos, { ItemRelatorioAgenda } from '@/components/petshop/relatorios/RelatorioAtendimentos';

interface SearchParams {
  data_de?:           string;
  data_fim?:          string;
  atendente_id?:      string;
  situacao?:          string;
  cliente_id?:        string;
  cliente_nome?:      string;
  tipo_servico?:      string;
  somente_baixadas?:  string;
  secao?:             string;
  grupo?:             string;
  produto?:           string;
  vet_id?:            string;
}

function primeiroDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

// Relatório de Agendas — mesmos filtros e granularidade (1 linha por item/
// produto lançado na agenda) do sistema legado Urelat_agenda.pas.
export default async function RelatorioAtendimentosPage({ searchParams }: { searchParams: SearchParams }) {
  const filial = getFilial();

  const dataDe  = searchParams.data_de  || primeiroDiaMes();
  const dataFim = searchParams.data_fim || hojeISO();

  const [relRes, profRes, vendRes, servRes] = await Promise.all([
    apiFetch<{ dados: ItemRelatorioAgenda[]; Count: number }>(
      `/api/petshop/relatorios/agendas-detalhado${qs({
        filial,
        data_de:          dataDe,
        data_fim:         dataFim,
        atendente_id:     searchParams.atendente_id     || undefined,
        situacao:         searchParams.situacao          || undefined,
        cliente_id:       searchParams.cliente_id        || undefined,
        tipo_servico:     searchParams.tipo_servico      || undefined,
        somente_baixadas: searchParams.somente_baixadas  || undefined,
        secao:            searchParams.secao             || undefined,
        grupo:            searchParams.grupo             || undefined,
        produto:          searchParams.produto           || undefined,
        vet_id:           searchParams.vet_id             || undefined,
      })}`,
    ).catch(() => ({ dados: [] as ItemRelatorioAgenda[], Count: 0 })),

    apiFetch<ProfissionalResponse>(`/api/petshop/profissionais${qs({ filial, limit: 500 })}`).catch(() => empty),
    apiFetch<VendedorResponse>(`/api/petshop/vendedores${qs({ filial, limit: 200 })}`).catch(() => empty),
    apiFetch<ServicoResponse>(`/api/petshop/servicos${qs({ filial, limit: 200 })}`).catch(() => empty),
  ]);

  const profissionaisAtivos = profRes.dados.filter((p) => p.status_ativo !== 1);

  return (
    <RelatorioAtendimentos
      itens={relRes.dados}
      profissionais={profissionaisAtivos}
      vendedores={vendRes.dados}
      servicos={servRes.dados}
      filtros={{
        dataDe, dataFim,
        atendenteId:     searchParams.atendente_id    || '',
        situacao:        searchParams.situacao         || '',
        clienteId:       searchParams.cliente_id       || '',
        clienteNome:     searchParams.cliente_nome     || '',
        tipoServico:     searchParams.tipo_servico     || '',
        somenteBaixadas: searchParams.somente_baixadas === '1',
        secao:           searchParams.secao            || '',
        grupo:           searchParams.grupo            || '',
        produto:         searchParams.produto          || '',
        vetId:           searchParams.vet_id           || '',
      }}
    />
  );
}
