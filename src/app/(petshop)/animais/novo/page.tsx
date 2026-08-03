import { apiFetch, qs, getFilial } from '@/lib/api';
import { EspecieResponse, RacaResponse, TipoPeloResponse } from '@/types/petshop';
import NovoAnimalDialog from '@/components/petshop/animais/NovoAnimalDialog';

export default async function NovoAnimalPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [especiesRes, racasRes, pelosRes] = await Promise.all([
    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
    apiFetch<RacaResponse>(
      `/api/petshop/racas${qs({ filial: getFilial(), limit: 3000 })}`,
    ).catch(() => empty),
    apiFetch<TipoPeloResponse>(
      `/api/petshop/tipos-pelo${qs({ filial: getFilial(), limit: 200 })}`,
    ).catch(() => empty),
  ]);

  return (
    <NovoAnimalDialog modoInline
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
    />
  );
}

