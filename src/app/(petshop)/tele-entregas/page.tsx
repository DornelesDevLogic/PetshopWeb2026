import { buscarTeleEntregas } from './actions';
import TeleEntregasView from '@/components/petshop/tele-entregas/TeleEntregasView';

interface Props {
  searchParams: {
    busca?:    string;
    status?:   string;
    data_de?:  string;
    data_ate?: string;
    skip?:     string;
  };
}

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async function TeleEntregasPage({ searchParams }: Props) {
  const skip = Number(searchParams.skip ?? 0);
  const buscando = !!searchParams.busca?.trim();

  // Padrão: só o dia de HOJE (evita varrer toda a base e travar). Ao buscar por
  // cliente, não força data (procura em qualquer período).
  const dataDe  = searchParams.data_de  ?? (buscando ? '' : hojeISO());
  const dataAte = searchParams.data_ate ?? (buscando ? '' : hojeISO());

  const res = await buscarTeleEntregas({
    busca:    searchParams.busca,
    status:   searchParams.status,
    data_de:  dataDe || undefined,
    data_ate: dataAte || undefined,
    skip,
    limit: 100,
  });

  return (
    <TeleEntregasView
      entregas={res.dados ?? []}
      total={res.Count ?? 0}
      filtros={{
        busca:    searchParams.busca  ?? '',
        status:   searchParams.status ?? '',
        data_de:  dataDe,
        data_ate: dataAte,
        skip,
      }}
    />
  );
}
