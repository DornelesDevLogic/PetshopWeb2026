import { notFound } from 'next/navigation';
import { buscarPrevendaDetalhe, buscarItensPreVenda } from '../actions';
import PreVendaDetalheView from '@/components/petshop/prevendas/PreVendaDetalheView';
import EdicaoLockGuard from '@/components/petshop/EdicaoLockGuard';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string }>;
}

export default async function PreVendaDetalhePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ver } = await searchParams;
  const idNum = parseInt(id, 10);
  const somenteVisualizacao = ver === '1';

  const [detalhe, itens] = await Promise.all([
    buscarPrevendaDetalhe(idNum),
    buscarItensPreVenda(idNum),
  ]);

  if (detalhe.CodStatus === -5) return notFound();

  const conteudo = <PreVendaDetalheView prevenda={detalhe} itens={itens.dados} somenteVisualizacao={somenteVisualizacao} />;

  // Modo "só visualizar" não disputa a trava de edição — não adquire lock.
  if (somenteVisualizacao) return conteudo;

  return (
    <EdicaoLockGuard idOrca={idNum} filial={detalhe.filial} voltarHref="/prevendas">
      {conteudo}
    </EdicaoLockGuard>
  );
}
