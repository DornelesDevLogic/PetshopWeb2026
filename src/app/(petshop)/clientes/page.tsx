import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ClienteResponse } from '@/types/petshop';
import ClientesView from '@/components/petshop/clientes/ClientesView';

interface Props {
  searchParams: { q?: string; situacao?: string; skip?: string };
}

const LIMIT = 50;

export default async function ClientesPage({ searchParams }: Props) {
  const q        = searchParams.q ?? '';
  const situacao = searchParams.situacao ?? '';
  const skip     = Number(searchParams.skip ?? 0);

  // Busca rápida (por texto) ou lista paginada completa
  const endpoint = q.trim()
    ? `/api/petshop/clientes/busca-rapida${qs({ q, filial: FILIAL })}`
    : `/api/petshop/clientes${qs({
        filial:  FILIAL,
        limit:   LIMIT,
        skip,
        // filter1 injeta SQL direto — usamos sem encodeURIComponent no valor
      })}${situacao ? `&filter1=s.SITUACAO='${situacao}'` : ''}`;

  const res = await apiFetch<ClienteResponse>(endpoint).catch(() => ({
    dados: [],
    Count: 0,
    StartsAt: '',
    EndsAt: '',
  }));

  return (
    <ClientesView
      clientes={res.dados}
      total={res.Count}
      qAtual={q}
      situacaoAtual={situacao}
      skipAtual={skip}
      limit={LIMIT}
    />
  );
}
