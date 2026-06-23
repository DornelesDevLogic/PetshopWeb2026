import { notFound } from 'next/navigation';
import { buscarPrevendaDetalhe, buscarItensPreVenda } from '../actions';
import PreVendaDetalheView from '@/components/petshop/prevendas/PreVendaDetalheView';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PreVendaDetalhePage({ params }: Props) {
  const { id } = await params;
  const idNum = parseInt(id, 10);

  const [detalhe, itens] = await Promise.all([
    buscarPrevendaDetalhe(idNum),
    buscarItensPreVenda(idNum),
  ]);

  if (detalhe.CodStatus === -5) return notFound();

  return <PreVendaDetalheView prevenda={detalhe} itens={itens.dados} />;
}
