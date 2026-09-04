/** Envelope padrão GET (lista) */
export interface ApiList<T> {
  StartsAt: string;
  dados: T[];
  Count: number;
  EndsAt: string;
}

/** Envelope padrão escrita */
export interface ApiWrite {
  StartsAt: string;
  CodStatus: number;   // 1=ok, -1=json, -2=validação, -3=sql, -5=not found
  DescricaoStatus: string;
  EndsAt: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

export interface AgendaItem {
  id: number;
  filial: number;
  cliente_id: number;
  cliente: string;
  data: string;        // formato retornado pelo backend (DD/MM/YYYY ou YYYY-MM-DD)
  hora: string;
  status: 1 | 2 | 3 | 4;
  animal_id: number;
  animal: string;
  raca: string;
  prof_id: number;
  profissional: string;
  servico_id: number;
  servico: string;
  valor: string;
  desconto: string;
  sub_total: string;
  obs: string;
  situacao?: string;        // status do atendimento: FINALIZADA, ENCERRADA, etc.
  pago?: string;           // 'S' = pago
  data_previsao?: string;  // "DD/MM/YYYY HH:MM:SS" - início previsto
  data_entrega?: string;   // "DD/MM/YYYY HH:MM:SS" - término previsto
  // Discriminador de tipo de registro retornado pelo backend (campo TIPO_SERVICO na ORCA)
  tipo_servico?: string;   // 'TOSA', 'VACINACAO', 'Tele Entrega', etc.
}

export type AgendaResponse = ApiList<AgendaItem>;

/** Retorno de GET /api/petshop/agenda/detalhe */
export interface AgendaDetalhe extends AgendaItem {
  cliente_filial?: number;
  animal_filial?:  number;
  prof_filial?:    number;
  situacao:        string;
  data_agendamento:string;
  tipo_ocorrencia: number;
  justificativa:   string;
  data_canc:       string;
  banho_normal:    string;
  tosa_alta:       string;
  tosa_baixa:      string;
  antipulga:       string;
  hidra:           string;
  medic:           string;
  pago:            string;
  telefone:        string;
  celular:         string;
  vend_id:         number;
  vend_filial:     number;
  vend_nome:       string;
  pode_editar:     boolean;  // false = só o criador da agenda ou um Supervisor podem editar
  CodStatus?:      number;   // -5 = não encontrado, -6 = sem permissão
}

/** Uma linha do histórico de edições (ANALYTICS.FDB, AGENDA_HISTORICO) — ver GetAgendaHistoricoEdicoes */
export interface AgendaHistoricoItem {
  id_historico:    number;
  usuario_codigo:  string;
  usuario_nome:    string;
  data_hora:       string;   // ISO
  operacao:        string;   // INSERT | UPDATE | CANCELADO | STATUS | REAGENDADO
  campo:           string;
  valor_anterior:  string;
  valor_novo:      string;
  cliente_nome:    string;
  animal_nome:     string;
  contexto:        string;
}

export interface AgendaHistoricoResponse {
  agenda_id:       number;
  dados:           AgendaHistoricoItem[];
  CodStatus:       number;   // -7 = sem permissão (não-Supervisor), -1 = indisponível
  DescricaoStatus?: string;
}

/** Item de serviço da agenda (PRODORCA) */
export interface AgendaItemServico {
  id_item:   number;
  agenda_id: number;
  cod_pro:   string;   // código do produto (TBLCODIGOPRO)
  produto:   string;   // nome do produto (SRQPRO.DESC_PRO)
  descricao: string;   // descrição salva no momento (PRODORCA.DESCPRO)
  unidade:   string;
  qtd:       string;
  valor:     string;
  valor_liq: string;
  desconto:  string;
  preco_tab: string;
  vendido:   string;
}

export interface AgendaItensResponse {
  agenda_id: number;
  dados:     AgendaItemServico[];
  Count:     number;
  StartsAt:  string;
  EndsAt:    string;
}

// STATUS = status fiscal da ORCA (1-Orçamento | 2-Pedido | 3-NF emitida | 4-NF Cancelada)
export const STATUS_AGENDA: Record<number, { label: string; color: string }> = {
  1: { label: 'Orçamento',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  2: { label: 'Pedido',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  3: { label: 'NF emitida', color: 'bg-green-100 text-green-700 border-green-200' },
  4: { label: 'Cancelado',  color: 'bg-red-100 text-red-700 border-red-200' },
};

// ---------------------------------------------------------------------------
// Profissionais / Técnicos
// ---------------------------------------------------------------------------

export interface Profissional {
  id:                number;
  filial:            number;
  nome:              string;
  cpf?:              string;
  celular?:          string;
  email?:            string;
  crmv?:             string;
  id_categoria?:     number;
  status_ativo?:     number;
  tipo_profissional?:number;
}

export type ProfissionalResponse = ApiList<Profissional>;

// ---------------------------------------------------------------------------
// Vendedores
// ---------------------------------------------------------------------------

export interface Vendedor {
  id:     number;
  filial: number;
  nome:   string;
}

export type VendedorResponse = ApiList<Vendedor>;

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface Cliente {
  id: number;
  filial: number;
  nome: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  telefone: string;
  telefone2: string;
  celular: string;
  email: string;
  contato: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ibge?: string;          // código IBGE do município (via ViaCEP)
  data_cadastro: string;
  data_nascimento: string;
  situacao: string;
  pessoa: string;         // 'F' = física, 'J' = jurídica
  comentario: string;
  ie: string;
  atacadista: number;
  mei: number;
  status_ativo: number;   // 0 = ativo, 1 = inativo
  saldo_disponivel: number;
  data_ult_compra: string;
  pets_resumo?: string;    // preenchido só na busca de /clientes: nomes dos pets do cliente
}

export type ClienteResponse = ApiList<Cliente>;

// ---------------------------------------------------------------------------
// Animais
// ---------------------------------------------------------------------------

export interface Animal {
  id: number;
  filial: number;
  nome: string;
  apelido: string;
  data_nascimento: string;
  sexo: string;           // 'M' | 'F'
  castrado: number;       // 0 | 1
  peso: string;
  id_especie: number;
  especie: string;
  id_raca: number;
  raca: string;
  id_pelo: number;
  pelo: string;
  cor: string;
  tipo_animal: string;
  id_cliente: number;
  filial_cliente: number;
  nome_cliente: string;
  ativo: number;          // 0 | 1
  obito: number;          // 0 | 1
  obs: string;
  id_veterinario: number;
  veterinario: string;
}

export type AnimalResponse = ApiList<Animal>;

export interface PesoHistItem {
  id:       number;
  peso:     number;
  data:     string;
  anotacao: string;
}
export interface PesoHistResponse { dados: PesoHistItem[]; Count: number; CodStatus: number }

// ---------------------------------------------------------------------------
// Serviços
// ---------------------------------------------------------------------------

export interface Servico {
  id:         number;
  filial:     number;
  descricao:  string;
  duracao:    string;
  cor_status: string;
}

export type ServicoResponse = ApiList<Servico>;

// ---------------------------------------------------------------------------
// Categoria de Serviço — Raça + Serviço -> Produto automático na Agenda
// ---------------------------------------------------------------------------

export interface CategoriaServico {
  id:              number;
  filial:          number;
  dadospro_id:     number;
  filial_dadospro: number;
  cod_prod:        string;
  produto:         string;
  raca_id:         number;  // 0 = regra genérica, sem raça (fallback)
  raca:            string;
  servico_id:      number;
  servico:         string;
  nome_opcao:      string;  // rótulo livre (ex: "Diária"/"Mensal") — diferencia quando há 2+ regras p/ o mesmo serviço+raça
}

export type CategoriaServicoResponse = ApiList<CategoriaServico>;

// ---------------------------------------------------------------------------
// Consultas clínicas
// ---------------------------------------------------------------------------

export interface Consulta {
  id:           number;
  filial:       number;
  agenda_id:    number;
  animal_id:    number;
  animal:       string;
  proprietario: string;   // nome do cliente/proprietário
  veterinario:  string;   // nome do veterinário
  data:         string;   // DATA_CONSULTA
  data_alta:    string;
  motivo:       string;
  status:       string;   // 'ABERTO' | 'FECHADO'
  peso:         string;
  temperatura:  string;
  prognostico:  string;
}

export interface ConsultaDetalhe extends Consulta {
  proprietario_id:  number;
  veterinario_id:   number;
  prescricao:       string;
  obs_gerais:       string;
  texto:            string;
  diagnostico:      string;
  diagnostico_def:  string;
  CodStatus?:       number;

  // ── Anamnese — Geral (lookups são índices numéricos) ──────────────────
  evolucao_quadro?:   number;
  estado_corporal?:   number;
  freq_cardiaca?:     string;
  freq_respiratoria?: string;
  exame_tpc?:         string;
  exame_lfn?:         string;
  hidratacao?:        string;
  pressao_arterial?:  string;
  pulso_arterial?:    number;
  comportamento?:     number;
  mucosas?:           number;
  nivel_consciencia?: number;
  convenio?:          string;
  // ── Achados ───────────────────────────────────────────────────────────
  ouvidos?:           string;
  olhos?:             string;
  dentes?:            string;
  // ── Ausculação ────────────────────────────────────────────────────────
  coracao?:           string;
  pulmao?:            string;
  fetal?:             string;
  obs_ausculacao?:    string;
  // ── Fezes ─────────────────────────────────────────────────────────────
  fezes_odor?:        string;
  fezes_consistencia?:string;
  fezes_aparencia?:   string;
  fezes_parasitas?:   string;
  fezes_obs?:         string;
  // ── Urina ─────────────────────────────────────────────────────────────
  uri_odor?:          string;
  uri_miccao?:        string;
  uri_aspecto?:       string;
  uri_obs?:           string;
  // ── Alimentação ───────────────────────────────────────────────────────
  aliment_tipo?:       string;
  aliment_frequencia?: string;
  aliment_quantidade?: string;
  aliment_obs?:        string;
  // ── Habitat ───────────────────────────────────────────────────────────
  habitat_local?:       string;
  habitat_convivencia?: string;
  habitat_obs?:         string;
  // ── Pele ──────────────────────────────────────────────────────────────
  pele_pelos?:         string;
  pele_ectoparasitas?: string;
  pele_obs?:           string;
  // ── Nariz / Membros ───────────────────────────────────────────────────
  nariz?:             string;
  membros?:           string;
  // ── Diagnóstico / Prognóstico (observações) ───────────────────────────
  diagnostico_obs?:     string;
  diagnostico_def_obs?: string;
  prognostico_obs?:     string;
}

// ---------------------------------------------------------------------------
// Configuração de Anamnese (espelha PET_CONFIG_ANAMNESE + CONFIG.PET_ANAMNESE_RESUMIDO)
// Todos os flags são 0/1. PET_ANAMNESE_RESUMIDO tem semântica INVERTIDA ao nome:
//   anamnese_resumido = 1  → "Anamnese Completa = Sim" (mostra todas as abas; ABA_* customiza)
//   anamnese_resumido = 0  → "Anamnese Completa = Não" (modo resumido: só Geral + diag/prog/prescr)
// ---------------------------------------------------------------------------

export interface ConfigAnamnese {
  anamnese_resumido:            number;  // interruptor mestre (1=completa, 0=resumida)
  // pares por grupo: ABA_<x> (exibir) + <x>_obrigatorio + def_imp_<x>
  aba_achados:                  number;  achados_obrigatorio:       number;
  aba_ausculacao:               number;  ausculacao_obrigatorio:    number;
  aba_fezes:                    number;  fezes_obrigatorio:         number;
  aba_urina:                    number;  urina_obrigatorio:         number;
  aba_alimentacao:              number;  alimentacao_obrigatorio:   number;
  aba_habitat:                  number;  habitat_obrigatorio:       number;
  aba_pele:                     number;  pele_obrigatorio:          number;
  aba_nariz:                    number;  nariz_obrigatorio:         number;
  aba_membros:                  number;  membros_obrigatorio:       number;
  aba_diagnostico:              number;  diagnostico_obrigatorio:   number;
  aba_prognostico:              number;  prognostico_obrigatorio:   number;
  aba_prescricao:               number;  prescricao_obrigatorio:    number;
  preenchimento_obrig_geral:    number;
  preenchimento_obrig_resumido: number;
  peso_temp_obrig:              number;
  // padrões de impressão no receituário
  def_imp_achados:     number;  def_imp_ausculacao:  number;  def_imp_fezes:       number;
  def_imp_urina:       number;  def_imp_aliment:     number;  def_imp_habitat:     number;
  def_imp_pele:        number;  def_imp_nariz:       number;  def_imp_membros:     number;
  def_imp_diagnostico: number;  def_imp_prognostico: number;  def_imp_prescricao:  number;
  def_imp_geral:       number;
  CodStatus?:          number;
}

export interface Prontuario {
  id:       number;
  animal:   string;
  cliente:  string;
  data:     string;
  hora:     string;
  box:      string;
  obs:      string;
  medicacao:string;
  dose:     string;
}

export interface ProntuarioResponse {
  consulta_id: number;
  animal_id?:  number;  // presente quando a busca é por animal_id (histórico do animal)
  dados:       Prontuario[];
  Count:       number;
  StartsAt:    string;
  EndsAt:      string;
}

export interface VacinaAplicada {
  id:          number;
  animal_id:   number;
  animal:      string;
  vacina_id:   number;
  vacina:      string;
  vet_id:      number;
  veterinario: string;
  data:        string;
  data_marcada:string;
  laboratorio: string;
  obs:         string;
  status:      string;
}

export interface VacinaResponse {
  animal_id: number;
  dados:     VacinaAplicada[];
  Count:     number;
  StartsAt:  string;
  EndsAt:    string;
}

export interface Exame {
  id:          number;
  consulta_id: number;
  tipo_exame:  string;
  data?:       string;  // presente quando a busca é por animal_id (data da consulta vinculada)
  animal?:     string;  // idem
}

export interface ExameResponse {
  consulta_id: number;
  animal_id?:  number;  // presente quando a busca é por animal_id (histórico do animal)
  dados:       Exame[];
  Count:       number;
  StartsAt:    string;
  EndsAt:      string;
}

/** Anexo de exame (PET_ANEXO_EXAME) — laudo/imagem em PDF, JPG, PNG, DOC */
export interface AnexoExame {
  id:          number;
  filial:      number;
  consulta_id: number;
  nome:        string;   // nome original do arquivo
  tipo:        string;   // extensão: .pdf, .jpg, .png, .doc...
  data:        string;   // yyyy-mm-dd
  tamanho:     number;    // bytes
  obs:         string;
}

export interface AnexoExameResponse {
  dados:  AnexoExame[];
  Count:  number;
}

/** Dados cadastrais da empresa/filial (TBLCAPFILIAIS) para cabeçalho de PDF */
export interface DadosEmpresa {
  id:          number;
  nome:        string;
  fantasia:    string;
  cnpj:        string;
  endereco:    string;
  numero:      string;
  bairro:      string;
  cidade:      string;
  uf:          string;
  cep:         string;
  fone:        string;
  celular:     string;
  email:       string;
  site:        string;
  logo_base64: string;   // logo da empresa (temporariamente do produto LOGO1001)
  logo_mime?:  string;   // image/jpeg | image/png | ...
  CodStatus?:  number;
}

export type ConsultaResponse = ApiList<Consulta>;

// ---------------------------------------------------------------------------
// Vendas / Pré-vendas (ORCA TIPO_SERVICO='VENDAS')
// ---------------------------------------------------------------------------

export interface Prevenda {
  id:           number;
  filial:       number;
  cliente_id:   number;
  cliente:      string;
  data:         string;
  hora:         string;
  valor:        number;
  sub_total:    number;
  desconto:     number;
  valor_frete:  number;
  status:       number;   // 1=Em aberto, 2=Confirmado, 3=Finalizado, 4=Cancelado
  formapgto:    string;
  condpgto:     string;
  situacao:     string;
  data_entrega: string;
  hora_entrega: string;
  animal:       string;
  profissional: string;
}

export interface PrevendaDetalhe extends Prevenda {
  val_produtos:  number;
  val_acresc:    number;
  frete:         string;
  pz_entrega:    string;
  justificativa: string;
  dados:         string;   // obs
  tipo_servico:  string;
  CodStatus?:    number;
}

export interface PrevendaItem {
  id_prodorca:    number;
  id_orca:        number;
  cod_prod:       string;
  desc_pro:       string;
  descpro:        string;
  qtd:            number;
  valor:          number;
  valorliq:       number;
  desconto:       number;
  preco_tabela:   number;
  unid_pro:       string;
  status_vendido: string;
  ordem:          number;
}

export interface PrevendaItensResponse {
  dados:   PrevendaItem[];
  Count:   number;
  StartsAt:string;
  EndsAt:  string;
}

export type PrevendaResponse = ApiList<Prevenda>;

export const STATUS_PREVENDA: Record<number, { label: string; color: string }> = {
  1: { label: 'Em aberto',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  2: { label: 'Confirmado',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  3: { label: 'Finalizado',  color: 'bg-green-100 text-green-700 border-green-200' },
  4: { label: 'Cancelado',   color: 'bg-red-100 text-red-700 border-red-200' },
};

// ---------------------------------------------------------------------------
// Lookups (espécies, raças, tipos de pelo)
// ---------------------------------------------------------------------------

export interface Especie {
  id: number;
  filial: number;
  descricao: string;
}

export interface Raca {
  id: number;
  filial: number;
  descricao: string;
  id_especie: number;
  especie: string;
  porte: string;
}

export interface TipoPelo {
  id: number;
  filial: number;
  descricao: string;
  id_especie: number;
  especie?: string;
}

export type EspecieResponse  = ApiList<Especie>;
export type RacaResponse     = ApiList<Raca>;
export type TipoPeloResponse = ApiList<TipoPelo>;

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export interface ContaReceber {
  nro_doc:       number;
  parcela:       number;
  filial:        number;
  cliente_id:    number;
  cliente:       string;
  valor:         number;
  val_pag:       number;
  saldo:         number;
  dt_emissao:    string;
  dt_vencimento: string;
  dt_prorrog:    string;
  dt_efetivacao: string;
  historico:     string;
  operador:      string;
  status_baixa:  0 | 2 | 3;
  num_nf:        number;
  id_orca:       number;
}

export interface ContaReceberTotais {
  total:       number;
  total_valor: number;
  total_saldo: number;
}

export type ContaReceberResponse = ApiList<ContaReceber>;

export interface SaldoCliente {
  cliente_id: number;
  filial: number;
  cliente: string;
  limite_cred: number;
  saldo_devedor: number;
  saldo_disponivel: number;
}

export type SaldoResponse = ApiList<SaldoCliente>;

// ---------------------------------------------------------------------------
// Planos de financiamento
// ---------------------------------------------------------------------------

export interface PlanoFinanciamento {
  cod_plano: number;
  desc_plano: string;
  num_parc: number;
  inter_dias: number;
  taxa_acres: number;
  tipo: string;
  status_ativo: number;
}

export type PlanoResponse = ApiList<PlanoFinanciamento>;

// ---------------------------------------------------------------------------
// Produtos (catálogo)
// ---------------------------------------------------------------------------

export interface Produto {
  id_dadospro: number;
  cod_filial: number;
  nome_produto: string;
  unidade: string;
  preco: number;
  secao: string;
  grupo: string;
}

export type ProdutoResponse = ApiList<Produto>;

// ---------------------------------------------------------------------------
// Cadastros — Vacinas catálogo e Medicamentos
// ---------------------------------------------------------------------------

export interface VacinaCatalogo {
  id:           number;
  filial:       number;
  descricao:    string;
  id_especie:   number;
  especie:      string;
  id_laboratorio:number;
  laboratorio:  string;
}

export interface Medicamento {
  id:          number;
  filial:      number;
  medicamento: string;
  laboratorio: string;
  aplicacao:   string;
}

export type VacinaCatalogoResponse = ApiList<VacinaCatalogo>;
export type MedicamentoResponse    = ApiList<Medicamento>;

// ---------------------------------------------------------------------------
// Animais — histórico de compras e aniversariantes
// ---------------------------------------------------------------------------

export interface AnimalHistoricoItem {
  id_srqnf:   number;
  filial:     number;
  data:       string;
  num_nf:     number;
  produto:    string;
  unidade:    string;
  qtd:        string;
  valor_unit: string;
  preco_tab:  string;
}

export interface AnimalHistoricoResponse {
  animal_id:  number;
  cliente_id: number;
  dados:      AnimalHistoricoItem[];
  Count:      number;
  StartsAt:   string;
  EndsAt:     string;
}

export interface ConsultaAnimalItem {
  id:          number;
  filial:      number;
  data:        string;
  veterinario: string;
  motivo:      string;
  peso:        string;
  temperatura: string;
  diagnostico: string;
  prognostico: string;
  prescricao:  string;
  obs:         string;
}

/** Retorno de GET /api/petshop/consultas/detalhe */
export interface ConsultaDetalhe extends ConsultaAnimalItem {
  agenda_id:       number;
  proprietario_id: number;
  proprietario:    string;
  veterinario_id:  number;
  data_alta:       string;
  status:          string;
  obs_gerais:      string;
  prescricao:      string;
  texto:           string;
  diagnostico_def: string;
  CodStatus?:      number;
}

export interface ConsultaAnimalResponse {
  animal_id: number;
  dados:     ConsultaAnimalItem[];
  Count:     number;
  StartsAt:  string;
  EndsAt:    string;
}

export interface AnimalAniversariante {
  id:               number;
  filial:           number;
  nome:             string;
  apelido:          string;
  data_nascimento:  string;
  especie:          string;
  raca:             string;
  id_cliente:       number;
  nome_cliente:     string;
  fone_cliente:     string;
  celular_cliente:  string;
  email_cliente:    string;
}

export interface AniversariantesResponse {
  mes:      number;
  dados:    AnimalAniversariante[];
  Count:    number;
  StartsAt: string;
  EndsAt:   string;
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

export interface RelatorioComissaoItem {
  id_orca:        number;
  filial:         number;
  data:           string;
  cliente:        string;
  animal:         string;
  codvend:        number;
  atendente:      string;
  tecnico_id:     number;
  tecnico:        string;
  produto:        string;
  comissao_perc:  number;
  qtd:            number;
  valorliq:       number;
  total:          number;
  comissao_valor: number;
}

export interface RelatorioComissaoResponse {
  periodo:        string;
  dados:          RelatorioComissaoItem[];
  Count:          number;
  total_venda:    number;
  total_comissao: number;
  StartsAt:       string;
  EndsAt:         string;
}

export interface RelatorioVendasSecaoItem {
  secao_id:  number;
  secao:     string;
  grupo_id:  number;
  cod_prod:  string;
  produto:   string;
  qtd_total: number;
  valorliq:  number;
  total:     number;
}

export interface RelatorioVendasSecaoResponse {
  periodo:     string;
  dados:       RelatorioVendasSecaoItem[];
  Count:       number;
  total_geral: number;
  StartsAt:    string;
  EndsAt:      string;
}

export interface Secao {
  id:        number;
  descricao: string;
}

export interface SecaoResponse {
  dados: Secao[];
  Count: number;
}

export type CriterioCurvaAbc = 'receita' | 'lucro' | 'custo' | 'qtd';
export type ClasseCurvaAbc   = 'A' | 'B' | 'C';

export interface CurvaAbcItem {
  cod_prod:                   string;
  descricao:                  string;
  secao_id:                   number;
  secao:                      string;
  qtd:                        number;
  receita:                    number;
  custo:                      number;
  lucro:                      number;
  margem_pct:                 number;
  participacao_pct:           number;
  participacao_acumulada_pct: number;
  classe:                     ClasseCurvaAbc;
}

export interface CurvaAbcResumoClasse {
  produtos: number;
  receita:  number;
}

export interface CurvaAbcResponse {
  CodStatus:      number;
  DescricaoStatus?: string;
  periodo:        string;
  criterio:       CriterioCurvaAbc;
  dados:          CurvaAbcItem[];
  Count:          number;
  total_qtd:      number;
  total_receita:  number;
  total_custo:    number;
  total_lucro:    number;
  resumo_a:       CurvaAbcResumoClasse;
  resumo_b:       CurvaAbcResumoClasse;
  resumo_c:       CurvaAbcResumoClasse;
}

export type CriterioCurvaAbcCliente = 'receita' | 'qtd';

export interface CurvaAbcClienteItem {
  cliente_id:                 number;
  cliente_filial:              number;
  cliente:                    string;
  telefone:                   string;
  receita:                    number;
  qtd_atendimentos:           number;
  ultima_visita:               string;
  participacao_pct:           number;
  participacao_acumulada_pct: number;
  classe:                     ClasseCurvaAbc;
}

export interface CurvaAbcClienteResumoClasse {
  clientes: number;
  receita:  number;
}

export interface CurvaAbcClienteResponse {
  CodStatus:         number;
  DescricaoStatus?:  string;
  periodo:           string;
  criterio:          CriterioCurvaAbcCliente;
  dados:             CurvaAbcClienteItem[];
  Count:             number;
  total_receita:     number;
  total_atendimentos: number;
  resumo_a:          CurvaAbcClienteResumoClasse;
  resumo_b:          CurvaAbcClienteResumoClasse;
  resumo_c:          CurvaAbcClienteResumoClasse;
}

export type SituacaoEstimativaConversao = 'aguardando' | 'convertida' | 'sem_conversao';

export interface EstimativaSemConversaoItem {
  id:                  number;
  filial:              number;
  cliente_id:          number;
  cliente_filial:      number;
  cliente:             string;
  animal_id:           number;
  animal:              string;
  produto:             string;
  tipo_servico:        string;
  vendedor:             string;
  vendedor_id:         number;
  data_estimativa:     string;
  data_envio:          string;
  data_limite:         string;
  dias_desde_contato:  number;
  valor:               number;
  situacao:            SituacaoEstimativaConversao;
  tem_agenda:          boolean;
  agenda_id:           number | null;
  agenda_filial?:      number;
  agenda_data:         string;
  produto_incluido:    boolean;
}

export interface EstimativasSemConversaoResponse {
  CodStatus:                 number;
  DescricaoStatus?:          string;
  periodo:                   string;
  dias_conversao:            number;
  dados:                     EstimativaSemConversaoItem[];
  Count:                     number;
  total_convertidas:         number;
  total_aguardando:          number;
  total_sem_conversao:       number;
  valor_total_sem_conversao: number;
}

export interface RelatorioAnimalItem {
  animal_id:      number;
  animal_filial:  number;
  animal:         string;
  raca:           string;
  cliente_id:     number;
  cliente_filial: number;
  cliente:        string;
  endereco:       string;
  bairro:         string;
  telefone:       string;
  celular:        string;
  email:          string;
}

export interface RelatorioAnimaisResponse {
  CodStatus:        number;
  DescricaoStatus?: string;
  dados:            RelatorioAnimalItem[];
  Count:            number;
}

// ── Historico do Produto (botao "Historico" da tela Produtos) ──

export interface HistoricoProdutoMovItem {
  tipo:         string;
  data:         string;
  data_doc:     string;
  hora:         string;
  qtd_saida:    number;
  qtd_entrada:  number;
  cmv:          number;
  preco:        number;
  nro_doc:      string;
  filial:       number;
  quem:         string;
  obs:          string;
  vendedor:     string;
  fornecedor:   string;
  entidade:     string;
}

export interface HistoricoProdutoMovResponse {
  CodStatus?:       number;
  DescricaoStatus?: string;
  dados:            HistoricoProdutoMovItem[];
  Count:            number;
}

export interface HistoricoProdutoAnalise {
  periodo_de:            string;
  periodo_ate:           string;
  dias_periodo:          number;
  media_venda_periodo:   number;
  media_venda_30d:       number;
  prazo_entrega:         number;
  periodo_cobertura:     number;
  dias_cobertura_atual:  number;
  dias_ruptura:          number;
  consumo_ate_entrega:   number;
  ruptura_ate_entrega:   number;
  demanda_total:         number;
  sugestao_compra:       number;
}

export interface HistoricoProdutoEstatMes {
  mes:          string;
  mes_label:    string;
  venda_qtd:    number;
  venda_total:  number;
  venda_media:  number;
  compra_qtd:   number;
  compra_total: number;
  compra_media: number;
}

export interface HistoricoProdutoCompra {
  data:        string;
  filial:      number;
  qtd:         number;
  custo:       number;
  total:       number;
  fornecedor:  string;
  numeronf:    number;
  st:          number;
  ipi:         number;
  frete:       number;
}

export interface HistoricoProdutoGiroResponse {
  CodStatus?:         number;
  DescricaoStatus?:   string;
  estoque_atual:      number;
  vendas_7:           number;
  vendas_30:          number;
  vendas_90:          number;
  analise:            HistoricoProdutoAnalise;
  estatistica_mensal: HistoricoProdutoEstatMes[];
  compras_recentes:   HistoricoProdutoCompra[];
}

// ── Relatório Geral de Vendas - Detalhamento CMV ──
// Rótulos "margem"/"markup" mantidos como no legado (fórmulas trocadas em
// relação ao uso comum): margem = lucro/custo, markup = lucro/venda.

export interface VendasCmvSecao {
  secao:          string;
  nro_itens:      number;
  total:          number;
  custo:          number;
  lucro:          number;
  porc_receita:   number;
  porc_lucro:     number;
  margem:         number;
  markup:         number;
  tot_desconto:   number;
  tot_acrescimo:  number;
}

export interface VendasCmvResponse {
  CodStatus?:       number;
  DescricaoStatus?: string;
  numero_vendas:    number;
  venda_bruta:      number;
  cmv:              number;
  lucro_bruto:      number;
  margem:           number;
  markup:           number;
  desconto:         number;
  acrescimo:        number;
  ticket_medio:     number;
  dados:            VendasCmvSecao[];
  Count:            number;
}
