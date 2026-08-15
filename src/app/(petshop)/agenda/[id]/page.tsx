import { apiFetch, getFilial } from '@/lib/api';
import { isSupervisor } from '@/lib/session';
import { AgendaDetalhe, AgendaItensResponse } from '@/types/petshop';
import AgendaDetalheView from '@/components/petshop/agenda/AgendaDetalheView';
import { notFound } from 'next/navigation';
import ErroCarregarDados from '@/components/petshop/ErroCarregarDados';

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

  // Erro de conexao/backend (ex: 429 do rate limiter sob carga) nao pode
  // virar "404 nao encontrada" — mascara o problema real (ver mesmo bug
  // corrigido em consultas/[id]/page.tsx). So' notFound() de verdade quando
  // o backend confirma CodStatus -5.
  let detalhe: AgendaDetalhe;
  try {
    detalhe = await apiFetch<AgendaDetalhe>(
      `/api/petshop/agenda/detalhe?id=${id}&filial=${getFilial()}`,
    );
  } catch (e) {
    return (
      <ErroCarregarDados
        mensagem={e instanceof Error ? e.message : 'Erro desconhecido ao buscar os dados da agenda.'}
        retryHref={`/agenda/${id}`}
        voltarHref="/agenda"
        voltarLabel="Voltar para Agenda"
      />
    );
  }

  if (detalhe.CodStatus === -5) notFound();

  const itensRes = await apiFetch<AgendaItensResponse>(
    `/api/petshop/agenda/itens?id=${id}&filial=${getFilial()}`,
  ).catch(() => emptyItens);

  return (
    <AgendaDetalheView
      detalhe={detalhe}
      itens={itensRes.dados}
      avisosProdutos={searchParams.aviso === 'produtos'}
      ehSupervisor={isSupervisor()}
    />
  );
}
