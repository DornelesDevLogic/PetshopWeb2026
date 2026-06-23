import { apiFetch, qs, FILIAL } from '@/lib/api';
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
    nome_fantasia:   [a.nome, a.apelido && a.apelido !== a.nome ? `(${a.apelido})` : '', a.especie]
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
    status_ativo:    a.ativo === 1 ? 0 : 1,
    pessoa:          'F',
    comentario:      '',
    ie:              '',
    atacadista:      0,
    mei:             0,
    saldo_disponivel: 0,
    data_ult_compra: '',
  };
}

async function buscarPorPet(termo: string): Promise<AnimalBusca[]> {
  const res = await apiFetch<AnimalBuscaResponse>(
    `/api/petshop/animais/busca-rapida${qs({ q: termo, filial: FILIAL })}`,
  ).catch(() => ({ dados: [], Count: 0 }));
  return res.dados ?? [];
}

export default async function ClientesPage({ searchParams }: Props) {
  // qPet mantido para compatibilidade com URLs antigas; novo fluxo usa só q
  const q        = searchParams.q        ?? '';
  const qPet     = searchParams.qPet     ?? '';
  const situacao = searchParams.situacao ?? 'A';
  const skip     = Number(searchParams.skip ?? 0);

  let clientes: ClienteResponse['dados'] = [];
  let total = 0;

  // Termo efetivo: campo unificado (q) tem prioridade sobre qPet legado
  const termo = (q || qPet).trim();

  if (termo.includes('/')) {
    // Sintaxe "dono / pet" — busca cruzada entre nome do dono e nome do pet
    const [parteA, parteB] = termo.split('/').map((s) => s.trim());

    if (parteA && parteB) {
      const nA = parteA.toLowerCase();
      const nB = parteB.toLowerCase();

      const [porPet, porDono] = await Promise.all([
        buscarPorPet(parteB),
        buscarPorPet(parteA),
      ]);

      const seenAnimal = new Set<number>();
      const animais: AnimalBusca[] = [];

      for (const a of porPet) {
        if (a.nome_cliente.toLowerCase().includes(nA) && !seenAnimal.has(a.id)) {
          seenAnimal.add(a.id);
          animais.push(a);
        }
      }
      for (const a of porDono) {
        if (a.nome.toLowerCase().includes(nB) && !seenAnimal.has(a.id)) {
          seenAnimal.add(a.id);
          animais.push(a);
        }
      }

      const seenCli = new Set<number>();
      for (const a of animais) {
        if (seenCli.has(a.id_cliente)) continue;
        seenCli.add(a.id_cliente);
        clientes.push(montarClienteParcial(a));
      }
      total = clientes.length;
    }

  } else if (termo) {
    // Campo unificado: busca em paralelo por nome do cliente E nome do pet
    const [cliRes, animais] = await Promise.all([
      apiFetch<ClienteResponse>(
        `/api/petshop/clientes/busca-rapida${qs({ q: termo, filial: FILIAL })}`,
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

  } else {
    // Listagem paginada com filtro de situação
    const filtroStatus =
      situacao === 'A' ? '&filter1=s.STATUS_ATIVO=0' :
      situacao === 'I' ? '&filter1=s.STATUS_ATIVO=1' : '';
    const endpoint =
      `/api/petshop/clientes${qs({ filial: FILIAL, limit: LIMIT, skip })}` +
      filtroStatus;
    const res = await apiFetch<ClienteResponse>(endpoint).catch(() => ({
      dados: [], Count: 0, StartsAt: '', EndsAt: '',
    }));
    clientes = res.dados ?? [];
    total    = res.Count ?? 0;
  }

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
