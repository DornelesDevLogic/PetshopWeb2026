import NovaTeleEntregaForm from '@/components/petshop/tele-entregas/NovaTeleEntregaForm';
import { buscarVendedores } from '@/app/(petshop)/vendedores/actions';
import { getUsuarioLogado } from '@/lib/session';

export default async function NovaTeleEntregaPage() {
  const vendedores = await buscarVendedores();
  const usuario = getUsuarioLogado();
  return (
    <NovaTeleEntregaForm
      vendedores={vendedores}
      vendedorInicial={usuario?.vendedor_id || undefined}
      vendedorFilialInicial={usuario?.vendedor_filial || undefined}
    />
  );
}
