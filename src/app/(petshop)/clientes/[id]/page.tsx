import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ClienteResponse, AnimalResponse } from '@/types/petshop';
import ClienteDetalhe from '@/components/petshop/clientes/ClienteDetalhe';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function ClienteDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  // filter1 com SQL literal — sem encodeURIComponent no valor para preservar o '='
  const [cliRes, animaisRes] = await Promise.all([
    apiFetch<ClienteResponse>(
      `/api/petshop/clientes?limit=1&filter1=s.COD_CLI=${id}`,
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' })),

    apiFetch<AnimalResponse>(
      `/api/petshop/animais${qs({
        filial: FILIAL,
        limit: 100,
        filter1: `a.PET_FK_ID_CLIENTE=${id}`,
      })}`,
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' })),
  ]);

  const cliente = cliRes.dados[0];
  if (!cliente) notFound();

  return <ClienteDetalhe cliente={cliente} animais={animaisRes.dados} />;
}
