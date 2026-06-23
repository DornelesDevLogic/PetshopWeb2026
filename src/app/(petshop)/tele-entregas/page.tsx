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

export default async function TeleEntregasPage({ searchParams }: Props) {
  const skip = Number(searchParams.skip ?? 0);
  const res = await buscarTeleEntregas({
    busca:    searchParams.busca,
    status:   searchParams.status,
    data_de:  searchParams.data_de,
    data_ate: searchParams.data_ate,
    skip,
    limit: 100,
  });

  return (
    <TeleEntregasView
      entregas={res.dados ?? []}
      total={res.Count ?? 0}
      filtros={{
        busca:    searchParams.busca   ?? '',
        status:   searchParams.status  ?? '',
        data_de:  searchParams.data_de ?? '',
        data_ate: searchParams.data_ate ?? '',
        skip,
      }}
    />
  );
}
