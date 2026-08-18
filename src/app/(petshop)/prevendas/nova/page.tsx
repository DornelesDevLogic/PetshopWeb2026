import NovaPreVendaForm from '@/components/petshop/prevendas/NovaPreVendaForm';
import { buscarVendedores } from '@/app/(petshop)/vendedores/actions';
import { getUsuarioLogado } from '@/lib/session';

export default async function NovaPreVendaPage() {
  const vendedores = await buscarVendedores();
  const usuario = getUsuarioLogado();
  return (
    <NovaPreVendaForm
      vendedores={vendedores}
      vendedorInicial={usuario?.vendedor_id || undefined}
      vendedorFilialInicial={usuario?.vendedor_filial || undefined}
    />
  );
}
