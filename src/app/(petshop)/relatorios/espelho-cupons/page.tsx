import { apiFetch, qs, getFilial } from '@/lib/api';
import { VendedorResponse } from '@/types/petshop';
import RelatorioEspelhoCupons, { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';

interface SearchParams {
  data_de?:       string;
  data_ate?:      string;
  numero_cupom?:  string;
  cliente_id?:    string;
  cliente_nome?:  string;
  vendedor_id?:   string;
  modelo?:        string;
  caixa?:         string;
  situacao?:      string;
}

function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

// Espelho de Cupons — equivalente à tela "Espelho das Vendas" da Retaguarda
// (UPesquisaAgrupRetag.pas): lista os cupons/NFC-e emitidos no período.
export default async function EspelhoCuponsPage({ searchParams }: { searchParams: SearchParams }) {
  const filial = getFilial();

  const dataDe  = searchParams.data_de  || hojeISO();
  const dataAte = searchParams.data_ate || hojeISO();
  const situacao = searchParams.situacao || 'nao_cancelados';

  const [cuponsRes, vendRes] = await Promise.all([
    apiFetch<{ dados: CupomEspelho[]; Count: number }>(
      `/api/petshop/relatorios/espelho-cupons${qs({
        filial,
        data_de:       dataDe,
        data_ate:      dataAte,
        numero_cupom:  searchParams.numero_cupom || undefined,
        cliente_id:    searchParams.cliente_id   || undefined,
        vendedor_id:   searchParams.vendedor_id  || undefined,
        modelo:        searchParams.modelo       || undefined,
        caixa:         searchParams.caixa        || undefined,
        situacao,
      })}`,
    ).catch(() => ({ dados: [] as CupomEspelho[], Count: 0 })),

    apiFetch<VendedorResponse>(`/api/petshop/vendedores${qs({ filial, limit: 200 })}`).catch(() => empty),
  ]);

  return (
    <RelatorioEspelhoCupons
      cupons={cuponsRes.dados}
      vendedores={vendRes.dados}
      filial={filial}
      filtros={{
        dataDe, dataAte,
        numeroCupom: searchParams.numero_cupom || '',
        clienteId:   searchParams.cliente_id   || '',
        clienteNome: searchParams.cliente_nome || '',
        vendedorId:  searchParams.vendedor_id  || '',
        modelo:      searchParams.modelo       || '',
        caixa:       searchParams.caixa        || '',
        situacao,
      }}
    />
  );
}
