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
  cpf_cnpj?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  ativo?: number;
}

export type ClienteResponse = ApiList<Cliente>;

// ---------------------------------------------------------------------------
// Animais
// ---------------------------------------------------------------------------

export interface Animal {
  id: number;
  filial: number;
  cliente_id: number;
  nome: string;
  especie?: string;
  raca?: string;
  sexo?: string;
  dt_nascimento?: string;
  ativo?: number;
}

export type AnimalResponse = ApiList<Animal>;

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
