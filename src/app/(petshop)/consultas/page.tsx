import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ConsultaResponse, ProfissionalResponse } from '@/types/petshop';
import ConsultasView from '@/components/petshop/consultas/ConsultasView';

interface SearchParams {
  data_de?: string;
  data_ate?: string;
  status?: string;
  prof_id?: string;
}

export default async function ConsultasPage({ searchParams }: { searchParams: SearchParams }) {
  const hoje = new Date().toISOString().split('T')[0];
  const dataDe  = searchParams.data_de  || hoje;
  const dataAte = searchParams.data_ate || hoje;
  const status  = searchParams.status   || '';
  const profId  = searchParams.prof_id  || '';

  const emptyList = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [consultasRes, profsRes] = await Promise.all([
    apiFetch<ConsultaResponse>(
      `/api/petshop/consultas${qs({
        filial:   FILIAL,
        data_de:  dataDe,
        data_ate: dataAte,
        status:   status || undefined,
        prof_id:  profId || undefined,
        limit:    200,
      })}`,
    ).catch(() => emptyList),

    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`,
    ).catch(() => emptyList),
  ]);

  return (
    <ConsultasView
      items={consultasRes.dados}
      profissionais={profsRes.dados}
      dataDe={dataDe}
      dataAte={dataAte}
      statusAtual={status}
      profIdAtual={profId}
    />
  );
}
