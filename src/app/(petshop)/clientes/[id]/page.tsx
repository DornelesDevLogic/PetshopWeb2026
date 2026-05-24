import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  ClienteResponse,
  AnimalResponse,
  EspecieResponse,
  RacaResponse,
  TipoPeloResponse,
} from '@/types/petshop';
import ClienteDetalhe from '@/components/petshop/clientes/ClienteDetalhe';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function ClienteDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  // Busca em paralelo: cliente, animais e lookups para o form de novo animal
  const [cliRes, animaisRes, especiesRes, racasRes, pelosRes] = await Promise.all([
    apiFetch<ClienteResponse>(
      `/api/petshop/clientes?limit=1&filter1=s.COD_CLI=${id}`,
    ).catch(() => empty),

    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({ filial: FILIAL, limit: 100, filter1: `a.PET_FK_ID_CLIENTE=${id}` })}`,
    ).catch(() => empty),

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

  const cliente = cliRes.dados[0];
  if (!cliente) notFound();

  return (
    <ClienteDetalhe
      cliente={cliente}
      animais={animaisRes.dados}
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
    />
  );
}
