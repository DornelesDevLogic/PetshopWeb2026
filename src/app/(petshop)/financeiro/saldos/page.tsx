import { apiFetch, qs, FILIAL } from '@/lib/api';
import { SaldoResponse } from '@/types/petshop';
import SaldosView from '@/components/petshop/financeiro/SaldosView';

export default async function SaldosPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const res = await apiFetch<SaldoResponse>(
    `/api/petshop/financeiro/saldos${qs({ filial: FILIAL, limit: 500 })}`,
  ).catch(() => empty);

  return <SaldosView saldos={res.dados} />;
}
