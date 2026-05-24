import { apiFetch, qs, FILIAL } from '@/lib/api';
import { PrevendaResponse } from '@/types/petshop';
import VendasView from '@/components/petshop/vendas/VendasView';

interface SearchParams {
  data_de?: string;
  data_ate?: string;
  status?:  string;
}

export default async function VendasPage({ searchParams }: { searchParams: SearchParams }) {
  const hoje   = new Date().toISOString().split('T')[0];
  const dataDe  = searchParams.data_de  || hoje;
  const dataAte = searchParams.data_ate || hoje;
  const status  = searchParams.status   || '';

  const emptyList = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const res = await apiFetch<PrevendaResponse>(
    `/api/petshop/prevendas${qs({
      filial:   FILIAL,
      data_de:  dataDe,
      data_ate: dataAte,
      status:   status || undefined,
      limit:    200,
    })}`,
  ).catch(() => emptyList);

  return (
    <VendasView
      items={res.dados}
      dataDe={dataDe}
      dataAte={dataAte}
      statusAtual={status}
    />
  );
}
