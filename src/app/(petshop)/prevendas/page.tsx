import { buscarPrevendas } from './actions';
import PrevendasView from '@/components/petshop/prevendas/PrevendasView';

interface Props {
  searchParams: Promise<{ status?: string; data_de?: string; data_ate?: string; skip?: string }>;
}

export default async function PrevendasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const skip = parseInt(sp.skip ?? '0', 10);

  const resultado = await buscarPrevendas({
    status:   sp.status,
    data_de:  sp.data_de,
    data_ate: sp.data_ate,
    skip,
  });

  return (
    <PrevendasView
      dados={resultado.dados}
      total={resultado.Count}
      skip={skip}
      filtros={{ status: sp.status, data_de: sp.data_de, data_ate: sp.data_ate }}
    />
  );
}
