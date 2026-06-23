import { buscarTeleEntregaDetalhe, buscarItensTeleEntrega } from '../actions';
import TeleEntregaDetalheView from '@/components/petshop/tele-entregas/TeleEntregaDetalheView';
import { notFound } from 'next/navigation';

interface Props { params: { id: string } }

export default async function TeleEntregaDetalhePage({ params }: Props) {
  const id = Number(params.id);
  if (!id) notFound();

  const [detalhe, itensRes] = await Promise.all([
    buscarTeleEntregaDetalhe(id).catch(() => null),
    buscarItensTeleEntrega(id).catch(() => ({ dados: [], Count: 0 })),
  ]);

  if (!detalhe || (detalhe as { CodStatus?: number }).CodStatus === -5) notFound();

  return <TeleEntregaDetalheView detalhe={detalhe} itens={itensRes.dados ?? []} />;
}
