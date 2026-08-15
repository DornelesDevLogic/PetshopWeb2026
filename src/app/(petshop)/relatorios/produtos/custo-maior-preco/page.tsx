import { buscarProdutosCustoMaiorPreco } from './actions';
import RelatorioProdutosCustoMaiorPreco from '@/components/petshop/relatorios/RelatorioProdutosCustoMaiorPreco';

export default async function RelatorioProdutosCustoMaiorPrecoPage() {
  const produtos = await buscarProdutosCustoMaiorPreco();

  return <RelatorioProdutosCustoMaiorPreco produtos={produtos} />;
}
