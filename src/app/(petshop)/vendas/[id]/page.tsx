import { apiFetch, qs, getFilial } from '@/lib/api';
import { PrevendaDetalhe, PrevendaItensResponse } from '@/types/petshop';
import VendaDetalheView from '@/components/petshop/vendas/VendaDetalheView';
import { notFound } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function VendaDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const [venda, itensRes] = await Promise.all([
    apiFetch<PrevendaDetalhe>(
      `/api/petshop/prevendas/detalhe${qs({ id, filial: getFilial() })}`,
    ).catch(() => null),

    apiFetch<PrevendaItensResponse>(
      `/api/petshop/prevendas/itens${qs({ id, filial: getFilial() })}`,
    ).catch(() => ({ dados: [], Count: 0, StartsAt: '', EndsAt: '' })),
  ]);

  if (!venda || venda.CodStatus === -5) notFound();

  return <VendaDetalheView venda={venda} itens={itensRes.dados} />;
}
