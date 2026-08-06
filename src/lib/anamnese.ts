/**
 * Metadados da Anamnese — fonte de verdade única compartilhada entre a tela de
 * Configuração (Fase 2) e a tela de Consulta (Fase 3).
 *
 * Reproduz fielmente a estrutura do sistema legado (UConsulta_vet / Uconfig2):
 *  - 1 grupo "Geral" (sempre visível) + 12 grupos configuráveis por ABA_*.
 *  - Cada grupo configurável tem: flag de exibição (aba_*), obrigatoriedade
 *    (*_obrigatorio) e padrão de impressão (def_imp_*) na tabela PET_CONFIG_ANAMNESE.
 *  - Os lookups (combos) usam os mesmos índices/opções do legado.
 *
 * Regra mestre (CONFIG.PET_ANAMNESE_RESUMIDO, exposto como `anamnese_resumido`):
 *   1 = "Anamnese Completa = Sim" → todos os grupos; ABA_* oculta individualmente.
 *   0 = "Anamnese Completa = Não" → modo resumido: só Geral + diag/prog/prescrição.
 */

import { ConfigAnamnese } from '@/types/petshop';

export type AnamneseInputType = 'memo' | 'text' | 'number' | 'select';

export interface AnamneseLookupOption {
  value: number;
  label: string;
}

export interface AnamneseField {
  /** chave JSON do campo na consulta (casa com ConsultaDetalhe) */
  key:     string;
  label:   string;
  type:    AnamneseInputType;
  options?: AnamneseLookupOption[];
  /** ocupa a linha inteira do grid (memos geralmente) */
  full?:   boolean;
  /** limite de caracteres do campo no banco (colunas VARCHAR curtas do
   * legado, ex.: DIAGNOSTIC_PROVISORIO tem só 60) — sem isso, salvar dá
   * erro de SQL "Data too large" em vez de avisar o usuário. */
  maxLength?: number;
}

export interface AnamneseGroup {
  /** identificador do grupo (achados, ausculacao, ...) */
  key:    string;
  label:  string;
  /** grupo sempre visível (Geral) não tem flags de aba */
  always?: boolean;
  /** chaves na ConfigAnamnese — ausentes no grupo Geral */
  abaKey?:   keyof ConfigAnamnese;
  obrigKey?: keyof ConfigAnamnese;
  impKey?:   keyof ConfigAnamnese;
  /** grupos que compõem o "modo resumido" (anamnese_resumido = 0) */
  resumido?: boolean;
  fields: AnamneseField[];
}

// ── Opções dos combos (índices idênticos ao legado) ──────────────────────────
export const LK_EVOLUCAO: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Não Melhorou' },
  { value: 2, label: 'Piorou' },
  { value: 3, label: 'Melhorou' },
];

export const LK_ESTADO_CORPORAL: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Caquético' },
  { value: 2, label: 'Magro' },
  { value: 3, label: 'Normal' },
  { value: 4, label: 'Sobrepeso' },
  { value: 5, label: 'Obeso' },
];

export const LK_COMPORTAMENTO: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Dócil' },
  { value: 2, label: 'Agressivo' },
  { value: 3, label: 'Inquieto' },
];

export const LK_MUCOSAS: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Normocoradas' },
  { value: 2, label: 'Congestas' },
  { value: 3, label: 'Hipocoradas' },
  { value: 4, label: 'Perláceas' },
  { value: 5, label: 'Cianóticas' },
];

export const LK_NIVEL_CONSCIENCIA: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Alerta' },
  { value: 2, label: 'Deprimido' },
  { value: 3, label: 'Estupor' },
  { value: 4, label: 'Coma' },
];

export const LK_PULSO: AnamneseLookupOption[] = [
  { value: 0, label: 'Não Definido' },
  { value: 1, label: 'Forte' },
  { value: 2, label: 'Fraco' },
  { value: 3, label: 'Filiforme' },
  { value: 4, label: 'Regular' },
  { value: 5, label: 'Irregular' },
];

// ── Grupos ───────────────────────────────────────────────────────────────────
export const GRUPOS_ANAMNESE: AnamneseGroup[] = [
  {
    key: 'geral',
    label: 'Geral',
    always: true,
    fields: [
      { key: 'evolucao_quadro',   label: 'Evolução do Quadro', type: 'select', options: LK_EVOLUCAO },
      { key: 'estado_corporal',   label: 'Estado Corporal',    type: 'select', options: LK_ESTADO_CORPORAL },
      { key: 'freq_cardiaca',     label: 'Freq. Cardíaca (Bpm)',      type: 'number' },
      { key: 'freq_respiratoria', label: 'Freq. Resp. (FR/min)',      type: 'number' },
      { key: 'exame_tpc',         label: 'T.P.C (Seg)',               type: 'number' },
      { key: 'exame_lfn',         label: 'L.F.N',                     type: 'text', maxLength: 100 },
      { key: 'hidratacao',        label: 'Hidratação',                type: 'text', maxLength: 100 },
      { key: 'pressao_arterial',  label: 'Pressão Arterial',          type: 'text', maxLength: 100 },
      { key: 'pulso_arterial',    label: 'Pulso Arterial', type: 'select', options: LK_PULSO },
      { key: 'comportamento',     label: 'Comportamento',  type: 'select', options: LK_COMPORTAMENTO },
      { key: 'mucosas',           label: 'Mucosas',        type: 'select', options: LK_MUCOSAS },
      { key: 'nivel_consciencia', label: 'Nível de Consciência', type: 'select', options: LK_NIVEL_CONSCIENCIA },
      { key: 'convenio',          label: 'Convênio',       type: 'text', maxLength: 40 },
      { key: 'obs_gerais',        label: 'Observações Gerais',  type: 'memo', full: true },
      { key: 'texto',             label: 'Resumo Anamnese Geral', type: 'memo', full: true },
    ],
  },
  {
    key: 'achados', label: 'Achados',
    abaKey: 'aba_achados', obrigKey: 'achados_obrigatorio', impKey: 'def_imp_achados',
    fields: [
      { key: 'dentes',  label: 'Dentes',  type: 'memo', full: true },
      { key: 'olhos',   label: 'Olhos',   type: 'memo', full: true },
      { key: 'ouvidos', label: 'Ouvidos', type: 'memo', full: true },
    ],
  },
  {
    key: 'ausculacao', label: 'Ausculação',
    abaKey: 'aba_ausculacao', obrigKey: 'ausculacao_obrigatorio', impKey: 'def_imp_ausculacao',
    fields: [
      { key: 'coracao',        label: 'Coração', type: 'memo', full: true },
      { key: 'pulmao',         label: 'Pulmão',  type: 'memo', full: true },
      { key: 'fetal',          label: 'Fetal',   type: 'memo', full: true },
      { key: 'obs_ausculacao', label: 'Observações Ausculação', type: 'memo', full: true },
    ],
  },
  {
    key: 'fezes', label: 'Fezes',
    abaKey: 'aba_fezes', obrigKey: 'fezes_obrigatorio', impKey: 'def_imp_fezes',
    fields: [
      { key: 'fezes_odor',         label: 'Odor',         type: 'text', maxLength: 20 },
      { key: 'fezes_consistencia', label: 'Consistência', type: 'text', maxLength: 30 },
      { key: 'fezes_aparencia',    label: 'Aparência',    type: 'memo', full: true },
      { key: 'fezes_parasitas',    label: 'Parasitas',    type: 'memo', full: true },
      { key: 'fezes_obs',          label: 'Observações Fezes', type: 'memo', full: true },
    ],
  },
  {
    key: 'urina', label: 'Urina',
    abaKey: 'aba_urina', obrigKey: 'urina_obrigatorio', impKey: 'def_imp_urina',
    fields: [
      { key: 'uri_odor',    label: 'Odor',         type: 'text', maxLength: 15 },
      { key: 'uri_miccao',  label: 'Micção',       type: 'text', maxLength: 20 },
      { key: 'uri_aspecto', label: 'Aspecto',      type: 'memo', full: true },
      { key: 'uri_obs',     label: 'Observação Urina', type: 'memo', full: true },
    ],
  },
  {
    key: 'alimentacao', label: 'Alimentação',
    abaKey: 'aba_alimentacao', obrigKey: 'alimentacao_obrigatorio', impKey: 'def_imp_aliment',
    fields: [
      { key: 'aliment_tipo',       label: 'Alimentação',  type: 'text', maxLength: 30 },
      { key: 'aliment_frequencia', label: 'Frequência',   type: 'memo', full: true },
      { key: 'aliment_quantidade', label: 'Quantidade',   type: 'memo', full: true },
      { key: 'aliment_obs',        label: 'Observações Alimentação', type: 'memo', full: true },
    ],
  },
  {
    key: 'habitat', label: 'Habitat',
    abaKey: 'aba_habitat', obrigKey: 'habitat_obrigatorio', impKey: 'def_imp_habitat',
    fields: [
      { key: 'habitat_local',       label: 'Local',       type: 'text', maxLength: 30 },
      { key: 'habitat_convivencia', label: 'Convivência', type: 'text', maxLength: 30 },
      { key: 'habitat_obs',         label: 'Observação Habitat', type: 'memo', full: true },
    ],
  },
  {
    key: 'pele', label: 'Pele',
    abaKey: 'aba_pele', obrigKey: 'pele_obrigatorio', impKey: 'def_imp_pele',
    fields: [
      { key: 'pele_pelos',         label: 'Pelos',        type: 'text', maxLength: 20 },
      { key: 'pele_ectoparasitas', label: 'Ectoparasitas',type: 'text', maxLength: 20 },
      { key: 'pele_obs',           label: 'Observações Pele', type: 'memo', full: true },
    ],
  },
  {
    key: 'nariz', label: 'Nariz',
    abaKey: 'aba_nariz', obrigKey: 'nariz_obrigatorio', impKey: 'def_imp_nariz',
    fields: [
      { key: 'nariz', label: 'Observação Nariz', type: 'memo', full: true },
    ],
  },
  {
    key: 'membros', label: 'Membros',
    abaKey: 'aba_membros', obrigKey: 'membros_obrigatorio', impKey: 'def_imp_membros',
    fields: [
      { key: 'membros', label: 'Observações Membros', type: 'memo', full: true },
    ],
  },
  {
    key: 'diagnostico', label: 'Diagnóstico',
    abaKey: 'aba_diagnostico', obrigKey: 'diagnostico_obrigatorio', impKey: 'def_imp_diagnostico',
    resumido: true,
    fields: [
      { key: 'diagnostico',         label: 'Diagnóstico Provisório', type: 'text', maxLength: 60 },
      { key: 'diagnostico_obs',     label: 'Observações Diagnóstico Provisório', type: 'memo', full: true },
      { key: 'diagnostico_def',     label: 'Diagnóstico Definitivo', type: 'text', maxLength: 60 },
      { key: 'diagnostico_def_obs', label: 'Observações Diagnóstico Definitivo', type: 'memo', full: true },
    ],
  },
  {
    key: 'prognostico', label: 'Prognóstico',
    abaKey: 'aba_prognostico', obrigKey: 'prognostico_obrigatorio', impKey: 'def_imp_prognostico',
    resumido: true,
    fields: [
      { key: 'prognostico',     label: 'Prognóstico', type: 'text', maxLength: 25 },
      { key: 'prognostico_obs', label: 'Observações Prognóstico', type: 'memo', full: true },
    ],
  },
  {
    key: 'prescricao', label: 'Prescrição',
    abaKey: 'aba_prescricao', obrigKey: 'prescricao_obrigatorio', impKey: 'def_imp_prescricao',
    resumido: true,
    fields: [
      { key: 'prescricao', label: 'Prescrição de Medicamento', type: 'memo', full: true },
    ],
  },
];

/** Apenas os 12 grupos configuráveis (exclui Geral). Ordem = exibição no legado. */
export const GRUPOS_CONFIGURAVEIS = GRUPOS_ANAMNESE.filter((g) => !g.always);

/**
 * Decide quais grupos aparecem na consulta conforme a configuração.
 * - anamnese_resumido = 0 (Completa=Não): Geral + grupos marcados `resumido`.
 * - anamnese_resumido = 1 (Completa=Sim): Geral + grupos com aba_* = 1.
 */
export function gruposVisiveis(cfg: ConfigAnamnese | null): AnamneseGroup[] {
  if (!cfg) return GRUPOS_ANAMNESE.filter((g) => g.always || g.resumido);
  const completo = cfg.anamnese_resumido === 1;
  return GRUPOS_ANAMNESE.filter((g) => {
    if (g.always) return true;
    if (!completo) return !!g.resumido;
    return g.abaKey ? cfg[g.abaKey] === 1 : false;
  });
}
