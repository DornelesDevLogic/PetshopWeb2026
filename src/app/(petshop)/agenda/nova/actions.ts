'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, getFilial } from '@/lib/api';
import { agendaHub } from '@/lib/agenda-events';
import {
  ApiWrite, AgendaResponse, ClienteResponse, AnimalResponse, Cliente, Animal,
  ProfissionalResponse, ServicoResponse, EspecieResponse, RacaResponse, TipoPeloResponse, VendedorResponse,
  Profissional, Servico, Especie, Raca, TipoPelo, Vendedor,
  AgendaItem, AgendaItensResponse, AgendaItemServico,
} from '@/types/petshop';

/**
 * Carrega as listas de referência do formulário de agenda (profissionais,
 * serviços, espécies, raças, pelos, vendedores) + próximo número, em paralelo.
 * Usado para carregamento progressivo: o formulário abre na hora e busca isto
 * em segundo plano, enquanto o usuário seleciona o cliente.
 */
export interface ListasFormAgenda {
  profissionais: Profissional[];
  servicos:      Servico[];
  especies:      Especie[];
  racas:         Raca[];
  pelos:         TipoPelo[];
  vendedores:    Vendedor[];
  proximoNumero: number | null;
}

export async function carregarListasFormAgenda(filialParam?: number): Promise<ListasFormAgenda> {
  const filial = filialParam || getFilial();
  const empty = { dados: [], Count: 0, StartsAt: '', EndsAt: '' };
  const [prof, serv, esp, rac, pel, vend, prox] = await Promise.all([
    apiFetch<ProfissionalResponse>(`/api/petshop/profissionais${qs({ filial, limit: 500 })}`).catch(() => empty),
    apiFetch<ServicoResponse>(`/api/petshop/servicos${qs({ filial, limit: 200 })}`).catch(() => empty),
    apiFetch<EspecieResponse>(`/api/petshop/especies${qs({ filial, limit: 100 })}`).catch(() => empty),
    apiFetch<RacaResponse>(`/api/petshop/racas${qs({ filial, limit: 3000 })}`).catch(() => empty),
    apiFetch<TipoPeloResponse>(`/api/petshop/tipos-pelo${qs({ filial, limit: 100 })}`).catch(() => empty),
    apiFetch<VendedorResponse>(`/api/petshop/vendedores${qs({ filial, limit: 200 })}`).catch(() => empty),
    getProximoNumeroAgenda(filial),
  ]);
  return {
    // Somente profissionais ativos (STATUS_ATIVO <> 1, convenção do legado)
    profissionais: (prof.dados as Profissional[]).filter((p) => p.status_ativo !== 1),
    servicos:      serv.dados as Servico[],
    especies:      esp.dados  as Especie[],
    racas:         rac.dados  as Raca[],
    pelos:         pel.dados  as TipoPelo[],
    vendedores:    vend.dados as Vendedor[],
    proximoNumero: prox,
  };
}

/** Retorna o próximo número provável da agenda (último id gravado + 1). */
export async function getProximoNumeroAgenda(filialParam?: number): Promise<number | null> {
  try {
    const res = await apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({ filial: filialParam || getFilial(), limit: 1, orderby: 'AG_ID desc' })}`,
    );
    const ultimo = (res.dados ?? [])[0]?.id;
    return ultimo ? ultimo + 1 : null;
  } catch {
    return null;
  }
}

/** Busca clientes por texto (nome, CPF, telefone) */
export async function buscarClientes(q: string, filialParam?: number): Promise<Cliente[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ClienteResponse>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: filialParam || getFilial() })}`,
  ).catch(() => ({ dados: [] as Cliente[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados.slice(0, 10);
}

export interface AnimalBuscaItem {
  id:           number;
  filial:       number;
  nome:         string;
  apelido:      string;
  especie:      string;
  raca:         string;
  id_cliente:   number;
  nome_cliente: string;
  sexo:         string;
  ativo:        number;
  obito:        number;
}

interface AnimalBuscaResponse { dados: AnimalBuscaItem[]; Count: number }

/** Busca animais por nome do pet (retorna o animal + dados do dono). `q2`,
 * quando informado, exige que o resultado bata TAMBÉM com esse segundo termo
 * (em qualquer um dos campos) — usado pra busca combinada "dono/pet". */
export async function buscarPorPet(q: string, filialParam?: number, q2?: string): Promise<AnimalBuscaItem[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<AnimalBuscaResponse>(
    `/api/petshop/animais/busca-rapida${qs({ q: q.trim(), q2: q2?.trim() || undefined, filial: filialParam || getFilial() })}`,
  ).catch(() => ({ dados: [] as AnimalBuscaItem[], Count: 0 }));
  return res.dados;
}

/**
 * Busca combinada: "pet / dono" ou "dono / pet" — a ordem não importa, o
 * backend exige que os dois termos apareçam (em qualquer campo: nome do
 * pet, apelido ou nome do dono), já escopado pela filial atual.
 */
export async function buscarCombinado(
  termoA: string,
  termoB: string,
  filialParam?: number,
): Promise<AnimalBuscaItem[]> {
  return (await buscarPorPet(termoA, filialParam, termoB)).slice(0, 10);
}

// ─── Produtos ────────────────────────────────────────────────────────────────

export interface ProdutoResultado {
  id_dadospro:  number;
  cod_filial:   number;
  nome_produto: string;
  unidade:      string;
  preco:        number;
  secao:        string;
  grupo:        string;
  cod_pro:      string;
  estoque:      number;
}

/** Busca produtos por nome (mín. 3 chars) */
export async function buscarProdutos(busca: string, filialParam?: number): Promise<ProdutoResultado[]> {
  if (busca.trim().length < 3) return [];
  const res = await apiFetch<{ dados: ProdutoResultado[]; Count: number }>(
    `/api/petshop/produtos?filial=${filialParam || getFilial()}&busca=${encodeURIComponent(busca.trim())}&limit=50`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return res.dados;
}

export interface ProdutoCategoriaOpcao extends ProdutoResultado {
  nome_opcao: string;   // rótulo livre da regra (ex: "Diária"/"Mensal") — vazio se só houver 1 opção
}

/**
 * Categoria de Serviço: busca se existe(m) regra(s) cadastrada(s) para
 * (raça do animal + serviço escolhido) e retorna a lista de produtos
 * correspondentes. Tenta raça específica primeiro; se não achar, cai para a
 * regra genérica (sem raça). Se não existir nenhuma regra (ou o produto não
 * estiver mais ativo), retorna array vazio — nesse caso o fluxo segue normal,
 * com seleção manual do serviço pelo atendente. Se vier mais de uma opção,
 * quem chama deve perguntar ao usuário qual usar antes de inserir.
 */
export async function buscarProdutoPorCategoria(
  racaId: number,
  servicoId: number,
): Promise<ProdutoCategoriaOpcao[]> {
  if (!servicoId) return [];
  interface OpcaoResp {
    id_dadospro: number;
    filial: number;
    cod_pro: string;
    descricao: string;
    unidade: string;
    preco: number;
    estoque: number;
    nome_opcao: string;
  }
  interface Resp {
    CodStatus: number;
    opcoes?: OpcaoResp[];
  }
  const res = await apiFetch<Resp>(
    `/api/petshop/categoria-servico/buscar${qs({ filial: getFilial(), raca_id: racaId || undefined, servico_id: servicoId })}`,
  ).catch(() => ({ CodStatus: -5 }) as Resp);
  if (res.CodStatus !== 1 || !res.opcoes?.length) return [];
  return res.opcoes.map((o) => ({
    id_dadospro:  o.id_dadospro,
    cod_filial:   o.filial ?? getFilial(),
    nome_produto: o.descricao ?? '',
    unidade:      o.unidade ?? '',
    preco:        o.preco ?? 0,
    secao:        '',
    grupo:        '',
    cod_pro:      o.cod_pro ?? '',
    estoque:      o.estoque ?? 0,
    nome_opcao:   o.nome_opcao ?? '',
  }));
}

/** Adiciona um item a uma agenda já criada */
export async function adicionarItemNaAgenda(
  agendaId:    number,
  filial:      number,
  dadosproId:  number,
  prodFilial:  number,
  qtd:         number,
  valor:       number,
  desconto:    number,
  descricao:   string,
  descPro:     string,   // nome do produto (DESC_PRO)
  precoTabela: number,   // preço de tabela
  codProd?:    string,   // código do produto (opcional)
): Promise<{ error?: string }> {
  try {
    const res = await apiFetch<ApiWrite>('/api/petshop/agenda/itens', {
      method: 'POST',
      body: JSON.stringify({
        agenda_id: agendaId, agenda_filial: filial,
        dadospro_id: dadosproId, prod_filial: prodFilial,
        qtd, valor, desconto, descricao,
        desc_pro:     descPro,
        preco_tabela: precoTabela,
        cod_prod:     codProd ?? '',
      }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath(`/agenda/${agendaId}`);
    return {};
  } catch {
    return { error: 'Erro ao adicionar produto.' };
  }
}

// ─── (criarClienteRapido removido) ───────────────────────────────────────────
// Estava @deprecated, sem nenhum import em uso, e com os mesmos bugs de
// clientes/actions.ts (situacao fixa em 'A' em vez de 'L'). Usar diretamente
// NovoClienteDialog/NovoClienteModal, que chamam clientes/actions.ts.

const up = (v: FormDataEntryValue | null) =>
  ((v as string | null)?.trim() ?? '').toUpperCase();

// ─── Criar animal rápido ──────────────────────────────────────────────────────

/** Cria um novo animal para um cliente e retorna o objeto para seleção imediata */
export async function criarAnimalRapido(
  clienteId:     number,
  clienteFilial: number,
  formData:      FormData,
): Promise<{ error?: string; animal?: Animal }> {
  const nome = up(formData.get('nome'));
  if (!nome) return { error: 'Nome é obrigatório.' };

  const body = {
    filial:          getFilial(),
    id_cliente:      clienteId,
    filial_cliente:  clienteFilial,
    nome,
    apelido:         up(formData.get('apelido')),
    id_especie:      Number(formData.get('id_especie') || 0),
    especie:         String(formData.get('especie') ?? ''),
    id_raca:         Number(formData.get('id_raca') || 0),
    raca:            String(formData.get('raca') ?? ''),
    id_pelo:         Number(formData.get('id_pelo') || 0),
    pelo:            String(formData.get('pelo') ?? ''),
    sexo:            String(formData.get('sexo') ?? ''),
    castrado:        Number(formData.get('castrado') || 0),
    data_nascimento: String(formData.get('data_nascimento') ?? ''),
    peso:            String(formData.get('peso') ?? ''),
    cor:             String(formData.get('cor') ?? ''),
    tipo_animal:     String(formData.get('tipo_animal') ?? ''),
    obs:             String(formData.get('obs') ?? ''),
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/animais', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  const animal: Animal = {
    id:              res.id as number,
    filial:          getFilial(),
    nome:            body.nome,
    apelido:         body.apelido,
    especie:         body.especie,
    raca:            body.raca,
    pelo:            body.pelo,
    sexo:            body.sexo,
    castrado:        body.castrado,
    data_nascimento: body.data_nascimento,
    peso:            body.peso,
    cor:             body.cor,
    tipo_animal:     body.tipo_animal,
    id_especie:      body.id_especie,
    id_raca:         body.id_raca,
    id_pelo:         body.id_pelo,
    id_cliente:      clienteId,
    filial_cliente:  clienteFilial,
    nome_cliente:    '',
    ativo:           1,
    obito:           0,
    obs:             body.obs,
    id_veterinario:  0,
    veterinario:     '',
  };
  return { animal };
}

// ─── Animais ─────────────────────────────────────────────────────────────────

/** Carrega animais de um cliente */
export async function buscarAnimais(clienteId: number, filialParam?: number): Promise<Animal[]> {
  if (!clienteId) return [];
  // Convenção do legado: PET_CADANIMAL.ATIVO = 1 significa INATIVO (invertido,
  // igual STATUS_ATIVO de clientes/técnicos). Só pets ativos (ATIVO <> 1) devem
  // aparecer para seleção ao criar um agendamento.
  const res = await apiFetch<AnimalResponse>(
    `/api/petshop/animais?filial=${filialParam || getFilial()}&limit=50&filter1=a.PET_FK_ID_CLIENTE=${clienteId} AND a.ATIVO<>1`,
  ).catch(() => ({ dados: [] as Animal[], Count: 0, StartsAt: '', EndsAt: '' }));
  return res.dados;
}

/** Cria um novo agendamento */
export async function createAgenda(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string; id?: number }> {
  const clienteId       = Number(formData.get('cliente_id') || 0);
  const dataPrevisaoRaw = (formData.get('data_previsao') as string | null) ?? '';
  const dataEntregaRaw  = (formData.get('data_entrega')  as string | null) ?? '';
  const [dataPart, horaPart] = dataPrevisaoRaw.includes('T')
    ? dataPrevisaoRaw.split('T')
    : ['', ''];

  if (!clienteId) return { error: 'Selecione um cliente.' };
  if (!dataPart)  return { error: 'Início previsto é obrigatório.' };

  const valor    = parseFloat((formData.get('valor')    as string || '0').replace(',', '.')) || 0;
  const desconto = parseFloat((formData.get('desconto') as string || '0').replace(',', '.')) || 0;
  // Filial de destino da agenda: a que o usuário escolheu no formulário
  // (pode ser diferente da filial da sessão, ao inserir em outra loja).
  const filialAlvo = Number(formData.get('filial')) || getFilial();

  const body = {
    filial:           filialAlvo,
    cliente_id:       clienteId,
    cliente_filial:   Number(formData.get('cliente_filial') || filialAlvo),
    cliente_nome:     formData.get('cliente_nome')   ?? '',
    data:             dataPart,
    hora:             horaPart ? horaPart + ':00' : '',
    animal_id:        Number(formData.get('animal_id')    || 0),
    animal_filial:    Number(formData.get('animal_filial') || filialAlvo),
    animal_nome:      formData.get('animal_nome')    ?? '',
    raca:             formData.get('raca')           ?? '',
    prof_id:          Number(formData.get('prof_id')      || 0),
    prof_filial:      Number(formData.get('prof_filial')   || filialAlvo),
    prof_nome:        formData.get('prof_nome')      ?? '',
    vend_id:          Number(formData.get('vend_id')      || 0),
    vend_filial:      Number(formData.get('vend_filial')   || filialAlvo),
    servico_id:       Number(formData.get('servico_id')    || 0),
    servico_filial:   Number(formData.get('servico_filial') || filialAlvo),
    servico_nome:     formData.get('servico_nome')   ?? '',
    valor,
    desconto,
    obs:              formData.get('obs')            ?? '',
    tipo_ocorrencia:  1,
    data_previsao:    dataPrevisaoRaw,
    data_entrega:     dataEntregaRaw,
    peso:             parseFloat((formData.get('peso') as string || '0').replace(',', '.')) || 0,
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/agenda', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }

  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  revalidatePath('/agenda');

  const novoId = res.id as number;
  agendaHub.publish({ tipo: 'AGENDA_ALTERADA', acao: 'INSERT', idAgenda: novoId, filial: filialAlvo, dataAgenda: dataPart });

  return { id: novoId };
}

// ─── Agendar retorno (equivalente ao "Agendar retorno" do sistema antigo) ────

export interface SugestaoRetorno {
  dataBase:      string;
  intervaloDias: number;
}

/**
 * Sugere data-base e intervalo de dias para o retorno, com base na regra
 * cadastrada em PET_CRIAREGRARACAO para o(s) produto(s) da agenda de origem
 * (mesma fonte usada no legado); se não houver regra, sugere 30 dias.
 */
export async function sugerirRetornoAgenda(agendaId: number, filial: number): Promise<SugestaoRetorno> {
  try {
    const res = await apiFetch<{ data_base?: string; intervalo_dias?: number; CodStatus?: number }>(
      `/api/petshop/agenda/retorno-sugestao${qs({ id: agendaId, filial })}`,
    );
    return {
      dataBase:      res.data_base ?? new Date().toISOString().split('T')[0],
      intervaloDias: res.intervalo_dias ?? 30,
    };
  } catch {
    return { dataBase: new Date().toISOString().split('T')[0], intervaloDias: 30 };
  }
}

/**
 * Cria as agendas de retorno (equivalente ao "Agendar retorno" do legado):
 * copia cliente/animal/profissional/serviço/produtos da agenda de origem em
 * "quantidade" novas agendas, espaçadas por "intervaloDias".
 */
export async function criarRetornoAgenda(
  agendaOrigemId: number,
  filial:         number,
  quantidade:     number,
  intervaloDias:  number,
  dataBase:       string,
): Promise<{ error?: string; ids?: number[] }> {
  try {
    const res = await apiFetch<ApiWrite & { ids?: number[] }>('/api/petshop/agenda/retorno', {
      method: 'POST',
      body: JSON.stringify({
        id: agendaOrigemId,
        filial,
        quantidade,
        intervalo_dias: intervaloDias,
        data_base: dataBase,
      }),
    });
    if (res.CodStatus !== 1) return { error: res.DescricaoStatus };
    revalidatePath('/agenda');
    return { ids: res.ids };
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
}

// ─── Últimas agendas do animal (produtos + valor, pra referência rápida) ────

export interface UltimaAgendaComItens {
  agenda: AgendaItem;
  itens:  AgendaItemServico[];
}

/**
 * Busca as 2 últimas agendas do pet (mais recentes primeiro, por ID — mais
 * confiável que ordenar pelas datas retornadas, que vêm em formatos
 * inconsistentes do backend), já com os produtos/serviços de cada uma.
 * Usado no botão "ver últimas agendas" ao montar um agendamento novo, pra
 * o atendente conferir rapidamente o que foi feito/cobrado da última vez.
 */
export async function buscarUltimasAgendasAnimal(
  animalId: number,
  animalFilial: number,
): Promise<UltimaAgendaComItens[]> {
  if (!animalId) return [];
  const lista = await apiFetch<AgendaResponse>(
    `/api/petshop/agenda${qs({ filial: animalFilial, animal_id: animalId, status: 'todos', limit: 50 })}`,
  ).catch(() => ({ dados: [] as AgendaItem[], Count: 0, StartsAt: '', EndsAt: '' }));

  const ultimasDuas = [...(lista.dados ?? [])]
    .sort((a, b) => b.id - a.id)
    .slice(0, 2);

  return Promise.all(
    ultimasDuas.map(async (agenda) => {
      const itensRes = await apiFetch<AgendaItensResponse>(
        `/api/petshop/agenda/itens${qs({ id: agenda.id, filial: agenda.filial ?? animalFilial })}`,
      ).catch(() => ({ agenda_id: agenda.id, dados: [] as AgendaItemServico[], Count: 0, StartsAt: '', EndsAt: '' }));
      return { agenda, itens: itensRes.dados ?? [] };
    }),
  );
}
