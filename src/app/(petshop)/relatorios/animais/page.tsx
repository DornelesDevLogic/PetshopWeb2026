import { apiFetch, qs, getFilial } from '@/lib/api';
import { RelatorioAnimaisResponse, RacaResponse } from '@/types/petshop';
import RelatorioAnimais from '@/components/petshop/relatorios/RelatorioAnimais';

interface SearchParams {
  cliente_id?:   string;
  cliente_nome?: string;
  animal_nome?:  string;
  raca_id?:      string;
}

const empty: RelatorioAnimaisResponse = { CodStatus: 1, dados: [], Count: 0 };
const emptyRacas: RacaResponse = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

export default async function RelatorioAnimaisPage({ searchParams }: { searchParams: SearchParams }) {
  const filial = getFilial();

  const [res, racasRes] = await Promise.all([
    apiFetch<RelatorioAnimaisResponse>(
      `/api/petshop/relatorios/animais${qs({
        cliente_id:  searchParams.cliente_id  || undefined,
        animal_nome: searchParams.animal_nome || undefined,
        raca_id:     searchParams.raca_id     || undefined,
      })}`,
    ).catch((e) => ({ ...empty, CodStatus: -1, DescricaoStatus: String(e?.message ?? 'Erro ao conectar com o servidor.') })),

    apiFetch<RacaResponse>(`/api/petshop/racas${qs({ filial, limit: 3000 })}`).catch(() => emptyRacas),
  ]);

  const dados: RelatorioAnimaisResponse = res && res.CodStatus === 1
    ? res
    : { ...empty, CodStatus: res?.CodStatus ?? -1, DescricaoStatus: res?.DescricaoStatus ?? 'Erro ao carregar relatório.' };

  return (
    <RelatorioAnimais
      dados={dados}
      racas={racasRes.dados}
      filtros={{
        clienteId:   searchParams.cliente_id   || '',
        clienteNome: searchParams.cliente_nome || '',
        animalNome:  searchParams.animal_nome  || '',
        racaId:      searchParams.raca_id      || 'todas',
      }}
    />
  );
}
