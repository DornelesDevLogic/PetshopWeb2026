/**
 * Definições dos parâmetros de Configurações Gerais — mapeamento fiel ao
 * sistema legado Pet_shop 1.4.6.5 (ver ANALISE_CONFIGURACOES.md).
 *
 * Cada parâmetro aponta para tabela + coluna do Firebird. O componente só
 * exibe parâmetros cuja coluna exista no banco (retornada pelo GET), então
 * diferenças de schema não quebram a tela.
 */

export type Tabela = 'config' | 'pet_config' | 'confmail' | 'anamnese';

export type TipoCampo =
  | 'TF'     // CHAR: 'T' / 'F'
  | '01'     // INT:  1 / 0
  | 'SN'     // CHAR: 'S' / 'N'
  | 'opcoes' // select com options próprias
  | 'num'    // numérico
  | 'texto'  // texto livre
  | 'senha'  // texto mascarado
  | 'hora';  // HH:MM:SS

export interface ParamDef {
  tabela:   Tabela;
  col:      string;          // nome da coluna (lowercase, como vem do GET)
  label:    string;
  tipo:     TipoCampo;
  opcoes?:  { valor: string; label: string }[];
  ajuda?:   string;
  // Regra de dependência do legado: só habilita se outro campo tiver o valor
  dependeDe?: { tabela: Tabela; col: string; valor: string };
}

export interface GrupoDef {
  id:     string;
  titulo: string;
  params: ParamDef[];
}

const NSP  = [
  { valor: 'N', label: 'Não' },
  { valor: 'S', label: 'Sim' },
  { valor: 'P', label: 'Pergunta' },
];
const NSPA = [...NSP, { valor: 'A', label: 'Pede senha' }];

// ─── Anamnese: 12 áreas × (mostrar / obrigatório / imprime) ──────────────────
const AREAS_ANAMNESE = [
  ['achados',     'Achados'],
  ['ausculacao',  'Auscultação'],
  ['fezes',       'Fezes'],
  ['urina',       'Urina'],
  ['alimentacao', 'Alimentação'],
  ['habitat',     'Habitat'],
  ['pele',        'Pele'],
  ['nariz',       'Nariz'],
  ['membros',     'Membros'],
  ['diagnostico', 'Diagnóstico'],
  ['prognostico', 'Prognóstico'],
  ['prescricao',  'Prescrição'],
] as const;

const paramsAnamnese: ParamDef[] = AREAS_ANAMNESE.flatMap(([key, nome]) => [
  { tabela: 'anamnese', col: `aba_${key}`,          label: `Mostra aba ${nome}`,       tipo: '01' } as ParamDef,
  { tabela: 'anamnese', col: `${key}_obrigatorio`,  label: `${nome} obrigatório`,      tipo: '01' } as ParamDef,
  { tabela: 'anamnese', col: `def_imp_${key}`,      label: `Imprime ${nome} (padrão)`, tipo: '01' } as ParamDef,
]);

// ─── Grupos / abas ───────────────────────────────────────────────────────────

export const GRUPOS: GrupoDef[] = [
  {
    id: 'agenda',
    titulo: 'Agenda',
    params: [
      { tabela: 'config', col: 'pet_ag_nomecliente_nomeanimal', label: 'Exibe nome do cliente + nome do pet na agenda', tipo: '01' },
      { tabela: 'config', col: 'pet_alerta_raca_servico',  label: 'Alerta combinação raça × tipo de serviço', tipo: '01' },
      { tabela: 'config', col: 'canc_orca',                label: 'Permite cancelar agenda', tipo: 'TF' },
      { tabela: 'config', col: 'ultiliza_horario_agenda',  label: 'Controla horário na agenda', tipo: 'TF' },
      { tabela: 'config', col: 'pet_copia_com_itens',      label: 'Copia itens da agenda anterior', tipo: '01' },
      { tabela: 'config', col: 'pet_usa_dataabertura_dataorca', label: 'Data da agenda = data de abertura', tipo: '01' },
      { tabela: 'config', col: 'pet_entrada_agenda',       label: 'Pergunta aviso na abertura da agenda', tipo: 'TF' },
      { tabela: 'config', col: 'ult_reagendamento',        label: 'Utiliza reagendamento', tipo: 'TF' },
      { tabela: 'config', col: 'ult_obs_agenda',           label: 'Utiliza observações na agenda', tipo: 'TF' },
      { tabela: 'config', col: 'pet_visualiza_hist',       label: 'Visualiza histórico de abertura da agenda', tipo: 'TF' },
      { tabela: 'config', col: 'pet_vis_valoraberto',      label: 'Visualiza valor de agenda aberta', tipo: 'TF' },
      { tabela: 'config', col: 'usa_agenda_rapida',        label: 'Utiliza agenda rápida', tipo: '01' },
      { tabela: 'config', col: 'ult_atendente_logado',     label: 'Utiliza atendente logado', tipo: 'TF' },
      { tabela: 'config', col: 'pet_bloq_alt_atend_log_agenda', label: 'Bloqueia trocar atendente logado na agenda', tipo: '01',
        dependeDe: { tabela: 'config', col: 'ult_atendente_logado', valor: 'T' } },
      { tabela: 'pet_config', col: 'usa_prof_logado',      label: 'Utiliza profissional logado', tipo: '01',
        dependeDe: { tabela: 'config', col: 'ult_atendente_logado', valor: 'T' } },
      { tabela: 'config', col: 'pet_det_retorno_agenda',   label: 'Usa detalhe de retorno na agenda', tipo: '01' },
      { tabela: 'pet_config', col: 'pet_qtd_dias_rap_agenda', label: 'Dias da pesquisa rápida por data', tipo: 'num',
        ajuda: '0 = não utiliza filtro de data inicial' },
      { tabela: 'pet_config', col: 'pet_tp_def_prev_atend', label: 'Hora padrão de previsão de atendimento', tipo: 'hora' },
      { tabela: 'pet_config', col: 'pet_view_intervalo_hr', label: 'Intervalo da grade de horários (minutos)', tipo: 'num' },
    ],
  },
  {
    id: 'estimativas',
    titulo: 'Estimativas / Estoque',
    params: [
      { tabela: 'config', col: 'pet_racao_estimativa',     label: 'Controla estimativa de ração/vacina', tipo: 'TF',
        ajuda: 'Liga o módulo de Estimativas (regra legada: atualiza CONTROL_RACAO dos animais)' },
      { tabela: 'config', col: 'pet_reagendamento_est',    label: 'Reagendamento envia estimativa', tipo: 'TF',
        dependeDe: { tabela: 'config', col: 'pet_racao_estimativa', valor: 'T' } },
      { tabela: 'config', col: 'pet_dt_manual_estimativa', label: 'Permite data manual na estimativa', tipo: '01' },
      { tabela: 'config', col: 'pet_controleregra',        label: 'Mostra produto sem regra na agenda', tipo: 'TF' },
      { tabela: 'config', col: 'pet_controle_estoque_estimado', label: 'Controle de estoque estimado', tipo: '01' },
      { tabela: 'config', col: 'pro',                      label: 'Bloqueia produto com estoque negativo', tipo: 'opcoes', opcoes: NSPA },
      { tabela: 'config', col: 'pet_enviaagenda_pre',      label: 'Replica agenda/tele-entrega para pré-venda', tipo: 'TF' },
      { tabela: 'config', col: 'pet_usa_baixa_estoque_agenda', label: 'Baixa estoque por agenda', tipo: '01',
        dependeDe: { tabela: 'config', col: 'pet_enviaagenda_pre', valor: 'T' } },
      { tabela: 'config', col: 'controleestoque',          label: 'Controle de estoque geral', tipo: 'TF' },
      { tabela: 'config', col: 'usa_reserva',              label: 'Usa reserva de estoque', tipo: 'TF' },
    ],
  },
  {
    id: 'vendas',
    titulo: 'Vendas / Financeiro',
    params: [
      { tabela: 'config', col: 'pet_max_desc',             label: 'Desconto máximo no item (%)', tipo: 'num' },
      { tabela: 'config', col: 'orca_digitapreco',         label: 'Permite digitar preço em produto zerado', tipo: 'SN' },
      { tabela: 'config', col: 'pet_alter_receb',          label: 'Grava agenda direto como recebido', tipo: 'TF' },
      { tabela: 'config', col: 'pet_perm_alt_status_apos_pgto', label: 'Permite alterar status após pagamento', tipo: '01' },
      { tabela: 'config', col: 'pet_usa_acerto_tele',      label: 'Usa acerto financeiro na tele-entrega', tipo: '01' },
      { tabela: 'config', col: 'pet_preview_tele',         label: 'Usa preview na agenda/tele-entrega', tipo: '01' },
      { tabela: 'config', col: 'vende_atacadista',         label: 'Permite venda atacadista', tipo: '01' },
      { tabela: 'config', col: 'pet_usa_contas_receber',   label: 'Usa contas a receber', tipo: '01' },
      { tabela: 'pet_config', col: 'usa_cat_vendedor',     label: 'Usa categoria de atendente na agenda', tipo: '01' },
      { tabela: 'pet_config', col: 'usa_prod_tx_tele',     label: 'Insere produto "TX" (taxa) na tele-entrega', tipo: '01' },
      { tabela: 'config', col: 'pet_usa_filt_lograd_cli_tele', label: 'Filtro por logradouro do cliente na tele', tipo: '01' },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes / Animais',
    params: [
      { tabela: 'pet_config', col: 'controle_cgc_cadastrado', label: 'Controla CPF/CNPJ no cadastro do cliente', tipo: 'opcoes', opcoes: NSP },
      { tabela: 'pet_config', col: 'usa_audit_cad_cli',    label: 'Audita cadastro de cliente (CPF, endereço, CEP)', tipo: '01' },
      { tabela: 'config', col: 'pet_usa_troca_tutor',      label: 'Habilita troca de tutor do animal', tipo: '01' },
      { tabela: 'config', col: 'pet_tp_filtro_animal',     label: 'Filtro padrão da pesquisa de animais', tipo: 'opcoes',
        opcoes: [
          { valor: '0', label: 'Dinâmico' },
          { valor: '1', label: 'Somente ativos' },
          { valor: '2', label: 'Somente inativos' },
          { valor: '3', label: 'Todos' },
        ] },
      { tabela: 'config', col: 'pet_pesqespecie',          label: 'Pesquisa espécie ao selecionar produto', tipo: 'TF' },
      { tabela: 'config', col: 'pet_usa_fl_log_pesq_cli',  label: 'Filtra clientes pela filial logada', tipo: '01' },
    ],
  },
  {
    id: 'consultas',
    titulo: 'Consultas / Prontuário',
    params: [
      { tabela: 'config', col: 'pet_24hr_edit_consulta',   label: 'Bloqueia edição da consulta após 24h', tipo: '01' },
      { tabela: 'config', col: 'prontuario_prontovet',     label: 'Modelo de prontuário', tipo: 'opcoes',
        opcoes: [
          { valor: '0', label: 'Normal' },
          { valor: '1', label: 'Hospital (ProntoVet)' },
          { valor: '2', label: 'PetSperk (v2)' },
        ] },
      { tabela: 'config', col: 'pet_anamnese_resumido',    label: 'Anamnese resumida', tipo: '01' },
      { tabela: 'config', col: 'pet_descricao_livre_prontuario', label: 'Descrição livre no prontuário', tipo: '01' },
      { tabela: 'config', col: 'pet_prontuario_hr_dinamico', label: 'Prontuário com horário dinâmico', tipo: '01' },
      { tabela: 'config', col: 'pet_estoque_prontuario',   label: 'Baixa estoque pelo prontuário', tipo: 'TF' },
      { tabela: 'config', col: 'valor_limite_pront',       label: 'Valor limite do prontuário (R$)', tipo: 'num' },
      { tabela: 'config', col: 'pet_usa_vinc_tec_usuario', label: 'Vincula veterinário ao usuário logado', tipo: '01' },
      { tabela: 'pet_config', col: 'usa_aplica_pront_por_dia', label: 'Aplicação do prontuário por dia', tipo: '01' },
      { tabela: 'pet_config', col: 'pront_afericao_dia',   label: 'Aferição do prontuário por dia', tipo: '01' },
      { tabela: 'pet_config', col: 'pront_hist_log',       label: 'Histórico/log do prontuário', tipo: '01' },
      { tabela: 'pet_config', col: 'usa_aplica_pront_view_conf', label: 'Confirmação visual da aplicação', tipo: '01' },
      { tabela: 'pet_config', col: 'def_filtra_data_pront', label: 'Filtra data no prontuário por padrão', tipo: '01' },
      { tabela: 'pet_config', col: 'usa_dash_prontv2',     label: 'Usa dashboard do prontuário v2', tipo: '01' },
      { tabela: 'pet_config', col: 'pet_tipo_exame',       label: 'Tipo de exame', tipo: 'num' },
    ],
  },
  {
    id: 'anamnese',
    titulo: 'Anamnese',
    params: paramsAnamnese.concat([
      { tabela: 'anamnese', col: 'preenchimento_obrig_geral',    label: 'Preenchimento obrigatório — aba geral',    tipo: '01' },
      { tabela: 'anamnese', col: 'preenchimento_obrig_resumido', label: 'Preenchimento obrigatório — aba resumida', tipo: '01' },
    ]),
  },
  {
    id: 'banho',
    titulo: 'Banho & Tosa',
    params: [
      { tabela: 'config', col: 'banho_pequeno', label: 'Valor banho — porte pequeno (R$)', tipo: 'num' },
      { tabela: 'config', col: 'banho_medio',   label: 'Valor banho — porte médio (R$)',   tipo: 'num' },
      { tabela: 'config', col: 'banho_grande',  label: 'Valor banho — porte grande (R$)',  tipo: 'num' },
      { tabela: 'config', col: 'banho_gigante', label: 'Valor banho — porte gigante (R$)', tipo: 'num' },
      { tabela: 'config', col: 'cont_peso',     label: 'Controla peso do animal', tipo: 'TF' },
    ],
  },
  {
    id: 'email',
    titulo: 'E-mail',
    params: [
      { tabela: 'confmail', col: 'vemail',           label: 'E-mail da conta', tipo: 'texto' },
      { tabela: 'confmail', col: 'vsmtp',            label: 'Servidor SMTP', tipo: 'texto' },
      { tabela: 'confmail', col: 'vportasmtp',       label: 'Porta SMTP', tipo: 'num' },
      { tabela: 'confmail', col: 'vpop',             label: 'Servidor POP3', tipo: 'texto' },
      { tabela: 'confmail', col: 'vportapop',        label: 'Porta POP3', tipo: 'num' },
      { tabela: 'confmail', col: 'vusuario',         label: 'Usuário', tipo: 'texto' },
      { tabela: 'confmail', col: 'vsenha',           label: 'Senha', tipo: 'senha' },
      { tabela: 'confmail', col: 'autenticacaosmtp', label: 'Autentica SMTP', tipo: '01' },
      { tabela: 'confmail', col: 'utiliza_tls',      label: 'Utiliza TLS', tipo: '01' },
      { tabela: 'confmail', col: 'utiliza_ssl',      label: 'Utiliza SSL', tipo: '01' },
    ],
  },
  {
    id: 'sms',
    titulo: 'SMS',
    params: [
      { tabela: 'config', col: 'pet_usa_sms',            label: 'Habilita envio de SMS', tipo: '01' },
      { tabela: 'config', col: 'modelo_sms',             label: 'Modelo de SMS', tipo: 'num',
        dependeDe: { tabela: 'config', col: 'pet_usa_sms', valor: '1' } },
      { tabela: 'config', col: 'servidor_sms',           label: 'IP do servidor SMS', tipo: 'texto',
        dependeDe: { tabela: 'config', col: 'pet_usa_sms', valor: '1' } },
      { tabela: 'config', col: 'porta_tcp_sms',          label: 'Porta TCP', tipo: 'num',
        dependeDe: { tabela: 'config', col: 'pet_usa_sms', valor: '1' } },
      { tabela: 'config', col: 'porta_serial',           label: 'Porta serial do modem', tipo: 'texto',
        dependeDe: { tabela: 'config', col: 'pet_usa_sms', valor: '1' } },
      { tabela: 'config', col: 'velocidade_porta_sms',   label: 'Velocidade da porta', tipo: 'num',
        dependeDe: { tabela: 'config', col: 'pet_usa_sms', valor: '1' } },
      { tabela: 'config', col: 'sms_status_pedido',      label: 'Mensagem — agenda aberta', tipo: 'texto' },
      { tabela: 'config', col: 'sms_status_recebimento', label: 'Mensagem — recebimento', tipo: 'texto' },
      { tabela: 'config', col: 'sms_status_confirmacao', label: 'Mensagem — confirmação', tipo: 'texto' },
      { tabela: 'config', col: 'sms_status_entregando',  label: 'Mensagem — finalizada', tipo: 'texto' },
      { tabela: 'config', col: 'sms_status_encerrado',   label: 'Mensagem — encerrada', tipo: 'texto' },
    ],
  },
  {
    id: 'impressao',
    titulo: 'Impressão',
    params: [
      { tabela: 'config', col: 'modelo_impressora',   label: 'Modelo de impressora', tipo: 'texto' },
      { tabela: 'config', col: 'pet_imprime_report',  label: 'Imprime via report (QuickReport)', tipo: 'TF' },
      { tabela: 'config', col: 'pet_qtd_imp_qrp',     label: 'Quantidade de impressões (report)', tipo: 'num',
        dependeDe: { tabela: 'config', col: 'pet_imprime_report', valor: 'T' } },
      { tabela: 'config', col: 'pet_usa_agrup_imp',   label: 'Usa agrupamento de impressão', tipo: '01' },
      { tabela: 'config', col: 'pet_imp_timbrada',    label: 'Impressão em papel timbrado', tipo: '01' },
      { tabela: 'config', col: 'pet_imp_consulta_a5', label: 'Impressão de consulta em A5', tipo: '01' },
      { tabela: 'config', col: 'pet_ultiliza_a4',     label: 'Utiliza papel A4', tipo: 'TF' },
      { tabela: 'config', col: 'imprim_obs_agenda',   label: 'Dados adicionais na comanda', tipo: 'texto' },
      { tabela: 'pet_config', col: 'mod_imp_rec_cons', label: 'Modelo de impressão do receituário', tipo: 'num' },
      { tabela: 'pet_config', col: 'pet_imp_animal_tele', label: 'Imprime dados do animal na tele-entrega', tipo: '01' },
    ],
  },
  {
    id: 'auditoria',
    titulo: 'Auditoria / Log',
    params: [
      { tabela: 'config', col: 'pet_usa_log',      label: 'Habilita log do petshop', tipo: '01' },
      { tabela: 'pet_config', col: 'pet_log_ip_mac', label: 'Log armazena IP / MAC / nome do PC', tipo: '01',
        dependeDe: { tabela: 'config', col: 'pet_usa_log', valor: '1' } },
      { tabela: 'pet_config', col: 'limp_log_aut', label: 'Limpeza automática do log', tipo: 'opcoes',
        opcoes: [
          { valor: '0', label: 'Desativada' },
          { valor: '1', label: 'A cada 6 meses' },
          { valor: '2', label: 'A cada 12 meses' },
        ] },
    ],
  },
];
