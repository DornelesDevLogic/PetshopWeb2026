import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ProfissionalResponse } from '@/types/petshop';
import NovaConsultaForm from '@/components/petshop/consultas/NovaConsultaForm';

export default async function NovaConsultaPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const profsRes = await apiFetch<ProfissionalResponse>(
    `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`,
  ).catch(() => empty);

  return <NovaConsultaForm profissionais={profsRes.dados} />;
}
