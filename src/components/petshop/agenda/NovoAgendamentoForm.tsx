'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  buscarClientes,
  buscarPorPet,
  buscarCombinado,
  buscarAnimais,
  buscarProdutos,
  buscarProdutoPorCategoria,
  adicionarItemNaAgenda,
  createAgenda,
  carregarListasFormAgenda,
  sugerirRetornoAgenda,
  criarRetornoAgenda,
  buscarUltimasAgendasAnimal,
  buscarValorUltimoServico,
  type AnimalBuscaItem,
  type ProdutoResultado,
  type ProdutoCategoriaOpcao,
  type UltimaAgendaComItens,
} from '@/app/(petshop)/agenda/nova/actions';
import {
  verificarRegrasProdutos,
  criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import { useAutorizacaoDesconto } from '@/components/petshop/shared/useAutorizacaoDesconto';
import VerTodosResultadosModal from '@/components/petshop/agenda/VerTodosResultadosModal';
import { Cliente, Animal, Profissional, Servico, Especie, Raca, TipoPelo, Vendedor, AgendaDetalhe } from '@/types/petshop';
import { editarAgenda } from '@/app/(petshop)/agenda/editar/actions';
import { excluirItemAgenda, atualizarItemAgenda } from '@/app/(petshop)/agenda/[id]/actions';
import EditableValor from '@/components/petshop/EditableValor';
import { updateCliente, buscarCep, buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { updateAnimal } from '@/app/(petshop)/animais/[id]/actions';
import NovoClienteDialog from '@/components/petshop/clientes/NovoClienteDialog';
import NovoAnimalDialog from '@/components/petshop/animais/NovoAnimalDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  PawPrint,
  X,
  Search,
  PackageSearch,
  Trash2,
  Plus,
  Pencil,
  Check,
  AlertTriangle,
  Eye,
  History,
} from 'lucide-react';
// Label e Select ainda usados nos dialogs de produto inline

import { cn } from '@/lib/utils';
import MicrochipBadge from '@/components/petshop/animais/MicrochipBadge';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';

interface ProdutoPendente extends ProdutoResultado {
  qtd:      number;
  valor:    number;
  desconto: number;
  // Presente quando o item foi inserido automaticamente por uma regra de
  // Categoria de Serviço (ver handleServicoChange/buscarProdutoPorCategoria)
  // — id da regra em PET_SERVICO_CAT, só pra referência na tela.
  id_categoria?: number;
}

export interface ItemSalvo {
  id_item:  number;
  cod_pro:  string;
  produto:  string;
  unidade:  string;
  qtd:      number;
  valor:    number;
  desconto: number;
}

interface EstimativaPendente {
  agendaId:   number;
  dataCompra: string;
  regras:     { regra: RegraProduto; qtd: number; escolha: 'min' | 'max' }[];
}

interface Props {
  profissionais:  Profissional[];
  servicos:       Servico[];
  especies:       Especie[];
  racas:          Raca[];
  pelos:          TipoPelo[];
  vendedores:     Vendedor[];
  carregarListas?: boolean;   // carregamento progressivo: form busca as listas em background
  profInicial?:   number;     // profissional pré-selecionado (ao clicar na coluna dele na agenda)
  vendedorInicial?:       number;   // vendedor pré-selecionado (usuário logado vinculado via VENDEDOR.FK_USUARIO)
  vendedorFilialInicial?: number;
  dataInicial?:   string;
  horaInicial?:   string;
  filial:         number;
  filialHome?:    number;   // filial da sessão do usuário — se != filial, é inserção "fora da filial padrão"
  proximoNumero?: number;
  modo?:          'criar' | 'editar';
  agendaId?:      number;
  agendaInicial?: AgendaDetalhe;
  itensIniciais?: ItemSalvo[];
}

type ResultadoBusca =
  | { tipo: 'cliente'; cliente: Cliente }
  | { tipo: 'pet';    animal: AnimalBuscaItem };

const OBS_CHECKLIST = [
  'Verão', 'Hig Bar/Bumbum', 'Hig Completa', 'Pata Redonda', 'Pata Tradicional', 'Rosto Redondo',
  'Hidratação', 'Medicinal', 'Sem perfume', 'Fuco Redondo', 'Fuco Tradicional', 'Idoso/cuidado',
  'Tosa alta', 'Tosa baixa', 'Tosa geral', 'Tosa padrão', 'Alisamento lâmina',
];

export default function NovoAgendamentoForm({
  profissionais: profissionaisIniciais,
  servicos:      servicosIniciais,
  especies:      especiesIniciais,
  racas:         racasIniciais,
  pelos:         pelosIniciais,
  vendedores:    vendedoresIniciais,
  carregarListas = false,
  profInicial,
  vendedorInicial, vendedorFilialInicial,
  dataInicial, horaInicial, filial, filialHome,
  proximoNumero: proximoNumeroInicial,
  modo = 'criar', agendaId, agendaInicial, itensIniciais,
}: Props) {
  const router = useRouter();

  // Inserção em filial diferente da filial padrão do usuário (só relevante ao criar)
  const outraFilial = modo !== 'editar' && !!filialHome && filial !== filialHome;
  const [confirmFilialOpen, setConfirmFilialOpen] = useState(false);
  const pendingSubmit = useRef<(() => void) | null>(null);

  // ── Listas de referência (carregamento progressivo) ──
  // Começam com o que veio do servidor; se `carregarListas`, o form busca em
  // segundo plano e preenche depois — o formulário abre instantaneamente.
  const [profissionais, setProfissionais] = useState(profissionaisIniciais);
  const [servicos,      setServicos]      = useState(servicosIniciais);
  const [especies,      setEspecies]      = useState(especiesIniciais);
  const [racas,         setRacas]         = useState(racasIniciais);
  const [pelos,         setPelos]         = useState(pelosIniciais);
  const [vendedores,    setVendedores]    = useState(vendedoresIniciais);
  const [proximoNumero, setProximoNumero] = useState(proximoNumeroInicial);
  const [listasCarregando, setListasCarregando] = useState(carregarListas);

  useEffect(() => {
    if (!carregarListas) return;
    let ativo = true;
    carregarListasFormAgenda(filial)
      .then((d) => {
        if (!ativo) return;
        setProfissionais(d.profissionais);
        setServicos(d.servicos);
        setEspecies(d.especies);
        setRacas(d.racas);
        setPelos(d.pelos);
        setVendedores(d.vendedores);
        setProximoNumero(d.proximoNumero ?? undefined);
        // Pré-seleciona o profissional (quando veio de um clique na coluna dele)
        if (profInicial) {
          const p = d.profissionais.find((x) => x.id === profInicial);
          if (p) { setProfId(String(p.id)); setProfNome(p.nome); setProfFilial(String(p.filial)); }
        }
      })
      .catch(() => {})
      .finally(() => { if (ativo) setListasCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregarListas]);

  // ── Busca unificada ──
  const [q, setQ]                          = useState('');
  const [resultados, setResultados]        = useState<ResultadoBusca[]>([]);
  const [isBuscando, setIsBuscando]        = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [idxCli, setIdxCli]                = useState(0);   // navegação por teclado
  const debounceRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                           = useRef<HTMLInputElement>(null);
  const dropdownRef                        = useRef<HTMLDivElement>(null);

  // ── "Ver todos os resultados" (nome comum, ex: "Amora") ──
  // A busca rápida mostra só os 6 primeiros de cada tipo; quando há mais,
  // este contador aparece pra abrir a lista completa (com filtro de raça).
  const [totaisBuscaCompleta, setTotaisBuscaCompleta] = useState({ clientes: 0, pets: 0 });
  const [modalTodosAberto, setModalTodosAberto]       = useState(false);

  // ── Desconto acima do limite: pede senha de supervisor (igual ao antigo) ──
  const { dialog: autorizDialog, comAutorizacao } = useAutorizacaoDesconto();

  // ── Cliente / Animal selecionados ──
  const [clienteSel, setClienteSel]        = useState<Cliente | null>(null);
  const [animais, setAnimais]              = useState<Animal[]>([]);
  const [animalSel, setAnimalSel]          = useState<Animal | null>(null);
  const [isLoadingAnimais, setIsLoadingAnimais] = useState(false);
  const [pesoInput, setPesoInput]          = useState('');

  // ── Edição inline de cliente / animal ──
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [editAnimalOpen,  setEditAnimalOpen]  = useState(false);
  const [salvandoCli,     setSalvandoCli]     = useState(false);
  const [salvandoAni,     setSalvandoAni]     = useState(false);
  const [erroCli,         setErroCli]         = useState('');
  const [erroAni,         setErroAni]         = useState('');

  // Campos controlados do painel de edição do cliente
  const [cliNome,     setCliNome]     = useState('');
  const [cliCelular,  setCliCelular]  = useState('');
  const [cliTelefone, setCliTelefone] = useState('');
  const [cliEmail,    setCliEmail]    = useState('');
  const [cliCpf,      setCliCpf]      = useState('');
  const [cliCep,      setCliCep]      = useState('');
  const [cliEndereco,     setCliEndereco]     = useState('');
  const [cliNumero,       setCliNumero]       = useState('');
  const [cliComplemento,  setCliComplemento]  = useState('');
  const [cliBairro,       setCliBairro]       = useState('');
  const [cliCidade,       setCliCidade]       = useState('');
  const [cliUf,           setCliUf]           = useState('');
  const [cliCepLoading,    setCliCepLoading]    = useState(false);
  const [cliCepMsg,        setCliCepMsg]        = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [cliPanelLoading,  setCliPanelLoading]  = useState(false);

  async function handleCliCepBlur() {
    const limpo = cliCep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setCliCepLoading(true);
    setCliCepMsg(null);
    const r = await buscarCep(limpo);
    setCliCepLoading(false);
    if (r) {
      setCliEndereco(r.logradouro);
      setCliBairro(r.bairro);
      setCliCidade(r.cidade);
      setCliUf(r.uf);
      setCliCepMsg({ tipo: 'ok', texto: 'Endereço preenchido automaticamente.' });
    } else {
      setCliCepMsg({ tipo: 'erro', texto: 'CEP não encontrado. Preencha manualmente.' });
    }
  }

  // Campos controlados do painel de edição do animal
  const [aniNome,      setAniNome]      = useState('');
  const [aniSexo,      setAniSexo]      = useState('');
  const [aniCastrado,  setAniCastrado]  = useState('0');
  const [aniNasc,      setAniNasc]      = useState('');
  const [aniCor,       setAniCor]       = useState('');
  const [aniObs,       setAniObs]       = useState('');
  const [aniMicrochip, setAniMicrochip] = useState('');

  // ── Carrega animais de um cliente ──
  const carregarAnimais = useCallback(async (
    clienteId: number,
    preSelId?: number,
    preSelAnimal?: Animal,
  ) => {
    setIsLoadingAnimais(true);
    try {
      const lista = (await buscarAnimais(clienteId, filial)).filter((a) => a.obito !== 1);
      setAnimais(lista);
      if (preSelId !== undefined) {
        const encontrado = lista.find((a) => a.id === preSelId) ?? preSelAnimal ?? null;
        setAnimalSel(encontrado);
        aplicarObsAutomaticaDoPet(encontrado);
      }
    } catch {
      setAnimais([]);
    } finally {
      setIsLoadingAnimais(false);
    }
  }, []);

  // ── Seleções controladas ──
  const [profId, setProfId]               = useState('');
  const [profNome, setProfNome]           = useState('');
  const [profFilial, setProfFilial]       = useState('');
  const [vendId, setVendId]               = useState('');
  const [vendFilial, setVendFilial]       = useState('');

  // Pré-seleciona o vendedor vinculado ao usuário logado (VENDEDOR.FK_USUARIO),
  // só na criação e só uma vez — não reimpõe o default se o usuário já mexeu
  // no campo. Roda de novo quando `vendedores` chega (carregamento progressivo).
  const vendedorAutoAplicado = useRef(false);
  useEffect(() => {
    if (modo !== 'criar' || vendedorAutoAplicado.current) return;
    if (!vendedorInicial || vendId) return;
    const v = vendedores.find(
      (x) => x.id === vendedorInicial && (!vendedorFilialInicial || x.filial === vendedorFilialInicial),
    );
    if (v) {
      setVendId(String(v.id));
      setVendFilial(String(v.filial));
      vendedorAutoAplicado.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendedores, vendedorInicial, vendedorFilialInicial, modo]);
  const [servicoId, setServicoId]         = useState('');
  const [servicoNome, setServicoNome]     = useState('');
  const [servicoFilial, setServicoFilial] = useState('');

  // ── Valor do último serviço (mesmo cliente+animal+serviço) ──
  // Equivalente ao "Valor ult. serviço" do Cadastro de Agenda do sistema
  // antigo — só um valor de referência pro atendente, não altera o total.
  const [valorUltimoServico, setValorUltimoServico]               = useState<number | null>(null);
  const [valorUltimoServicoCarregando, setValorUltimoServicoCarregando] = useState(false);
  useEffect(() => {
    if (!clienteSel || !animalSel || !servicoNome) { setValorUltimoServico(null); return; }
    let cancelado = false;
    setValorUltimoServicoCarregando(true);
    buscarValorUltimoServico({
      clienteId:     clienteSel.id,
      clienteFilial: clienteSel.filial,
      animalId:      animalSel.id,
      animalFilial:  animalSel.filial,
      servicoNome,
    }).then((valor) => { if (!cancelado) setValorUltimoServico(valor); })
      .finally(() => { if (!cancelado) setValorUltimoServicoCarregando(false); });
    return () => { cancelado = true; };
  }, [clienteSel, animalSel, servicoNome]);

  // ── Data/hora de previsão ──
  const [dataPrevisao, setDataPrevisao] = useState(() => {
    const dp = dataInicial || new Date().toISOString().split('T')[0];
    const hp = horaInicial || '07:00';
    return dp + 'T' + hp;
  });
  // já nasce com a mesma data/hora do início — evita o usuário ter que digitar a data de novo
  const [dataEntrega, setDataEntrega] = useState(dataPrevisao);

  // ── Produtos pendentes ──
  const [produtos,       setProdutos]       = useState<ProdutoPendente[]>([]);
  const [buscaProd,      setBuscaProd]      = useState('');
  const [resProd,        setResProd]        = useState<ProdutoResultado[]>([]);
  const [buscandoProd,   setBuscandoProd]   = useState(false);
  const [dropProdAberto, setDropProdAberto] = useState(false);
  const [idxProd,        setIdxProd]        = useState(0);  // navegação por teclado
  const [descPercent,    setDescPercent]    = useState('0'); // desconto total %
  const [prodDialog,     setProdDialog]     = useState<ProdutoResultado | null>(null);
  // dialog para configurar qtd/valor/desconto antes de adicionar
  const [pdQtd,          setPdQtd]          = useState('1');
  const [pdValor,        setPdValor]        = useState('');
  const [pdDesconto,     setPdDesconto]     = useState('0');
  const [pdErro,         setPdErro]         = useState('');
  const debProdRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputProdRef = useRef<HTMLInputElement>(null);
  const dropProdRef  = useRef<HTMLDivElement>(null);

  // ── Itens já salvos no banco (modo editar) ──
  const [itensSalvos,   setItensSalvos]   = useState<ItemSalvo[]>(itensIniciais ?? []);
  const [removendoItem, setRemovendoItem] = useState<number | null>(null);

  const parseFlt = (v: string) => parseFloat(v.replace(',', '.')) || 0;
  const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropProdRef.current  && !dropProdRef.current.contains(e.target as Node) &&
        inputProdRef.current && !inputProdRef.current.contains(e.target as Node)
      ) setDropProdAberto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mantém o item destacado visível ao navegar com ↑/↓ (rola o dropdown)
  useEffect(() => {
    const el = dropProdRef.current?.children[idxProd] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [idxProd]);

  useEffect(() => {
    const el = dropdownRef.current?.children[idxCli] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [idxCli]);

  function handleBuscaProdChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setBuscaProd(v);
    if (debProdRef.current) clearTimeout(debProdRef.current);
    debProdRef.current = setTimeout(async () => {
      const termos = normalizarTermosBusca(v);
      if (!termos.some(t => t.length >= 3)) { setResProd([]); setDropProdAberto(false); return; }
      setBuscandoProd(true);
      try {
        const lista = await buscarProdutos(termoPrincipal(termos), filial);
        const filtrados = filtrarProdutosPorTermos(lista, termos, p => p.nome_produto + ' ' + p.cod_pro);
        setResProd(filtrados);
        setIdxProd(0);
        setDropProdAberto(filtrados.length > 0);
      } finally {
        setBuscandoProd(false);
      }
    }, 300);
  }

  /** Teclado na busca de produtos: ↑/↓ navega, Enter seleciona, Esc fecha */
  function handleProdKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropProdAberto || resProd.length === 0) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdxProd((i) => Math.min(i + 1, resProd.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdxProd((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = resProd[idxProd];
      if (p) abrirDialogProduto(p);
    } else if (e.key === 'Escape') {
      setDropProdAberto(false);
    }
  }

  function abrirDialogProduto(p: ProdutoResultado) {
    setProdDialog(p);
    setPdQtd('1');
    setPdValor(String(p.preco.toFixed(2)).replace('.', ','));
    setPdDesconto('0');
    setPdErro('');
    setDropProdAberto(false);
    setBuscaProd('');
    setResProd([]);
  }

  function confirmarAdicionarProduto() {
    if (!prodDialog) return;
    const valor = parseFlt(pdValor);
    // Regra: não é permitido inserir produto com preço R$ 0,00
    if (valor <= 0) {
      setPdErro('Não é permitido inserir produto com preço R$ 0,00. Informe o valor.');
      return;
    }
    const novo: ProdutoPendente = {
      ...prodDialog,
      qtd:      parseFlt(pdQtd)      || 1,
      valor,
      desconto: parseFlt(pdDesconto),
    };
    setProdutos((prev) => [...prev, novo]);
    setProdDialog(null);
    // Lançamento sequencial: volta o foco para a busca de produtos
    setTimeout(() => inputProdRef.current?.focus(), 0);
  }

  function removerProduto(idx: number) {
    setProdutos((prev) => prev.filter((_, i) => i !== idx));
  }

  function alterarValorProduto(idx: number, novoValor: number) {
    setProdutos((prev) => prev.map((p, i) => i === idx ? { ...p, valor: novoValor } : p));
  }

  async function removerItemSalvo(idItem: number) {
    if (!agendaId) return;
    setRemovendoItem(idItem);
    const res = await excluirItemAgenda(agendaId, idItem, filial);
    if (!res.error) {
      setItensSalvos((prev) => prev.filter((i) => i.id_item !== idItem));
    }
    setRemovendoItem(null);
  }

  async function alterarValorItemSalvo(it: ItemSalvo, novoValor: number) {
    if (!agendaId) return;
    const res = await atualizarItemAgenda(agendaId, it.id_item, filial, it.qtd, novoValor, it.desconto, it.produto);
    if (!res.error) {
      setItensSalvos((prev) => prev.map((i) => i.id_item === it.id_item ? { ...i, valor: novoValor } : i));
    }
  }

  const totalProdutos = produtos.reduce(
    (acc, p) => acc + Math.max(0, (p.valor - p.desconto) * p.qtd), 0,
  );

  // ── Desconto total (%) sobre os produtos ──
  const descPct            = Math.min(100, Math.max(0, parseFlt(descPercent)));
  const descontoTotalValor = totalProdutos * descPct / 100;
  const totalFinal         = Math.max(0, totalProdutos - descontoTotalValor);

  // ── Controle de abertura dos dialogs reaproveitados ──
  const [novoCliOpen,    setNovoCliOpen]    = useState(false);
  const [novoAnimalOpen, setNovoAnimalOpen] = useState(false);

  // ── Pre-preenchimento no modo editar ──

  /**
   * Converte qualquer formato de data/hora para YYYY-MM-DDTHH:MM (datetime-local).
   * Aceita: "DD/MM/YYYY HH:MM:SS", "YYYY-MM-DDTHH:MM:SS", "YYYY-MM-DD HH:MM:SS".
   */
  function toDateTimeLocal(s?: string | null): string {
    if (!s) return '';
    const t = s.trim();
    // Já está em formato ISO com T
    if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return t.slice(0, 16);
    // Formato YYYY-MM-DD HH:MM
    if (/^\d{4}-\d{2}-\d{2} /.test(t)) return t.slice(0, 10) + 'T' + t.slice(11, 16);
    // Formato DD/MM/YYYY HH:MM
    if (/^\d{2}\/\d{2}\/\d{4}/.test(t)) {
      const [datePart, timePart = '00:00'] = t.split(' ');
      const [d, m, y] = datePart.split('/');
      return `${y}-${m}-${d}T${timePart.slice(0, 5)}`;
    }
    return '';
  }

  const [obsTexto, setObsTexto] = useState('');
  const [obsFlags, setObsFlags] = useState<Record<string, boolean>>({});

  // ── Observação da agenda = cópia da Observação do pet (só na criação) ──
  const obsTextoRef  = useRef('');
  const obsAutoPetRef = useRef<string | null>(null);
  useEffect(() => { obsTextoRef.current = obsTexto; }, [obsTexto]);

  /**
   * Copia a Observação cadastrada no pet pra Observação da agenda ao
   * selecioná-lo — nunca na edição (não mexe em observação já salva), e só
   * se o usuário não tiver digitado nada além do que já veio de outro pet
   * (evita apagar texto manual ao trocar de animal antes de gravar).
   */
  function aplicarObsAutomaticaDoPet(animal: Animal | null) {
    if (modo === 'editar') return;
    const obsPet = (animal?.obs ?? '').trim();
    const atual  = obsTextoRef.current;
    if (atual.trim() === '' || atual === obsAutoPetRef.current) {
      setObsTexto(obsPet);
      obsAutoPetRef.current = obsPet;
    }
  }
  useEffect(() => {
    if (modo !== 'editar' || !agendaInicial) return;

    // Profissional
    if (agendaInicial.prof_id) {
      setProfId(String(agendaInicial.prof_id));
      setProfNome(agendaInicial.profissional ?? '');
      const p = profissionais.find(x => x.id === agendaInicial.prof_id);
      setProfFilial(String(p?.filial ?? agendaInicial.filial));
    }
    // Serviço
    if (agendaInicial.servico_id) {
      setServicoId(String(agendaInicial.servico_id));
      setServicoNome(agendaInicial.servico ?? '');
      const s = servicos.find(x => x.id === agendaInicial.servico_id);
      setServicoFilial(String(s?.filial ?? agendaInicial.filial));
    }
    // Vendedor
    if (agendaInicial.vend_id) {
      setVendId(String(agendaInicial.vend_id));
      const v = vendedores.find(x => x.id === agendaInicial.vend_id);
      setVendFilial(String(v?.filial ?? agendaInicial.vend_filial ?? agendaInicial.filial));
    }
    const dtInicio = agendaInicial.data_previsao ||
      (agendaInicial.data ? agendaInicial.data + ' ' + (agendaInicial.hora ?? '07:00') : '');
    if (dtInicio) setDataPrevisao(toDateTimeLocal(dtInicio));
    if (agendaInicial.data_entrega) setDataEntrega(toDateTimeLocal(agendaInicial.data_entrega));
    // Observações
    const obsCarregado = agendaInicial.obs ?? '';
    setObsTexto(obsCarregado);
    const linhas = obsCarregado.split('\n').map((l) => l.trim());
    setObsFlags(Object.fromEntries(OBS_CHECKLIST.map((opt) => [opt, linhas.includes(opt)])));
    // Cliente e animal
    const clienteParcial: Cliente = {
      id:              agendaInicial.cliente_id ?? 0,
      filial:          agendaInicial.filial,
      nome:            agendaInicial.cliente ?? '',
      nome_fantasia:   '',
      cpf_cnpj:        '',
      telefone:        agendaInicial.telefone ?? '',
      telefone2:       '',
      celular:         agendaInicial.celular ?? '',
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
      pessoa:          'F',
      comentario:      '',
      ie:              '',
      atacadista:      0,
      mei:             0,
      status_ativo:    0,
      saldo_disponivel: 0,
      data_ult_compra: '',
    };
    const animalParcial: Animal = {
      id:              agendaInicial.animal_id,
      filial:          agendaInicial.filial,
      nome:            agendaInicial.animal ?? '',
      apelido:         '',
      especie:         '',
      raca:            agendaInicial.raca ?? '',
      sexo:            '',
      castrado:        0,
      data_nascimento: '',
      peso:            '',
      id_especie:      0,
      id_raca:         0,
      id_pelo:         0,
      pelo:            '',
      cor:             '',
      tipo_animal:     '',
      id_cliente:      agendaInicial.cliente_id ?? 0,
      filial_cliente:  agendaInicial.filial,
      nome_cliente:    agendaInicial.cliente ?? '',
      ativo:           0,
      obito:           0,
      obs:             '',
      id_veterinario:  0,
      veterinario:     '',
    };
    setClienteSel(clienteParcial);
    setAnimalSel(animalParcial);
    if (agendaInicial.cliente_id) carregarAnimais(agendaInicial.cliente_id, agendaInicial.animal_id, animalParcial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, agendaInicial]);

  // ── Submit ──
  const [isPending, startSubmit]          = useTransition();
  const [errorMsg, setErrorMsg]           = useState('');

  // ── Estimativas (produtos com regra: pergunta prazo mínimo ou máximo) ──
  const [estPendente,  setEstPendente]  = useState<EstimativaPendente | null>(null);
  const [salvandoEst,  setSalvandoEst]  = useState(false);
  const [erroEst,      setErroEst]      = useState('');

  // ── Agendar retorno (equivalente ao "Agendar retorno" do sistema antigo) ──
  const [agendarRetorno, setAgendarRetorno] = useState(false);
  const [retornoDialog,  setRetornoDialog]  = useState<{ agendaId: number } | null>(null);
  const [retornoData,      setRetornoData]      = useState('');
  const [retornoIntervalo, setRetornoIntervalo]  = useState(30);
  const [retornoQtd,       setRetornoQtd]        = useState(1);
  const [salvandoRetorno,  setSalvandoRetorno]   = useState(false);
  const [erroRetorno,      setErroRetorno]       = useState('');

  // Após criar a agenda: se "Agendar retorno" estiver marcado, busca a
  // sugestão de data/intervalo (regra por produto, ou 30 dias) e abre o
  // diálogo de confirmação; senão navega direto para a agenda criada.
  async function finalizarCriacao(idAgenda: number) {
    if (!agendarRetorno) {
      // replace (não push): a agenda acabou de ser criada, então "voltar"
      // não deve cair de novo no formulário de criação já preenchido/enviado.
      router.replace(`/agenda/${idAgenda}`);
      return;
    }
    const sug = await sugerirRetornoAgenda(idAgenda, filial);
    setRetornoData(sug.dataBase);
    setRetornoIntervalo(sug.intervaloDias);
    setRetornoQtd(1);
    setErroRetorno('');
    setRetornoDialog({ agendaId: idAgenda });
  }

  async function confirmarRetorno() {
    if (!retornoDialog) return;
    setSalvandoRetorno(true);
    setErroRetorno('');
    const res = await criarRetornoAgenda(retornoDialog.agendaId, filial, retornoQtd, retornoIntervalo, retornoData);
    setSalvandoRetorno(false);
    if (res.error) { setErroRetorno(res.error); return; }
    const idOriginal = retornoDialog.agendaId;
    setRetornoDialog(null);
    router.replace(`/agenda/${idOriginal}`);
  }

  async function confirmarEstimativas() {
    if (!estPendente || !clienteSel) return;
    setSalvandoEst(true);
    setErroEst('');
    try {
      const erros: string[] = [];
      for (const item of estPendente.regras) {
        const dias = item.escolha === 'min' && item.regra.dias_min > 0
          ? item.regra.dias_min
          : item.regra.dias_max;
        const res = await criarEstimativa({
          clienteId:     clienteSel.id,
          clienteFilial: clienteSel.filial,
          clienteNome:   clienteSel.nome,
          animalId:      animalSel?.id     ?? 0,
          animalFilial:  animalSel?.filial ?? filial,
          animalNome:    animalSel?.nome   ?? '',
          dadosproId:    item.regra.dadospro_id,
          descPro:       item.regra.produto,
          qtd:           item.qtd,
          dataCompra:    estPendente.dataCompra,
          dias,
          orcaId:        estPendente.agendaId,
          orcaFilial:    filial,
        });
        if (res.error) erros.push(`${item.regra.produto}: ${res.error}`);
      }
      if (erros.length > 0) { setErroEst(erros.join(' | ')); return; }
      router.replace(`/agenda/${estPendente.agendaId}`);
    } finally {
      setSalvandoEst(false);
    }
  }
  const formRef = useRef<HTMLFormElement>(null);
  const animalRef = useRef<HTMLDivElement>(null);
  const [animalPiscando, setAnimalPiscando] = useState(false);
  const vendRef = useRef<HTMLDivElement>(null);
  const [vendPiscando, setVendPiscando] = useState(false);
  const servicoRef = useRef<HTMLDivElement>(null);
  const [servicoPiscando, setServicoPiscando] = useState(false);

  // ── Fecha dropdown ao clicar fora ──
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current   && !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // ── Auto-busca com debounce a partir de 3 caracteres ──
  const executarBusca = useCallback(async (texto: string) => {
    const textoTrim = texto.trim();

    // Detecta separador "/" entre pet e dono
    const temBarra = textoTrim.includes('/');
    if (temBarra) {
      const [parteA, parteB] = textoTrim.split('/').map((s) => s.trim());
      // Exige pelo menos 2 chars em cada parte antes de buscar
      if (!parteA || !parteB || parteA.length < 2 || parteB.length < 2) {
        setResultados([]);
        setDropdownAberto(false);
        return;
      }
      setIsBuscando(true);
      try {
        const pets = await buscarCombinado(parteA, parteB, filial);
        const lista: ResultadoBusca[] = pets.map((a): ResultadoBusca => ({ tipo: 'pet', animal: a }));
        setResultados(lista);
        setTotaisBuscaCompleta({ clientes: 0, pets: 0 });
        setIdxCli(0);
        setDropdownAberto(lista.length > 0);
      } finally {
        setIsBuscando(false);
      }
      return;
    }

    // Busca simples: mínimo 3 caracteres
    if (textoTrim.length < 3) {
      setResultados([]);
      setTotaisBuscaCompleta({ clientes: 0, pets: 0 });
      setDropdownAberto(false);
      return;
    }
    setIsBuscando(true);
    try {
      // Busca em paralelo: clientes e pets
      const [clientes, pets] = await Promise.all([
        buscarClientes(textoTrim, filial),
        buscarPorPet(textoTrim, filial),
      ]);
      // Busca rápida fica enxuta de propósito (6 de cada) - quando o nome é
      // comum (ex: "Amora") e corta o dono certo fora da lista, o link
      // "Ver todos os resultados" abre a lista completa (com filtro de
      // raça) em vez de inchar esse dropdown - ver abrirTodosResultados.
      setTotaisBuscaCompleta({ clientes: clientes.length, pets: pets.length });
      const lista: ResultadoBusca[] = [
        ...clientes.slice(0, 6).map((c): ResultadoBusca => ({ tipo: 'cliente', cliente: c })),
        // buscarPorPet já filtra pet inativo/falecido
        ...pets.slice(0, 6).map((a): ResultadoBusca => ({ tipo: 'pet', animal: a })),
      ];
      setResultados(lista);
      setIdxCli(0);
      setDropdownAberto(lista.length > 0);
    } finally {
      setIsBuscando(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    setQ(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => executarBusca(valor), 300);
  }

  /** Teclado na busca de clientes: ↑/↓ navega, Enter seleciona e avança o foco */
  function handleCliKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownAberto || resultados.length === 0) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdxCli((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdxCli((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = resultados[idxCli];
      if (r) {
        if (r.tipo === 'cliente') selecionarCliente(r.cliente);
        else selecionarPet(r.animal);
        // Avança o foco para o próximo campo do formulário (Data)
        setTimeout(() => document.getElementById('data')?.focus(), 0);
      }
    } else if (e.key === 'Escape') {
      setDropdownAberto(false);
    }
  }

  /** Enter avança para o próximo campo (comportamento desktop/Delphi).
      Textareas e botões mantêm o comportamento padrão. */
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
    // As buscas têm tratamento próprio (seleção via Enter)
    if (t === inputRef.current || t === inputProdRef.current) return;
    e.preventDefault();
    const focusables = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled])',
      ) ?? [],
    ).filter((el) => el.tabIndex !== -1 && el.offsetParent !== null);
    const i = focusables.indexOf(t);
    if (i >= 0 && i < focusables.length - 1) focusables[i + 1].focus();
  }

  // ── Selecionar cliente direto ──
  function selecionarCliente(c: Cliente, animalPreSel?: Animal) {
    setClienteSel(c);
    setResultados([]);
    setDropdownAberto(false);
    setQ('');
    setAnimalSel(animalPreSel ?? null);
    setAnimais(animalPreSel ? [animalPreSel] : []);
    carregarAnimais(c.id, animalPreSel?.id, animalPreSel);
  }

  // ── Selecionar via resultado de pet ──
  function selecionarPet(item: AnimalBuscaItem) {
    // Monta cliente parcial para exibir enquanto carrega os dados completos
    const clienteParcial: Cliente = {
      id:              item.id_cliente,
      filial:          item.filial,
      nome:            item.nome_cliente,
      nome_fantasia:   '',
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
      pessoa:          'F',
      comentario:      '',
      ie:              '',
      atacadista:      0,
      mei:             0,
      status_ativo:    0,
      saldo_disponivel: 0,
      data_ult_compra: '',
    };
    // Animal parcial para pré-selecionar
    const animalParcial = {
      id:           item.id,
      filial:       item.filial,
      nome:         item.nome,
      apelido:      item.apelido,
      especie:      item.especie,
      raca:         item.raca,
      sexo:         item.sexo,
      ativo:        item.ativo,
      obito:        item.obito,
      castrado:     0,
      id_cliente:   item.id_cliente,
      nome_cliente: item.nome_cliente,
      // campos não disponíveis na busca rápida
      data_nascimento: '',
      peso:          '',
      id_especie:    0,
      id_raca:       0,
      id_pelo:       0,
      pelo:          '',
      cor:           '',
      tipo_animal:   '',
      filial_cliente: item.filial,
      obs:           '',
      id_veterinario: 0,
      veterinario:   '',
    } as Animal;

    selecionarCliente(clienteParcial, animalParcial);
  }

  function limparCliente() {
    setClienteSel(null);
    setResultados([]);
    setAnimais([]);
    setAnimalSel(null);
    setPesoInput('');
    setQ('');
  }

  function handleProfChange(val: string) {
    const p = profissionais.find((p) => String(p.id) === val);
    setProfId(val);
    setProfNome(p?.nome ?? '');
    setProfFilial(String(p?.filial ?? ''));
  }

  function handleServicoChange(val: string) {
    const s = servicos.find((s) => String(s.id) === val);
    setServicoId(val);
    setServicoNome(s?.descricao ?? '');
    setServicoFilial(String(s?.filial ?? ''));
    // Auto-calcula data_entrega a partir da duração do serviço
    // duracao pode vir como "HH:MM:SS" ou como string numérica de minutos
    const duracaoMin = (() => {
      const d = s?.duracao ?? '0';
      if (d.includes(':')) {
        const [h, m] = d.split(':').map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      }
      return parseInt(d, 10);
    })();
    if (duracaoMin > 0 && dataPrevisao) {
      // Parseia como horário LOCAL somando os minutos sem conversão UTC
      const [datePart, timePart = '00:00'] = dataPrevisao.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const totalMin = hours * 60 + minutes + duracaoMin;
      const hFim = Math.floor(totalMin / 60) % 24;
      const mFim = totalMin % 60;
      const pad = (n: number) => String(n).padStart(2, '0');
      const resultado = `${year}-${pad(month)}-${pad(day)}T${pad(hFim)}:${pad(mFim)}`;
      setDataEntrega(resultado);
    }

    // Categoria de Serviço: se houver regra cadastrada para a raça do animal
    // (ou regra genérica sem raça) para este serviço, insere o produto
    // correspondente automaticamente e sem aviso. Sem regra, nada acontece —
    // o atendente segue o fluxo manual normal de adicionar produto/serviço.
    // Se houver mais de uma regra (ex: "Diária"/"Mensal" da Creche), pergunta
    // ao usuário qual usar em vez de escolher sozinho.
    const servicoIdNum = Number(val) || 0;
    if (servicoIdNum > 0) {
      buscarProdutoPorCategoria(animalSel?.id_raca ?? 0, servicoIdNum).then((opcoes) => {
        if (opcoes.length === 1) {
          const produtoAuto = opcoes[0];
          setProdutos((prev) => [...prev, { ...produtoAuto, qtd: 1, valor: produtoAuto.preco, desconto: 0 }]);
        } else if (opcoes.length > 1) {
          setOpcoesCategoriaServico(opcoes);
        }
      });
    }
  }

  // Popup de escolha quando o serviço tem 2+ regras de Categoria de Serviço
  // cadastradas (ver handleServicoChange)
  const [opcoesCategoriaServico, setOpcoesCategoriaServico] = useState<ProdutoCategoriaOpcao[] | null>(null);

  function escolherOpcaoCategoriaServico(opcao: ProdutoCategoriaOpcao) {
    setProdutos((prev) => [...prev, { ...opcao, qtd: 1, valor: opcao.preco, desconto: 0 }]);
    setOpcoesCategoriaServico(null);
  }

  // "Ver últimas agendas" do pet selecionado — referência rápida de produtos
  // e valor cobrado da última vez, pra ajudar o atendente a repetir/comparar.
  const [ultimasAgendasOpen, setUltimasAgendasOpen] = useState(false);
  const [carregandoUltimas, setCarregandoUltimas] = useState(false);
  const [ultimasAgendas, setUltimasAgendas] = useState<UltimaAgendaComItens[]>([]);

  async function abrirUltimasAgendas() {
    if (!animalSel) return;
    setUltimasAgendasOpen(true);
    setCarregandoUltimas(true);
    try {
      const dados = await buscarUltimasAgendasAnimal(animalSel.id, animalSel.filial);
      setUltimasAgendas(dados);
    } finally {
      setCarregandoUltimas(false);
    }
  }

  function handleDataPrevisaoChange(val: string) {
    setDataPrevisao(val);
    // Recalcula data_entrega mantendo a duração atual (sem conversão UTC)
    if (dataEntrega && val) {
      const toMin = (dt: string) => {
        const [, t = '00:00'] = dt.split('T');
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const durMin = toMin(dataEntrega) - toMin(dataPrevisao);
      if (durMin >= 0) {
        const [datePart, timePart = '00:00'] = val.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const totalMin = hours * 60 + minutes + durMin;
        const hFim = Math.floor(totalMin / 60) % 24;
        const mFim = totalMin % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        setDataEntrega(`${year}-${pad(month)}-${pad(day)}T${pad(hFim)}:${pad(mFim)}`);
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    // Regra: animal obrigatório na Agenda — diferente de Pré-venda/Tele-entrega,
    // que podem ser lançadas sem pet vinculado, a Agenda sempre precisa de um.
    if (!animalSel) {
      setErrorMsg('Selecione o animal antes de gravar.');
      animalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setAnimalPiscando(true);
      setTimeout(() => setAnimalPiscando(false), 1500);
      return;
    }

    // Regra: vendedor obrigatório — rola até o campo e destaca, senão o usuário
    // não percebe a mensagem de erro lá embaixo
    if (!vendId) {
      setErrorMsg('Selecione o vendedor antes de gravar.');
      vendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setVendPiscando(true);
      setTimeout(() => setVendPiscando(false), 1500);
      return;
    }

    // Regra: tipo de serviço obrigatório
    if (!servicoId) {
      setErrorMsg('Selecione o tipo de serviço antes de gravar.');
      servicoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setServicoPiscando(true);
      setTimeout(() => setServicoPiscando(false), 1500);
      return;
    }

    // Regra: agenda deve ter no mínimo um produto/serviço (só na criação)
    if (modo !== 'editar' && produtos.length === 0) {
      setErrorMsg('Inclua ao menos um produto ou serviço para gravar a agenda.');
      setTimeout(() => inputProdRef.current?.focus(), 0);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('cliente_id',     String(clienteSel?.id     ?? ''));
    formData.set('cliente_filial', String(clienteSel?.filial ?? ''));
    formData.set('cliente_nome',   clienteSel?.nome           ?? '');
    formData.set('animal_id',      String(animalSel?.id      ?? ''));
    formData.set('animal_filial',  String(animalSel?.filial  ?? ''));
    formData.set('animal_nome',    animalSel?.nome            ?? '');
    formData.set('raca',           animalSel?.raca            ?? '');
    formData.set('peso',           pesoInput);
    formData.set('prof_id',        profId);
    formData.set('prof_filial',    profFilial);
    formData.set('vend_id',        vendId);
    formData.set('vend_filial',    vendFilial);
    formData.set('prof_nome',      profNome);
    formData.set('servico_id',     servicoId);
    formData.set('servico_filial', servicoFilial);
    formData.set('servico_nome',   servicoNome);
    // Valor/desconto calculados a partir dos produtos + desconto total (%)
    formData.set('valor',          totalProdutos.toFixed(2));
    formData.set('desconto',       descontoTotalValor.toFixed(2));
    formData.set('obs',            obsTexto);
    // Filial de destino da agenda (pode ser diferente da filial da sessão)
    formData.set('filial',         String(filial));

    const dataAgenda = dataPrevisao.split('T')[0] || new Date().toISOString().split('T')[0];

    const gravar = () => startSubmit(async () => {
      if (modo === 'editar' && agendaId) {
        const res = await editarAgenda({
          id:             agendaId,
          filial:         filial,
          animal_id:      animalSel?.id,
          animal_filial:  animalSel?.filial,
          prof_id:        Number(profId) || undefined,
          prof_filial:    Number(profFilial) || undefined,
          prof_nome:      profNome || undefined,
          servico_id:     Number(servicoId) || undefined,
          servico_filial: Number(servicoFilial) || undefined,
          servico_nome:   servicoNome || undefined,
          vend_id:        Number(vendId) || undefined,
          vend_filial:    Number(vendFilial) || undefined,
          obs:            obsTexto,
          peso:           Number(pesoInput) > 0 ? Number(pesoInput) : undefined,
          data_previsao:  dataPrevisao || undefined,
          data_entrega:   dataEntrega  || undefined,
        });
        if (res.error) { setErrorMsg(res.error); return; }

        // Adiciona novos produtos em modo editar (itens já salvos não são retransmitidos)
        if (produtos.length > 0 && agendaId) {
          for (const p of produtos) {
            await comAutorizacao((auth) => adicionarItemNaAgenda(
              agendaId, filial,
              p.id_dadospro, p.cod_filial,
              p.qtd, p.valor, p.desconto, p.nome_produto,
              p.nome_produto, p.preco, p.cod_pro,
              auth,
            ));
          }
        }

        router.replace(`/agenda/${agendaId}`);
        return;
      }

      const result = await createAgenda({}, formData);
      if (result.error) { setErrorMsg(result.error); return; }

      // Adiciona produtos pendentes em sequência
      if (produtos.length > 0 && result.id) {
        const errosProdutos: string[] = [];
        for (const p of produtos) {
          const res = await comAutorizacao((auth) => adicionarItemNaAgenda(
            result.id!, filial,
            p.id_dadospro, p.cod_filial,
            p.qtd, p.valor, p.desconto, p.nome_produto,
            p.nome_produto, p.preco, p.cod_pro,
            auth,
          ));
          if (res.error) errosProdutos.push(`${p.nome_produto}: ${res.error}`);
        }
        if (errosProdutos.length > 0) {
          // Mostra o erro real para diagnóstico antes de navegar
          setErrorMsg(`Agenda #${result.id} criada. Erro ao salvar produtos — ${errosProdutos.join(' | ')}`);
          return;
        }

        // Verifica se algum produto vendido tem regra de estimativa
        const regras = await verificarRegrasProdutos(produtos.map((p) => p.id_dadospro));
        if (regras.length > 0) {
          setEstPendente({
            agendaId:   result.id,
            dataCompra: dataAgenda,
            regras: regras.map((r) => ({
              regra:   r,
              qtd:     produtos.find((p) => p.id_dadospro === r.dadospro_id)?.qtd ?? 1,
              // padrão: prazo máximo (se não houver mínimo cadastrado, só há essa opção)
              escolha: 'max' as const,
            })),
          });
          return; // não navega — o dialog de estimativa decide
        }
      }
      if (result.id) await finalizarCriacao(result.id);
    });

    // Inserindo em filial diferente da padrão → pede confirmação antes de gravar
    if (outraFilial) {
      pendingSubmit.current = gravar;
      setConfirmFilialOpen(true);
      return;
    }
    gravar();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-0 space-y-2.5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/agenda">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Agenda
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">
            {modo === 'editar' ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h1>
          {(modo === 'editar' ? agendaId : proximoNumero) && (
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-semibold">
              # {modo === 'editar' ? agendaId : proximoNumero}
            </span>
          )}
        </div>
      </div>

      {/* Aviso: inserindo em filial diferente da padrão do usuário */}
      {outraFilial && (
        <div className="flex items-center gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Você está criando esta agenda na <strong>filial {filial}</strong> — diferente da sua filial padrão.
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-2">

        {/* ── Cliente ── */}
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Cliente *
            </h2>
            {!clienteSel && (
              <Button type="button" size="sm" variant="outline" onClick={() => setNovoCliOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Cliente
              </Button>
            )}
          </div>

          {clienteSel ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                <div>
                  <p className="font-medium">{clienteSel.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button" variant="ghost" size="icon"
                    title="Editar cliente"
                    onClick={async () => {
                      if (editClienteOpen) { setEditClienteOpen(false); return; }
                      setErroCli('');
                      setCliPanelLoading(true);
                      setEditClienteOpen(true);
                      // Busca o cadastro completo para garantir endereço e demais campos
                      const completo = await buscarClienteCompleto(clienteSel.id).catch(() => null);
                      const c = completo ?? clienteSel;
                      setCliNome(c.nome ?? '');
                      setCliCelular(c.celular ?? '');
                      setCliTelefone(c.telefone ?? '');
                      setCliEmail(c.email ?? '');
                      setCliCpf(c.cpf_cnpj ?? '');
                      setCliCep(c.cep ?? '');
                      setCliEndereco(c.endereco ?? '');
                      setCliNumero(c.numero ?? '');
                      setCliComplemento(c.complemento ?? '');
                      setCliBairro(c.bairro ?? '');
                      setCliCidade(c.cidade ?? '');
                      setCliUf(c.uf ?? '');
                      setCliCepMsg(null);
                      setCliPanelLoading(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {modo !== 'editar' && (
                    <Button type="button" variant="ghost" size="icon" onClick={limparCliente}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Painel inline de edição rápida do cliente */}
              {editClienteOpen && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
                    Editar dados do cliente
                    {cliPanelLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </p>
                  {erroCli && <p className="text-xs text-destructive">{erroCli}</p>}
                  <div className={`grid grid-cols-2 gap-3 transition-opacity ${cliPanelLoading ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={cliNome} onChange={e => setCliNome(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Celular</Label>
                      <Input value={cliCelular} onChange={e => setCliCelular(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={cliTelefone} onChange={e => setCliTelefone(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input type="email" value={cliEmail} onChange={e => setCliEmail(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input value={cliCpf} onChange={e => setCliCpf(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CEP</Label>
                      <div className="relative">
                        <Input
                          value={cliCep}
                          onChange={e => { setCliCep(e.target.value); setCliCepMsg(null); }}
                          onBlur={handleCliCepBlur}
                          placeholder="00000-000"
                          maxLength={9}
                          className="h-8 text-sm pr-7"
                        />
                        {cliCepLoading && (
                          <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {cliCepMsg && (
                        <p className={`text-[11px] ${cliCepMsg.tipo === 'ok' ? 'text-emerald-600' : 'text-destructive'}`}>
                          {cliCepMsg.texto}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Endereço</Label>
                      <Input value={cliEndereco} onChange={e => setCliEndereco(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número</Label>
                      <Input value={cliNumero} onChange={e => setCliNumero(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Complemento</Label>
                      <Input value={cliComplemento} onChange={e => setCliComplemento(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={cliBairro} onChange={e => setCliBairro(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={cliCidade} onChange={e => setCliCidade(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UF</Label>
                      <Input value={cliUf} onChange={e => setCliUf(e.target.value)} maxLength={2} className="h-8 text-sm uppercase" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditClienteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={salvandoCli || !cliNome.trim()}
                      onClick={async () => {
                        setSalvandoCli(true); setErroCli('');
                        const fd = new FormData();
                        fd.set('nome',            cliNome);
                        fd.set('celular',         cliCelular);
                        fd.set('telefone',        cliTelefone);
                        fd.set('email',           cliEmail);
                        fd.set('cpf_cnpj',        cliCpf);
                        fd.set('cep',             cliCep);
                        fd.set('endereco',        cliEndereco);
                        fd.set('numero',          cliNumero);
                        fd.set('complemento',     cliComplemento);
                        fd.set('bairro',          cliBairro);
                        fd.set('cidade',          cliCidade);
                        fd.set('uf',              cliUf);
                        fd.set('pessoa',          clienteSel.pessoa        ?? 'F');
                        fd.set('status_ativo',    String(clienteSel.status_ativo ?? 0));
                        fd.set('ibge',            '');
                        fd.set('ie',              clienteSel.ie            ?? '');
                        fd.set('data_nascimento', clienteSel.data_nascimento ?? '');
                        fd.set('comentario',      clienteSel.comentario    ?? '');
                        fd.set('nome_fantasia',   clienteSel.nome_fantasia ?? '');
                        const res = await updateCliente(clienteSel.id, fd);
                        setSalvandoCli(false);
                        if (res.error) { setErroCli(res.error); return; }
                        setClienteSel(prev => prev ? {
                          ...prev,
                          nome: cliNome, celular: cliCelular, telefone: cliTelefone,
                          email: cliEmail, cpf_cnpj: cliCpf, cep: cliCep,
                          endereco: cliEndereco, numero: cliNumero, complemento: cliComplemento,
                          bairro: cliBairro, cidade: cliCidade, uf: cliUf,
                        } : prev);
                        setEditClienteOpen(false);
                      }}
                    >
                      {salvandoCli ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Campo de busca unificado */}
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                {isBuscando
                  ? <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
                  : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                }
                <input
                  ref={inputRef}
                  value={q}
                  onChange={handleChange}
                  onKeyDown={handleCliKeyDown}
                  onFocus={() => resultados.length > 0 && setDropdownAberto(true)}
                  placeholder="Nome do cliente, do pet, ou pet / dono..."
                  className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => { setQ(''); setResultados([]); setDropdownAberto(false); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Indicador de mínimo de caracteres */}
              {q.length > 0 && (() => {
                if (q.includes('/')) {
                  const [a, b] = q.split('/').map((s) => s.trim());
                  if (!a || a.length < 2 || !b || b.length < 2)
                    return <p className="text-xs text-muted-foreground mt-1.5 ml-1">Digite pelo menos 2 letras em cada lado da barra...</p>;
                  return null;
                }
                if (q.trim().length < 3)
                  return <p className="text-xs text-muted-foreground mt-1.5 ml-1">Digite mais {3 - q.trim().length} letra{3 - q.trim().length !== 1 ? 's' : ''} para buscar...</p>;
                return null;
              })()}

              {/* Dropdown de resultados */}
              {dropdownAberto && resultados.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 rounded-md border bg-card shadow-lg max-h-96 overflow-y-auto divide-y"
                >
                  {resultados.map((r, i) => {
                    if (r.tipo === 'cliente') {
                      return (
                        <button
                          key={`cli-${r.cliente.id}-${i}`}
                          type="button"
                          onClick={() => selecionarCliente(r.cliente)}
                          onMouseEnter={() => setIdxCli(i)}
                          className={cn(
                            'w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3',
                            i === idxCli ? 'bg-primary/10' : 'hover:bg-muted/50',
                          )}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.cliente.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.cliente.celular || r.cliente.telefone || r.cliente.cpf_cnpj || 'Cliente'}
                            </p>
                          </div>
                        </button>
                      );
                    }
                    // tipo === 'pet'
                    return (
                      <button
                        key={`pet-${r.animal.id}-${i}`}
                        type="button"
                        onClick={() => selecionarPet(r.animal)}
                        onMouseEnter={() => setIdxCli(i)}
                        className={cn(
                          'w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3',
                          i === idxCli ? 'bg-primary/10' : 'hover:bg-muted/50',
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 mt-0.5">
                          <PawPrint className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {r.animal.nome}
                            <MicrochipBadge value={r.animal.apelido} className="text-[11px]" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[r.animal.especie, r.animal.raca].filter(Boolean).join(' · ')}
                            {' — '}
                            <span className="font-medium text-foreground/70">{r.animal.nome_cliente}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {(totaisBuscaCompleta.clientes > 6 || totaisBuscaCompleta.pets > 6) && (
                    <button
                      type="button"
                      onClick={() => setModalTodosAberto(true)}
                      className="w-full text-center px-4 py-2 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
                    >
                      Ver todos os resultados ({totaisBuscaCompleta.clientes + totaisBuscaCompleta.pets})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Animal ── */}
        <div
          ref={animalRef}
          className={cn(
            'rounded-xl border bg-card p-3 space-y-2',
            animalPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
          )}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              Animal <span className="text-destructive">*</span>
            </h2>
            <div className="flex items-center gap-2">
              {animalSel && (
                <button
                  type="button"
                  onClick={abrirUltimasAgendas}
                  className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
                  title="Ver produtos e valor das últimas agendas deste pet"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Últimas agendas
                </button>
              )}
              {clienteSel && (
                <Button type="button" size="sm" variant="outline" onClick={() => setNovoAnimalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Novo Pet
                </Button>
              )}
            </div>
          </div>

          {!clienteSel ? (
            <p className="text-sm text-muted-foreground">Selecione um cliente primeiro.</p>
          ) : isLoadingAnimais ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />Carregando animais...
            </div>
          ) : animais.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum animal cadastrado.{' '}
              <button type="button" className="text-primary underline underline-offset-2" onClick={() => setNovoAnimalOpen(true)}>
                Cadastrar agora
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                {animais.map((a) => (
                  <div key={a.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const next = animalSel?.id === a.id ? null : a;
                        setAnimalSel(next);
                        setPesoInput(next?.peso ? String(next.peso) : '');
                        aplicarObsAutomaticaDoPet(next);
                        if (editAnimalOpen && animalSel?.id !== a.id) setEditAnimalOpen(false);
                      }}
                      className={cn(
                        'w-full text-left rounded-lg border px-3 py-2.5 transition-colors pr-8',
                        animalSel?.id === a.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        {a.nome}
                        <MicrochipBadge value={a.apelido} className="text-[11px]" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[a.especie, a.raca, a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'Fêmea' : '']
                          .filter(Boolean).join(' · ')}
                      </p>
                    </button>
                    <button
                      type="button"
                      title="Editar animal"
                      onClick={() => {
                        setAnimalSel(a);
                        setPesoInput(a.peso ? String(a.peso) : '');
                        aplicarObsAutomaticaDoPet(a);
                        const abrindo = animalSel?.id !== a.id || !editAnimalOpen;
                        if (abrindo) {
                          setAniNome(a.nome ?? '');
                          setAniSexo(a.sexo ?? '');
                          setAniCastrado(String(a.castrado ?? 0));
                          setAniNasc(a.data_nascimento?.slice(0, 10) ?? '');
                          setAniCor(a.cor ?? '');
                          setAniObs(a.obs ?? '');
                          setAniMicrochip(a.apelido ?? '');
                        }
                        setEditAnimalOpen(abrindo);
                        setErroAni('');
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Painel inline de edição rápida do animal */}
              {editAnimalOpen && animalSel && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Editar dados de {animalSel.nome}
                  </p>
                  {erroAni && <p className="text-xs text-destructive">{erroAni}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input value={aniNome} onChange={e => setAniNome(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Microchip</Label>
                      <Input value={aniMicrochip} onChange={e => setAniMicrochip(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sexo</Label>
                      <select value={aniSexo} onChange={e => setAniSexo(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="">—</option>
                        <option value="M">Macho</option>
                        <option value="F">Fêmea</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Castrado</Label>
                      <select value={aniCastrado} onChange={e => setAniCastrado(e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="0">Não</option>
                        <option value="1">Sim</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data de Nascimento</Label>
                      <Input type="date" value={aniNasc} onChange={e => setAniNasc(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input value={aniCor} onChange={e => setAniCor(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input value={aniObs} onChange={e => setAniObs(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditAnimalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={salvandoAni || !aniNome.trim()}
                      onClick={async () => {
                        setSalvandoAni(true); setErroAni('');
                        const fd = new FormData();
                        fd.set('nome',            aniNome);
                        fd.set('sexo',            aniSexo);
                        fd.set('castrado',        aniCastrado);
                        fd.set('data_nascimento', aniNasc);
                        fd.set('cor',             aniCor);
                        fd.set('obs',             aniObs);
                        fd.set('apelido',         aniMicrochip);
                        fd.set('peso',            animalSel.peso          ?? '');
                        fd.set('tipo_animal',     animalSel.tipo_animal   ?? '');
                        fd.set('id_especie',      String(animalSel.id_especie ?? 0));
                        fd.set('especie',         animalSel.especie       ?? '');
                        fd.set('id_raca',         String(animalSel.id_raca   ?? 0));
                        fd.set('raca',            animalSel.raca          ?? '');
                        fd.set('id_pelo',         String(animalSel.id_pelo   ?? 0));
                        fd.set('pelo',            animalSel.pelo          ?? '');
                        fd.set('controla_racao',  '0');
                        fd.set('obito',           String(animalSel.obito  ?? 0));
                        // Convenção do legado: ATIVO=1 significa INATIVO — default seguro é 0 (ativo)
                        fd.set('ativo',           String(animalSel.ativo  ?? 0));
                        const res = await updateAnimal(animalSel.id, animalSel.id_cliente, {}, fd);
                        setSalvandoAni(false);
                        if (res.error) { setErroAni(res.error); return; }
                        const updated: Animal = {
                          ...animalSel,
                          nome: aniNome, sexo: aniSexo,
                          castrado: aniCastrado === '1' ? 1 : 0,
                          data_nascimento: aniNasc, cor: aniCor, obs: aniObs,
                          apelido: aniMicrochip,
                        };
                        setAnimais(prev => prev.map(a => a.id === animalSel.id ? updated : a));
                        setAnimalSel(updated);
                        setEditAnimalOpen(false);
                      }}
                    >
                      {salvandoAni ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Data / Hora / Profissional / Serviço ── */}
        <div className="rounded-xl border bg-card p-3 space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Detalhes do Agendamento
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="data_previsao" className="text-xs">Início Previsto *</Label>
              <Input
                id="data_previsao"
                name="data_previsao"
                type="datetime-local"
                className="h-8 text-sm"
                value={dataPrevisao}
                onChange={(e) => handleDataPrevisaoChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="data_entrega" className="text-xs">Término Previsto</Label>
              <Input
                id="data_entrega"
                name="data_entrega"
                type="datetime-local"
                className="h-8 text-sm"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground -mt-1.5">
            Término pré-preenchido com o início · auto-calculado ao selecionar o serviço
          </p>

          {/* Peso do animal */}
          {animalSel && (
            <div className="space-y-1">
              <Label htmlFor="peso_animal" className="flex items-center gap-1.5">
                Peso do Animal
                {animalSel.peso && Number(animalSel.peso) > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (último registrado: {Number(animalSel.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg)
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="peso_animal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={pesoInput}
                  onChange={(e) => setPesoInput(e.target.value)}
                  className="w-36"
                />
                <span className="text-sm text-muted-foreground">kg</span>
                {pesoInput && Number(pesoInput) > 0 && animalSel.peso && Number(animalSel.peso) > 0 && (
                  <span className={cn(
                    'text-xs font-medium',
                    Number(pesoInput) > Number(animalSel.peso) ? 'text-orange-500' : 'text-green-600',
                  )}>
                    {Number(pesoInput) > Number(animalSel.peso) ? '▲' : '▼'}
                    {' '}{Math.abs(Number(pesoInput) - Number(animalSel.peso)).toFixed(2)} kg
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Opcional. Atualiza o cadastro do animal e registra no histórico de peso.
              </p>
            </div>
          )}

          {/* Vendedor (obrigatório) */}
          <div
            ref={vendRef}
            className={cn(
              'space-y-1 rounded-md transition-shadow',
              vendPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
            )}
          >
            <Label>
              Vendedor <span className="text-destructive">*</span>
            </Label>
            <Select
              // Vendedores agora vêm de todas as filiais — o código (id)
              // pode se repetir entre filiais diferentes, então o valor do
              // Select precisa ser a combinação filial:id pra não colidir.
              value={vendId ? `${vendFilial || filial}:${vendId}` : ''}
              onValueChange={(v) => {
                if (!v) return;
                const [filStr, idStr] = v.split(':');
                setVendId(idStr);
                setVendFilial(filStr);
              }}
              items={vendedores.map((vd) => ({ value: `${vd.filial}:${vd.id}`, label: vd.nome.trim() }))}
            >
              <SelectTrigger className={!vendId ? 'border-destructive/50' : ''}>
                <SelectValue placeholder="Selecione o vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vd) => (
                  <SelectItem key={`${vd.filial}:${vd.id}`} value={`${vd.filial}:${vd.id}`}>
                    {vd.nome.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modo !== 'editar' && (
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer select-none hover:bg-muted/40">
              <input
                type="checkbox"
                checked={agendarRetorno}
                onChange={(e) => setAgendarRetorno(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Agendar retorno
              <span className="text-xs text-muted-foreground">
                — ao gravar, pergunta a data e cria a próxima agenda automaticamente
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                Profissional
                {listasCarregando && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </Label>
              <Select
                value={profId}
                onValueChange={(v) => { if (v) handleProfChange(v); }}
                items={(profissionais ?? []).map((p) => ({ value: String(p.id), label: p.nome }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={listasCarregando ? 'Carregando...' : 'Selecione...'} />
                </SelectTrigger>
                <SelectContent>
                  {(profissionais ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              ref={servicoRef}
              className={cn(
                'space-y-1 rounded-md transition-shadow',
                servicoPiscando && 'ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse',
              )}
            >
              <Label className="flex items-center gap-1.5">
                Serviço <span className="text-destructive">*</span>
                {listasCarregando && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </Label>
              <Select
                value={servicoId}
                onValueChange={(v) => { if (v) handleServicoChange(v); }}
                items={(servicos ?? []).map((s) => ({ value: String(s.id), label: s.descricao }))}
              >
                <SelectTrigger className={!servicoId ? 'border-destructive/50' : ''}>
                  <SelectValue placeholder={listasCarregando ? 'Carregando...' : 'Selecione...'} />
                </SelectTrigger>
                <SelectContent>
                  {(servicos ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {servicoNome && animalSel && (
                <p className="text-xs text-muted-foreground pt-0.5">
                  Valor últ. serviço:{' '}
                  {valorUltimoServicoCarregando
                    ? <Loader2 className="inline h-3 w-3 animate-spin align-[-2px]" />
                    : valorUltimoServico !== null
                      ? <span className="font-medium text-foreground">R$ {fmtMoeda(valorUltimoServico)}</span>
                      : '—'}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* ── Produtos ── */}
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <PackageSearch className="h-3.5 w-3.5" />
            Produtos / Serviços
            {produtos.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                {produtos.length}
              </span>
            )}
          </h2>

          {/* Busca */}
          <div className="relative">
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {buscandoProd
                ? <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
                : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <input
                ref={inputProdRef}
                value={buscaProd}
                onChange={handleBuscaProdChange}
                onKeyDown={handleProdKeyDown}
                onFocus={() => resProd.length > 0 && setDropProdAberto(true)}
                placeholder="Buscar por nome ou código... (mín. 3 caracteres)"
                className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoComplete="off"
              />
              {buscaProd && (
                <button type="button" onClick={() => { setBuscaProd(''); setResProd([]); setDropProdAberto(false); }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            {buscaProd.length > 0 && buscaProd.length < 3 && (
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                Digite mais {3 - buscaProd.length} letra{3 - buscaProd.length !== 1 ? 's' : ''}...
              </p>
            )}
            {dropProdAberto && resProd.length > 0 && (
              <div ref={dropProdRef} className="absolute z-50 w-full mt-1 rounded-md border bg-card shadow-lg max-h-96 overflow-y-auto divide-y">
                {resProd.map((p, i) => (
                  <button
                    key={p.id_dadospro}
                    type="button"
                    onClick={() => abrirDialogProduto(p)}
                    onMouseEnter={() => setIdxProd(i)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-4',
                      i === idxProd ? 'bg-primary/10' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.nome_produto}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.cod_pro && <span className="font-mono mr-1.5">{p.cod_pro}</span>}
                        {[p.secao, p.grupo, p.unidade].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold text-primary">
                        R$ {fmtMoeda(p.preco)}
                      </p>
                      <p className={cn(
                        'text-[11px] font-mono',
                        (p.estoque ?? 0) <= 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground',
                      )}>
                        Est: {(p.estoque ?? 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de produtos — itens salvos (DB) + novos (pendentes) */}
          {(itensSalvos.length > 0 || produtos.length > 0) && (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-1.5 font-medium">Produto</th>
                    <th className="text-right px-3 py-1.5 font-medium w-12">Qtd</th>
                    <th className="text-right px-3 py-1.5 font-medium w-24">Valor</th>
                    <th className="text-right px-3 py-1.5 font-medium w-24">Desc.</th>
                    <th className="text-right px-3 py-1.5 font-medium w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Itens já salvos no banco */}
                  {itensSalvos.map((it) => {
                    const total = Math.max(0, (it.valor - it.desconto) * it.qtd);
                    return (
                      <tr key={`salvo-${it.id_item}`} className="hover:bg-muted/40">
                        <td className="px-3 py-1.5">
                          <p className="font-medium truncate max-w-[180px]">{it.produto}</p>
                          <p className="text-xs text-muted-foreground">{[it.cod_pro, it.unidade].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">{it.qtd}</td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          R$ <EditableValor valor={it.valor} fmt={fmtMoeda} onCommit={(v) => alterarValorItemSalvo(it, v)} />
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {it.desconto > 0 ? <span className="text-amber-600">R$ {fmtMoeda(it.desconto)}</span> : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold">R$ {fmtMoeda(total)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removerItemSalvo(it.id_item)}
                            disabled={removendoItem === it.id_item}
                            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                          >
                            {removendoItem === it.id_item
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Novos itens (ainda não salvos) */}
                  {produtos.map((p, i) => {
                    const total = Math.max(0, (p.valor - p.desconto) * p.qtd);
                    return (
                      <tr key={`novo-${i}`} className="hover:bg-muted/40 bg-primary/[0.02]">
                        <td className="px-3 py-1.5">
                          <p className="font-medium truncate max-w-[180px]">{p.nome_produto}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.cod_pro && <span className="font-mono mr-1.5">{p.cod_pro}</span>}
                            {p.unidade}
                            <span className="ml-1.5 text-primary text-[10px] font-semibold">NOVO</span>
                            {p.id_categoria != null && (
                              <span
                                className="ml-1.5 text-[10px] font-mono text-muted-foreground"
                                title="Inserido automaticamente pela regra de Categoria de Serviço"
                              >
                                (regra #{p.id_categoria})
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">{p.qtd}</td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          R$ <EditableValor valor={p.valor} fmt={fmtMoeda} onCommit={(v) => alterarValorProduto(i, v)} />
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono">
                          {p.desconto > 0 ? <span className="text-amber-600">R$ {fmtMoeda(p.desconto)}</span> : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold">R$ {fmtMoeda(total)}</td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => removerProduto(i)}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {itensSalvos.length === 0 && produtos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum produto adicionado. Use a busca acima para incluir.
            </p>
          )}

          {/* ── Desconto total (%) e resumo de valores ── */}
          {produtos.length > 0 && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor original</span>
                <span className="font-mono">R$ {fmtMoeda(totalProdutos)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <Label htmlFor="desc_total_pct" className="text-muted-foreground font-normal">
                  Desconto Total (%)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="desc_total_pct"
                    value={descPercent}
                    onChange={(e) => setDescPercent(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="h-8 w-20 text-right font-mono"
                  />
                  <span className={cn('font-mono w-28 text-right', descontoTotalValor > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                    - R$ {fmtMoeda(descontoTotalValor)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm font-medium">
                  Total final
                  {descPct > 0 && (
                    <span className="ml-2 text-xs text-amber-600 font-normal">({descPct}% aplicado)</span>
                  )}
                </span>
                <span className="font-mono font-bold text-primary text-lg">R$ {fmtMoeda(totalFinal)}</span>
              </div>
            </div>
          )}

          {/* ── Checklist Banho e Tosa (tags — clique alterna cor e insere/remove texto na observação) ── */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Banho e tosa</Label>
            <div className="rounded-md border p-2 flex flex-wrap gap-1">
              {OBS_CHECKLIST.map((opt) => {
                const ativo = !!obsFlags[opt];
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const marcado = !ativo;
                      setObsFlags((prev) => ({ ...prev, [opt]: marcado }));
                      setObsTexto((prev) => {
                        const linhas = prev.split('\n').filter((l) => l.trim() !== '');
                        if (marcado) {
                          if (linhas.includes(opt)) return prev;
                          return [...linhas, opt].join('\n');
                        }
                        return linhas.filter((l) => l !== opt).join('\n');
                      });
                    }}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] leading-tight font-medium border transition-colors select-none',
                      ativo
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-muted',
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Observações (abaixo da lista de produtos) ── */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              name="obs"
              rows={3}
              placeholder="Informações adicionais..."
              value={obsTexto}
              onChange={(e) => setObsTexto(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Dialog de quantidade/valor do produto */}
        {prodDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
              className="bg-card rounded-xl shadow-xl p-5 w-full max-w-sm mx-4 space-y-4"
              onKeyDown={(e) => {
                // Enter confirma, Esc cancela — sem propagar para o form
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmarAdicionarProduto();
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setProdDialog(null);
                  setTimeout(() => inputProdRef.current?.focus(), 0);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Adicionar Produto
                </h3>
                <button type="button" onClick={() => setProdDialog(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <p className="font-semibold">{prodDialog.nome_produto}</p>
                <p className="text-xs text-muted-foreground">
                  {[prodDialog.secao, prodDialog.grupo, prodDialog.unidade].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Qtd</label>
                  <Input autoFocus value={pdQtd} onChange={(e) => setPdQtd(e.target.value)} inputMode="decimal" className="text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Valor (R$)</label>
                  <Input value={pdValor} onChange={(e) => setPdValor(e.target.value)} inputMode="decimal" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Desconto (R$)</label>
                  <Input value={pdDesconto} onChange={(e) => setPdDesconto(e.target.value)} inputMode="decimal" />
                </div>
              </div>
              <div className="flex justify-between items-center rounded-md bg-primary/5 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">
                  R$ {fmtMoeda(Math.max(0, (parseFlt(pdValor) - parseFlt(pdDesconto)) * (parseFlt(pdQtd) || 1)))}
                </span>
              </div>
              {pdErro && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{pdErro}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setProdDialog(null)}>Cancelar</Button>
                <Button type="button" onClick={confirmarAdicionarProduto}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Barra de ações fixa embaixo — sempre visível, mesmo rolando a tela */}
        <div className="sticky bottom-0 z-10 pb-3 -mx-4 px-4">
        <div className="rounded-xl border bg-card shadow-lg px-4 py-2.5 space-y-2">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <Link href="/agenda" className="sm:order-1">
              <Button type="button" variant="outline" className="w-full sm:w-auto">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={isPending || !clienteSel} className="w-full sm:w-auto h-auto min-h-8 py-2 whitespace-normal text-center leading-snug">
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                  {modo === 'editar' ? 'Salvando...' : produtos.length > 0 ? 'Salvando agenda e produtos...' : 'Salvando...'}
                </>
              ) : modo === 'editar' ? (
                'Salvar Alterações'
              ) : produtos.length > 0 ? (
                <>Criar Agendamento<span className="hidden sm:inline">{` (+ ${produtos.length} produto${produtos.length > 1 ? 's' : ''})`}</span></>
              ) : (
                'Criar Agendamento'
              )}
            </Button>
          </div>
        </div>
        </div>

      </form>

      {/* ── Dialogs FORA do <form> para evitar submit acidental ── */}

      {/* Confirmação: gravar agenda em filial diferente da padrão */}
      <Dialog open={confirmFilialOpen} onOpenChange={(v: boolean) => { if (!v) { setConfirmFilialOpen(false); pendingSubmit.current = null; } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Atenção — outra filial
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Você está inserindo esta agenda na <strong className="text-foreground">filial {filial}</strong>,
            diferente da sua filial padrão. Deseja seguir mesmo assim?
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => { setConfirmFilialOpen(false); pendingSubmit.current = null; }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmFilialOpen(false);
                pendingSubmit.current?.();
                pendingSubmit.current = null;
              }}
            >
              Sim, continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Categoria de Serviço: mais de uma opção cadastrada p/ este serviço+raça */}
      <Dialog open={!!opcoesCategoriaServico} onOpenChange={(v: boolean) => { if (!v) setOpcoesCategoriaServico(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Selecione a opção do serviço
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Há mais de uma opção cadastrada para <strong className="text-foreground">{servicoNome}</strong>. Escolha qual usar:
          </p>
          <div className="space-y-1.5">
            {opcoesCategoriaServico?.map((op, i) => (
              <button
                key={i}
                type="button"
                onClick={() => escolherOpcaoCategoriaServico(op)}
                className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium">
                  {op.nome_opcao || op.nome_produto}{' '}
                  <span className="text-[10px] font-mono text-muted-foreground">(regra #{op.id_categoria})</span>
                </p>
                {op.nome_opcao && (
                  <p className="text-xs text-muted-foreground">{op.nome_produto}</p>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-1">
            <Button variant="outline" onClick={() => setOpcoesCategoriaServico(null)}>
              Nenhuma (adicionar manualmente)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ultimas agendas do pet - referencia rapida de produtos/valor cobrado */}
      <Dialog open={ultimasAgendasOpen} onOpenChange={setUltimasAgendasOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Últimas agendas {animalSel ? `de ${animalSel.nome}` : ''}
            </DialogTitle>
          </DialogHeader>
          {carregandoUltimas ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />Carregando...
            </div>
          ) : ultimasAgendas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma agenda anterior encontrada para este pet.</p>
          ) : (
            <div className="space-y-3">
              {ultimasAgendas.map(({ agenda, itens }) => (
                <div key={agenda.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">#{agenda.id} · {agenda.servico || '—'}</span>
                    <span className="text-muted-foreground text-xs">{agenda.data}{agenda.hora ? ` ${agenda.hora}` : ''}</span>
                  </div>
                  {itens.length > 0 ? (
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {itens.map((it) => (
                        <li key={it.id_item} className="flex items-center justify-between">
                          <span>{it.qtd}x {it.produto || it.descricao}</span>
                          <span>R$ {fmtMoeda(Number(it.valor_liq || it.valor) * Number(it.qtd || 1))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem produtos lançados.</p>
                  )}
                  <div className="flex items-center justify-between text-sm font-semibold border-t pt-1.5 mt-1.5">
                    <span>Total</span>
                    <span>R$ {fmtMoeda(Number(agenda.sub_total || agenda.valor || 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Agendar retorno: confirma data/intervalo/quantidade após criar a agenda */}
      <Dialog open={!!retornoDialog} onOpenChange={(v: boolean) => { if (!v) setRetornoDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agendar retorno</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Agenda criada com sucesso. Confirme os dados do retorno automático:
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Data do retorno</Label>
              <Input
                type="date"
                value={retornoData}
                onChange={(e) => setRetornoData(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Intervalo (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={retornoIntervalo}
                  onChange={(e) => setRetornoIntervalo(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade de retornos</Label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={retornoQtd}
                  onChange={(e) => setRetornoQtd(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cria {retornoQtd} nova{retornoQtd > 1 ? 's' : ''} agenda{retornoQtd > 1 ? 's' : ''}, a partir de{' '}
              {retornoData.split('-').reverse().join('/')}, espaçada{retornoQtd > 1 ? 's' : ''} por {retornoIntervalo} dias.
            </p>
          </div>
          {erroRetorno && (
            <p className="text-sm text-destructive">{erroRetorno}</p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              disabled={salvandoRetorno}
              onClick={() => {
                const idOriginal = retornoDialog?.agendaId;
                setRetornoDialog(null);
                if (idOriginal) router.replace(`/agenda/${idOriginal}`);
              }}
            >
              Não agendar
            </Button>
            <Button onClick={confirmarRetorno} disabled={salvandoRetorno}>
              {salvandoRetorno ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar retorno'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {autorizDialog}

      {modalTodosAberto && (
        <VerTodosResultadosModal
          termo={q}
          filial={filial}
          racas={racas}
          especies={especies}
          onSelecionarCliente={selecionarCliente}
          onSelecionarPet={selecionarPet}
          onClose={() => setModalTodosAberto(false)}
        />
      )}

      <NovoClienteDialog
        open={novoCliOpen}
        onOpenChange={setNovoCliOpen}
        filial={filial}
        onCriado={(cliente) => {
          setClienteSel(cliente as Cliente);
          setAnimais([]);
          setAnimalSel(null);
          carregarAnimais(cliente.id);
        }}
      />

      {clienteSel && (
        <NovoAnimalDialog
          clienteId={clienteSel.id}
          filialCliente={clienteSel.filial}
          especies={especies}
          racas={racas}
          pelos={pelos}
          open={novoAnimalOpen}
          onOpenChange={setNovoAnimalOpen}
          onCriado={(animal) => {
            carregarAnimais(clienteSel.id, animal.id, animal as Animal);
          }}
        />
      )}

      {/* ── Dialog de estimativa: pergunta prazo mínimo ou máximo ── */}
      {estPendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl p-5 w-full max-w-md mx-4 space-y-4">
            <div>
              <h3 className="font-semibold">Criar Estimativas de Retorno</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Agenda #{estPendente.agendaId} salva. Os produtos abaixo possuem regra de
                estimativa — escolha o prazo para o retorno do cliente.
              </p>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {estPendente.regras.map((item, idx) => (
                <div key={item.regra.id} className="rounded-lg border px-3 py-2.5 space-y-2">
                  <p className="font-medium text-sm">{item.regra.produto}</p>
                  <div className="flex gap-2">
                    {item.regra.dias_min > 0 && (
                      <button
                        type="button"
                        onClick={() => setEstPendente((prev) => prev && ({
                          ...prev,
                          regras: prev.regras.map((r, i) => i === idx ? { ...r, escolha: 'min' } : r),
                        }))}
                        className={cn(
                          'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                          item.escolha === 'min'
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'text-muted-foreground hover:bg-muted/40',
                        )}
                      >
                        Mínimo — {item.regra.dias_min} dias
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEstPendente((prev) => prev && ({
                        ...prev,
                        regras: prev.regras.map((r, i) => i === idx ? { ...r, escolha: 'max' } : r),
                      }))}
                      className={cn(
                        'flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                        item.escolha === 'max'
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                          : 'text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      Máximo — {item.regra.dias_max} dias
                    </button>
                  </div>
                  {item.qtd > 1 && (
                    <p className="text-[11px] text-muted-foreground">
                      Quantidade {item.qtd}: prazo multiplicado ({item.qtd} × {item.escolha === 'min' && item.regra.dias_min > 0 ? item.regra.dias_min : item.regra.dias_max} dias)
                    </p>
                  )}
                </div>
              ))}
            </div>

            {erroEst && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{erroEst}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button" variant="outline" disabled={salvandoEst}
                onClick={() => router.replace(`/agenda/${estPendente.agendaId}`)}
              >
                Pular
              </Button>
              <Button type="button" disabled={salvandoEst} onClick={confirmarEstimativas}>
                {salvandoEst
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
                  : 'Criar Estimativas'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

