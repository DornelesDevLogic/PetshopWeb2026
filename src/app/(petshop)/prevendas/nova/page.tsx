import NovaPreVendaForm from '@/components/petshop/prevendas/NovaPreVendaForm';
import { buscarVendedores } from '@/app/(petshop)/vendedores/actions';

export default async function NovaPreVendaPage() {
  const vendedores = await buscarVendedores();
  return <NovaPreVendaForm vendedores={vendedores} />;
}
