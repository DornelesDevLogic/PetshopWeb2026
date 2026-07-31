import { buscarPrevendas } from './actions';
import PrevendasView from '@/components/petshop/prevendas/PrevendasView';

interface Props {
  searchParams: Promise<{ status?: string; data_de?: string; data_ate?: string; skip?: string }>;
}

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function PrevendasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const skip = parseInt(sp.skip ?? '0', 10);

  // Padrão: só o dia de HOJE (evita carregar toda a base e travar).
  const dataDe  = sp.data_de  ?? hojeISO();
  const dataAte = sp.data_ate ?? hojeISO();

  const resultado = await buscarPrevendas({
    status:   sp.status,
    data_de:  dataDe,
    data_ate: dataAte,
    skip,
  });

  return (
    <PrevendasView
      dados={resultado.dados}
      total={resultado.Count}
      skip={skip}
      filtros={{ status: sp.status, data_de: dataDe, data_ate: dataAte }}
    />
  );
}
