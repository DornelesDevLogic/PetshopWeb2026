import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ProfissionalResponse, ServicoResponse } from '@/types/petshop';
import NovoAgendamentoForm from '@/components/petshop/agenda/NovoAgendamentoForm';

export default async function NovoAgendamentoPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };

  const [profsRes, servsRes] = await Promise.all([
    apiFetch<ProfissionalResponse>(
      `/api/petshop/profissionais${qs({ filial: FILIAL, limit: 100 })}`,
    ).catch(() => empty),

    apiFetch<ServicoResponse>(
      `/api/petshop/servicos${qs({ filial: FILIAL, limit: 200 })}`,
    ).catch(() => empty),
  ]);

  return (
    <NovoAgendamentoForm
      profissionais={profsRes.dados}
      servicos={servsRes.dados}
    />
  );
}
