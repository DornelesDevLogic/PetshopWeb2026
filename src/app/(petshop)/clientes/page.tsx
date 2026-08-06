import { apiFetch, qs, getFilial } from '@/lib/api';
import { ClienteResponse } from '@/types/petshop';
import ClientesView from '@/components/petshop/clientes/ClientesView';

interface Props {
  searchParams: { q?: string; qPet?: string; situacao?: string; skip?: string };
}

interface AnimalBusca {
  id: number;
  filial: number;
  nome: string;
  apelido: string;
  especie: string;
  raca: string;
  id_cliente: number;
  nome_cliente: string;
  sexo: string;
  ativo: number;
  obito: number;
}

interface AnimalBuscaResponse {
  dados: AnimalBusca[];
  Count: number;
}

const LIMIT = 50;

function montarClienteParcial(a: AnimalBusca): ClienteResponse['dados'][number] {
  return {
    id:              a.id_cliente,
    filial:          a.filial,
    nome:            a.nome_cliente,
    nome_fantasia:   [a.nome, a.apelido ? `microchip: ${a.apelido}` : '', a.especie]
      .filter(Boolean).join(' · '),
    cpf_cnpj:        '',
    telefone:        '',
    telefone2:       '',
    celular:         '',
    email:           '',
    contato:         '',
    endereco:        '',
    numero:          '',
    complemento:     '',
    bairro:          '',
    cidade:          '',
    uf:              '',
    cep:             '',
    data_cadastro:   '',
    data_nascimento: '',
    situacao:        '',
    // Animal.ativo e Cliente.status_ativo usam a mesma convenção do legado
    // (1 = inativo) — repassa direto, sem inverter.
    status_ativo:    a.ativo === 1 ? 1 : 0,
    pessoa:          'F',
    comentario:      '',
    ie:              '',
    atacadista:      0,
    mei:             0,
    saldo_disponivel: 0,
    data_ult_compra: '',
  };
}

async function buscarPorPet(termo: string, termo2?: string): Promise<AnimalBusca[]> {
  const res = await apiFetch<AnimalBuscaResponse>(
    `/api/petshop/animais/busca-rapida${qs({ q: termo, q2: termo2, filial: getFilial() })}`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return res.dados ?? [];
}

/** Nomes dos pets ativos do cliente, para exibir embaixo do nome nos resultados de busca */
async function buscarNomesPetsDoCliente(clienteId: number, filial: number): Promise<string> {
  const res = await apiFetch<AnimalBuscaResponse>(
    `/api/petshop/animais${qs({ filial, limit: 20, filter1: `a.PET_FK_ID_CLIENTE=${clienteId} AND a.ATIVO<>1` })}`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return (res.dados ?? []).map((a) => a.nome).filter(Boolean).join(', ');
}

/** Preenche pets_resumo em paralelo para uma lista de clientes já montada */
async function anexarPetsResumo(clientes: ClienteResponse['dados']): Promise<void> {
  await Promise.all(
    clientes.map(async (c) => {
      c.pets_resumo = await buscarNomesPetsDoCliente(c.id, c.filial);
    }),
  );
}

export default async function ClientesPage({ searchParams }: Props) {
  // qPet mantido para compatibilidade com URLs antigas; novo fluxo usa só q
  const q        = searchParams.q        ?? '';
  const qPet     = searchParams.qPet     ?? '';
  // situacao vazia = nenhum filtro aplicado ainda → tela abre sem listar
  const situacao = searchParams.situacao ?? '';
  const skip     = Number(searchParams.skip ?? 0);

  let clientes: ClienteResponse['dados'] = [];
  let total = 0;

  // Termo efetivo: campo unificado (q) tem prioridade sobre qPet legado
  const termo = (q || qPet).trim();

  if (termo.includes('/')) {
    // Sintaxe "dono / pet" ou "pet / dono" — a ordem não importa, o backend
    // exige que os dois termos apareçam (em qualquer campo), já escopado
    // pela filial atual.
    const [parteA, parteB] = termo.split('/').map((s) => s.trim());

    if (parteA && parteB) {
      const animais = await buscarPorPet(parteA, parteB);

      const seenCli = new Set<number>();
      for (const a of animais) {
        if (seenCli.has(a.id_cliente)) continue;
        seenCli.add(a.id_cliente);
        clientes.push(montarClienteParcial(a));
      }
      total = clientes.length;
      await anexarPetsResumo(clientes);
    }

  } else if (termo) {
    // Campo unificado: busca em paralelo por nome do cliente E nome do pet
    const [cliRes, animais] = await Promise.all([
      apiFetch<ClienteResponse>(
        `/api/petshop/clientes/busca-rapida${qs({ q: termo, filial: getFilial() })}`,
      ).catch(() => ({ dados: [] as ClienteResponse['dados'], Count: 0, StartsAt: '', EndsAt: '' })),
      buscarPorPet(termo),
    ]);

    // Começa com resultados de clientes (têm dados completos)
    const seenCli = new Set<number>();
    for (const c of (cliRes.dados ?? [])) {
      seenCli.add(c.id);
      clientes.push(c);
    }

    // Adiciona clientes encontrados via pet (sem duplicar)
    for (const a of animais) {
      if (seenCli.has(a.id_cliente)) continue;
      seenCli.add(a.id_cliente);
      clientes.push(montarClienteParcial(a));
    }

    total = clientes.length;
    await anexarPetsResumo(clientes);

  } else if (situacao || skip > 0) {
    // Listagem paginada — só executa quando o usuário aplicou algum filtro
    const filtroStatus =
      situacao === 'I' ? '&filter1=s.STATUS_ATIVO=1' :
      situacao === 'todos' ? '' : '&filter1=s.STATUS_ATIVO=0';
    const endpoint =
      `/api/petshop/clientes${qs({ filial: getFilial(), limit: LIMIT, skip })}` +
      filtroStatus;
    const res = await apiFetch<ClienteResponse>(endpoint).catch(() => ({
      dados: [], Count: 0, StartsAt: '', EndsAt: '',
    }));
    clientes = res.dados ?? [];
    total    = res.Count ?? 0;
  }
  // sem termo e sem filtro → tela abre vazia

  return (
    <ClientesView
      clientes={clientes}
      total={total}
      qAtual={q || qPet}
      qPetAtual=""
      situacaoAtual={situacao}
      skipAtual={skip}
      limit={LIMIT}
    />
  );
}
