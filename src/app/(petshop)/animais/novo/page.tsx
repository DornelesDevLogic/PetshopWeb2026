import { apiFetch, qs, FILIAL } from '@/lib/api';
import { EspecieResponse, RacaResponse, TipoPeloResponse } from '@/types/petshop';
import NovoAnimalForm from '@/components/petshop/animais/NovoAnimalForm';

export default async function NovoAnimalPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [especiesRes, racasRes, pelosRes] = await Promise.all([
    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: FILIAL, limit: 500 })}`,
    ).catch(() => empty),
    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
  ]);

  return (
    <NovoAnimalForm
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
    />
  );
}
