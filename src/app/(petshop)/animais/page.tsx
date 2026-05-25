import { apiFetch, qs, FILIAL } from '@/lib/api';
import { AnimalResponse, EspecieResponse, AniversariantesResponse } from '@/types/petshop';
import AnimaisView from '@/components/petshop/animais/AnimaisView';

interface PageProps {
  searchParams: { mes?: string };
}

export default async function AnimaisPage({ searchParams }: PageProps) {
  const empty     = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const mesAtual  = new Date().getMonth() + 1;
  const mes       = Number(searchParams.mes) || mesAtual;

  const [animaisRes, anivRes, especiesRes] = await Promise.all([
    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: FILIAL, limit: 500, filter1: 'a.ATIVO=1' })}`,
    ).catch(() => empty),

    apiFetch<AniversariantesResponse>(
      `/api/petshop/animais/aniversarios${qs({ filial: FILIAL, mes })}`,
    ).catch(() => ({ mes, dados: [], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<EspecieResponse>(
      `/api/petshop/especies${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
  ]);

  return (
    <AnimaisView
      animais={animaisRes.dados}
      aniversariantes={anivRes.dados}
      especies={especiesRes.dados}
      mes={mes}
    />
  );
}
