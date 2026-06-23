'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, qs, FILIAL } from '@/lib/api';
import { ApiWrite, AgendaResponse, ClienteResponse, AnimalResponse, Cliente, Animal } from '@/types/petshop';

/** Retorna o próximo número provável da agenda (último id gravado + 1). */
export async function getProximoNumeroAgenda(): Promise<number | null> {
  try {
    const res = await apiFetch<AgendaResponse>(
      `/api/petshop/agenda${qs({ filial: FILIAL, limit: 1, orderby: 'AG_ID desc' })}`,
    );
    const ultimo = (res.dados ?? [])[0]?.id;
    return ultimo ? ultimo + 1 : null;
  } catch {
    return null;
  }
}

/** Busca clientes por texto (nome, CPF, telefone) */
export async function buscarClientes(q: string): Promise<Cliente[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<ClienteResponse>(
    `/api/petshop/clientes/busca-rapida${qs({ q: q.trim(), filial: FILIAL })}`,
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

/** Busca animais por nome do pet (retorna o animal + dados do dono) */
export async function buscarPorPet(q: string): Promise<AnimalBuscaItem[]> {
  if (!q.trim()) return [];
  const res = await apiFetch<AnimalBuscaResponse>(
    `/api/petshop/animais/busca-rapida${qs({ q: q.trim(), filial: FILIAL })}`,
  ).catch(() => ({ dados: [] as AnimalBuscaItem[], Count: 0 }));
  return res.dados;
}

/**
 * Busca combinada: "pet / dono" ou "dono / pet"
 * Busca pets pelo primeiro termo e filtra pelo segundo no nome do dono,
 * depois repete invertendo — e mescla os resultados.
 */
export async function buscarCombinado(
  termoA: string,
  termoB: string,
): Promise<AnimalBuscaItem[]> {
  const normalize = (s: string) => s.trim().toLowerCase();
  const nA = normalize(termoA);
  const nB = normalize(termoB);

  // Busca em paralelo: pets pelo termoA e pets pelo termoB
  const [porA, porB] = await Promise.all([
    buscarPorPet(termoA),
    buscarPorPet(termoB),
  ]);

  const seen = new Set<number>();
  const resultado: AnimalBuscaItem[] = [];

  // porA → filtra onde nome_cliente contém termoB
  for (const a of porA) {
    if (seen.has(a.id)) continue;
    if (a.nome_cliente.toLowerCase().includes(nB)) {
      seen.add(a.id);
      resultado.push(a);
    }
  }

  // porB → filtra onde nome_cliente contém termoA (ordem invertida)
  for (const a of porB) {
    if (seen.has(a.id)) continue;
    if (a.nome_cliente.toLowerCase().includes(nA)) {
      seen.add(a.id);
      resultado.push(a);
    }
  }

  return resultado.slice(0, 10);
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
export async function buscarProdutos(busca: string): Promise<ProdutoResultado[]> {
  if (busca.trim().length < 3) return [];
  const res = await apiFetch<{ dados: ProdutoResultado[]; Count: number }>(
    `/api/petshop/produtos?filial=${FILIAL}&busca=${encodeURIComponent(busca.trim())}&limit=50`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return res.dados;
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

// ─── (criarClienteRapido e criarAnimalRapido removidos) ──────────────────────
// Usar diretamente NovoClienteDialog e NovoAnimalDialog com modo embutido.

// Mantido apenas para compatibilidade de import — remover se não usado
const up = (v: FormDataEntryValue | null) =>
  ((v as string | null)?.trim() ?? '').toUpperCase();

/** @deprecated Usar NovoClienteDialog com onCriado */
export async function criarClienteRapido(
  formData: FormData,
): Promise<{ error?: string; cliente?: Cliente }> {
  const nome = up(formData.get('nome'));
  if (!nome) return { error: 'Nome é obrigatório.' };

  const body = {
    filial:          FILIAL,
    nome,
    nome_fantasia:   up(formData.get('nome_fantasia')),
    cpf_cnpj:        formData.get('cpf_cnpj')       ?? '',
    telefone:        formData.get('telefone')        ?? '',
    celular:         formData.get('celular')         ?? '',
    email:           formData.get('email')           ?? '',
    endereco:        up(formData.get('endereco')),
    numero:          up(formData.get('numero')),
    bairro:          up(formData.get('bairro')),
    cidade:          up(formData.get('cidade')),
    uf:              up(formData.get('uf')),
    cep:             formData.get('cep')             ?? '',
    data_nascimento: formData.get('data_nascimento') ?? '',
    comentario:      up(formData.get('comentario')),
    pessoa:          formData.get('pessoa')          ?? 'F',
    situacao:        'A',
  };

  let res: ApiWrite;
  try {
    res = await apiFetch<ApiWrite>('/api/petshop/clientes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Não foi possível conectar ao servidor.' };
  }
  if (res.CodStatus !== 1) return { error: res.DescricaoStatus };

  const cliente: Cliente = {
    id:              res.id as number,
    filial:          FILIAL,
    nome:            body.nome,
    nome_fantasia:   body.nome_fantasia,
    cpf_cnpj:        String(body.cpf_cnpj),
    telefone:        String(body.telefone),
    telefone2:       '',
    celular:         String(body.celular),
    email:           String(body.email),
    contato:         '',
    endereco:        body.endereco,
    numero:          body.numero,
    complemento:     '',
    bairro:          body.bairro,
    cidade:          body.cidade,
    uf:              body.uf,
    cep:             String(body.cep),
    data_cadastro:   '',
    data_nascimento: String(body.data_nascimento),
    situacao:        'A',
    pessoa:          String(body.pessoa),
    comentario:      body.comentario,
    ie:              '',
    atacadista:      0,
    mei:             0,
    status_ativo:    0,
    saldo_disponivel: 0,
    data_ult_compra: '',
  };
  return { cliente };
}

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
    filial:          FILIAL,
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
    filial:          FILIAL,
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
export async function buscarAnimais(clienteId: number): Promise<Animal[]> {
  if (!clienteId) return [];
  const res = await apiFetch<AnimalResponse>(
    `/api/petshop/animais?filial=${FILIAL}&limit=50&filter1=a.PET_FK_ID_CLIENTE=${clienteId}`,
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

  const body = {
    filial:           FILIAL,
    cliente_id:       clienteId,
    cliente_filial:   Number(formData.get('cliente_filial') || FILIAL),
    cliente_nome:     formData.get('cliente_nome')   ?? '',
    data:             dataPart,
    hora:             horaPart ? horaPart + ':00' : '',
    animal_id:        Number(formData.get('animal_id')    || 0),
    animal_filial:    Number(formData.get('animal_filial') || FILIAL),
    animal_nome:      formData.get('animal_nome')    ?? '',
    raca:             formData.get('raca')           ?? '',
    prof_id:          Number(formData.get('prof_id')      || 0),
    prof_filial:      Number(formData.get('prof_filial')   || FILIAL),
    prof_nome:        formData.get('prof_nome')      ?? '',
    vend_id:          Number(formData.get('vend_id')      || 0),
    vend_filial:      Number(formData.get('vend_filial')   || FILIAL),
    servico_id:       Number(formData.get('servico_id')    || 0),
    servico_filial:   Number(formData.get('servico_filial') || FILIAL),
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
  return { id: res.id as number };
}
