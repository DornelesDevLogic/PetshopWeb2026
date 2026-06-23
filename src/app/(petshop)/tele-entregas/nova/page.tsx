import NovaTeleEntregaForm from '@/components/petshop/tele-entregas/NovaTeleEntregaForm';
import { buscarVendedores } from '@/app/(petshop)/vendedores/actions';

export default async function NovaTeleEntregaPage() {
  const vendedores = await buscarVendedores();
  return <NovaTeleEntregaForm vendedores={vendedores} />;
}
