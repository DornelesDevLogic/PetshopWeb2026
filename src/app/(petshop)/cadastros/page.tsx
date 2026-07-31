import { apiFetch, qs, getFilial } from '@/lib/api';
import {
  EspecieResponse, RacaResponse, TipoPeloResponse,
  ServicoResponse, ProfissionalResponse,
  VacinaCatalogoResponse, MedicamentoResponse, CategoriaServicoResponse,
} from '@/types/petshop';
import CadastrosView from '@/components/petshop/cadastros/CadastrosView';

export default async function CadastrosPage() {
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const q = qs({ filial: getFilial(), limit: 300 });

  const [
    especiesRes, racasRes, pelosRes,
    servicosRes, profsRes,
    vacinasRes, medicRes, categoriasRes,
  ] = await Promise.all([
    apiFetch<EspecieResponse>(`/api/petshop/especies${q}`).catch(() => empty),
    apiFetch<RacaResponse>(`/api/petshop/racas${q}`).catch(() => empty),
    apiFetch<TipoPeloResponse>(`/api/petshop/tipos-pelo${q}`).catch(() => empty),
    apiFetch<ServicoResponse>(`/api/petshop/servicos${q}`).catch(() => empty),
    apiFetch<ProfissionalResponse>(`/api/petshop/profissionais${q}`).catch(() => empty),
    apiFetch<VacinaCatalogoResponse>(`/api/petshop/vacinas${q}`).catch(() => empty),
    apiFetch<MedicamentoResponse>(`/api/petshop/medicamentos${q}`).catch(() => empty),
    apiFetch<CategoriaServicoResponse>(`/api/petshop/categoria-servico${q}`).catch(() => empty),
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
      categoriasServico={categoriasRes.dados}
    />
  );
}
