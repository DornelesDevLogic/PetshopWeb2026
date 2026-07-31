import { apiFetch, getFilial } from '@/lib/api';
import { AgendaDetalhe, AgendaItensResponse } from '@/types/petshop';
import AgendaDetalheView from '@/components/petshop/agenda/AgendaDetalheView';
import { notFound } from 'next/navigation';

interface Props {
  params:       { id: string };
  searchParams: { aviso?: string };
}

export default async function AgendaDetalhePage({ params, searchParams }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const emptyItens: AgendaItensResponse = {
    agenda_id: id, dados: [], Count: 0, StartsAt: '', EndsAt: '',
  };

  const [detalhe, itensRes] = await Promise.all([
    apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe?id=${id}&filial=${getFilial()}`,
    ).catch(() => null),

    apiFetch<AgendaItensResponse>(
      `/api/petshop/agenda/itens?id=${id}&filial=${getFilial()}`,
    ).catch(() => emptyItens),
  ]);

  if (!detalhe || detalhe.CodStatus === -5) notFound();

  return (
    <AgendaDetalheView
      detalhe={detalhe}
      itens={itensRes.dados}
      avisosProdutos={searchParams.aviso === 'produtos'}
    />
  );
}
