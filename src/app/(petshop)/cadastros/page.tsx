import { apiFetch, qs, FILIAL } from '@/lib/api';
import {
  EspecieResponse, RacaResponse, TipoPeloResponse,
  ServicoResponse, ProfissionalResponse,
  VacinaCatalogoResponse, MedicamentoResponse,
} from '@/types/petshop';
import CadastrosView from '@/components/petshop/cadastros/CadastrosView';

export default async function CadastrosPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const q = qs({ filial: FILIAL, limit: 300 });

  const [
    especiesRes, racasRes, pelosRes,
    servicosRes, profsRes,
    vacinasRes, medicRes,
  ] = await Promise.all([
    apiFetch<EspecieResponse>(`/api/petshop/especies${q}`).catch(() => empty),
    apiFetch<RacaResponse>(`/api/petshop/racas${q}`).catch(() => empty),
    apiFetch<TipoPeloResponse>(`/api/petshop/tipos-pelo${q}`).catch(() => empty),
    apiFetch<ServicoResponse>(`/api/petshop/servicos${q}`).catch(() => empty),
    apiFetch<ProfissionalResponse>(`/api/petshop/profissionais${q}`).catch(() => empty),
    apiFetch<VacinaCatalogoResponse>(`/api/petshop/vacinas${q}`).catch(() => empty),
    apiFetch<MedicamentoResponse>(`/api/petshop/medicamentos${q}`).catch(() => empty),
  ]);

  return (
    <CadastrosView
      especies={especiesRes.dados}
      racas={racasRes.dados}
      pelos={pelosRes.dados}
      servicos={servicosRes.dados}
      profissionais={profsRes.dados}
      vacinas={vacinasRes.dados}
      medicamentos={medicRes.dados}
    />
  );
}
