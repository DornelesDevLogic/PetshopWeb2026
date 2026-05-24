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
}

export type AgendaResponse = ApiList<AgendaItem>;

/** Retorno de GET /api/petshop/agenda/detalhe */
export interface AgendaDetalhe extends AgendaItem {
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
  CodStatus?:      number;   // -5 = não encontrado
}

/** Item de serviço da agenda (PRODORCA) */
export interface AgendaItemServico {
  id_item:   number;
  agenda_id: number;
  produto:   string;
  descricao: string;
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

export const STATUS_AGENDA: Record<number, { label: string; color: string }> = {
  1: { label: 'Agendado',       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  2: { label: 'Em atendimento', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  3: { label: 'Finalizado',     color: 'bg-green-100 text-green-700 border-green-200' },
  4: { label: 'Cancelado',      color: 'bg-red-100 text-red-700 border-red-200' },
};

// ---------------------------------------------------------------------------
// Profissionais / Técnicos
// ---------------------------------------------------------------------------

export interface Profissional {
  id: number;
  nome: string;
  filial: number;
  especialidade?: string;
  crv?: string;
  ativo?: number;
}

export type ProfissionalResponse = ApiList<Profissional>;

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
  data_cadastro: string;
  data_nascimento: string;
  situacao: string;       // 'A' = ativo, 'I' = inativo
  pessoa: string;         // 'F' = física, 'J' = jurídica
  comentario: string;
  ie: string;
  atacadista: number;
  mei: number;
  saldo_disponivel: number;
  data_ult_compra: string;
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
}

export type EspecieResponse  = ApiList<Especie>;
export type RacaResponse     = ApiList<Raca>;
export type TipoPeloResponse = ApiList<TipoPelo>;

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

export interface ContaReceber {
  nro_doc: number;
  parcela: number;
  filial: string;
  cliente_id: number;
  cliente: string;
  valor: number;
  val_pag: number;
  saldo: number;
  dt_emissao: string;
  dt_vencimento: string;
  dt_prorrog: string;
  dt_efetivacao: string;
  historico: string;
  operador: string;
  status_baixa: 0 | 2 | 3;
  num_nf: string;
  id_orca: number;
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
