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
  adicionarItemNaAgenda,
  createAgenda,
  type AnimalBuscaItem,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/nova/actions';
import {
  verificarRegrasProdutos,
  criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import { Cliente, Animal, Profissional, Servico, Especie, Raca, TipoPelo, Vendedor, AgendaDetalhe } from '@/types/petshop';
import { editarAgenda } from '@/app/(petshop)/agenda/editar/actions';
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
} from 'lucide-react';
// Label e Select ainda usados nos dialogs de produto inline

import { cn } from '@/lib/utils';

interface ProdutoPendente extends ProdutoResultado {
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
  dataInicial?:   string;
  horaInicial?:   string;
  filial:         number;
  proximoNumero?: number;
  modo?:          'criar' | 'editar';
  agendaId?:      number;
  agendaInicial?: AgendaDetalhe;
}

type ResultadoBusca =
  | { tipo: 'cliente'; cliente: Cliente }
  | { tipo: 'pet';    animal: AnimalBuscaItem };

export default function NovoAgendamentoForm({ profissionais, servicos, especies, racas, pelos, vendedores, dataInicial, horaInicial, filial, proximoNumero, modo = 'criar', agendaId, agendaInicial }: Props) {
  const router = useRouter();

  // â"€â"€ Busca unificada â"€â"€
  const [q, setQ]                          = useState('');
  const [resultados, setResultados]        = useState<ResultadoBusca[]>([]);
  const [isBuscando, setIsBuscando]        = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [idxCli, setIdxCli]                = useState(0);   // navegaÃ§Ã£o por teclado
  const debounceRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                           = useRef<HTMLInputElement>(null);
  const dropdownRef                        = useRef<HTMLDivElement>(null);

  // â"€â"€ Cliente / Animal selecionados â"€â"€
  const [clienteSel, setClienteSel]        = useState<Cliente | null>(null);
  const [animais, setAnimais]              = useState<Animal[]>([]);
  const [animalSel, setAnimalSel]          = useState<Animal | null>(null);
  const [isLoadingAnimais, setIsLoadingAnimais] = useState(false);
  const [pesoInput, setPesoInput]          = useState('');

  // â"€â"€ Carrega animais de um cliente â"€â"€
  const carregarAnimais = useCallback(async (
    clienteId: number,
    preSelId?: number,
    preSelAnimal?: Animal,
  ) => {
    setIsLoadingAnimais(true);
    try {
      const lista = (await buscarAnimais(clienteId)).filter((a) => a.obito !== 1);
      setAnimais(lista);
      if (preSelId !== undefined) {
        const encontrado = lista.find((a) => a.id === preSelId) ?? preSelAnimal ?? null;
        setAnimalSel(encontrado);
      }
    } catch {
      setAnimais([]);
    } finally {
      setIsLoadingAnimais(false);
    }
  }, []);

  // â"€â"€ SeleÃ§Ãµes controladas â"€â"€
  const [profId, setProfId]               = useState('');
  const [profNome, setProfNome]           = useState('');
  const [profFilial, setProfFilial]       = useState('');
  const [vendId, setVendId]               = useState('');
  const [vendFilial, setVendFilial]       = useState('');
  const [servicoId, setServicoId]         = useState('');
  const [servicoNome, setServicoNome]     = useState('');
  const [servicoFilial, setServicoFilial] = useState('');

  // â"€â"€ Data/hora de previsÃ£o â"€â"€
  const [dataPrevisao, setDataPrevisao] = useState(() => {
    const dp = dataInicial || new Date().toISOString().split('T')[0];
    const hp = horaInicial || '07:00';
    return dp + 'T' + hp;
  });
  const [dataEntrega, setDataEntrega] = useState('');

  // â"€â"€ Produtos pendentes â"€â"€
  const [produtos,       setProdutos]       = useState<ProdutoPendente[]>([]);
  const [buscaProd,      setBuscaProd]      = useState('');
  const [resProd,        setResProd]        = useState<ProdutoResultado[]>([]);
  const [buscandoProd,   setBuscandoProd]   = useState(false);
  const [dropProdAberto, setDropProdAberto] = useState(false);
  const [idxProd,        setIdxProd]        = useState(0);  // navegaÃ§Ã£o por teclado
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

  const parseFlt = (v: string) => parseFloat(v.replace(',', '.')) || 0;
  const fmtMoeda = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

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

  // MantÃ©m o item destacado visÃ­vel ao navegar com â†'/â†" (rola o dropdown)
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
      if (v.trim().length < 3) { setResProd([]); setDropProdAberto(false); return; }
      setBuscandoProd(true);
      try {
        const lista = await buscarProdutos(v);
        setResProd(lista);
        setIdxProd(0);
        setDropProdAberto(lista.length > 0);
      } finally {
        setBuscandoProd(false);
      }
    }, 300);
  }

  /** Teclado na busca de produtos: â†'/â†" navega, Enter seleciona, Esc fecha */
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
    // Regra: nÃ£o Ã© permitido inserir produto com preÃ§o R$ 0,00
    if (valor <= 0) {
      setPdErro('NÃ£o Ã© permitido inserir produto com preÃ§o R$ 0,00. Informe o valor.');
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
    // LanÃ§amento sequencial: volta o foco para a busca de produtos
    setTimeout(() => inputProdRef.current?.focus(), 0);
  }

  function removerProduto(idx: number) {
    setProdutos((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalProdutos = produtos.reduce(
    (acc, p) => acc + Math.max(0, (p.valor - p.desconto) * p.qtd), 0,
  );

  // â"€â"€ Desconto total (%) sobre os produtos â"€â"€
  const descPct            = Math.min(100, Math.max(0, parseFlt(descPercent)));
  const descontoTotalValor = totalProdutos * descPct / 100;
  const totalFinal         = Math.max(0, totalProdutos - descontoTotalValor);

  // â"€â"€ Controle de abertura dos dialogs reaproveitados â"€â"€
  const [novoCliOpen,    setNovoCliOpen]    = useState(false);
  const [novoAnimalOpen, setNovoAnimalOpen] = useState(false);

  // â"€â"€ Pre-preenchimento no modo editar â"€â"€
  const [obsEditar, setObsEditar] = useState('');
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
    const dtInicio = agendaInicial.data_previsao || (agendaInicial.data ? agendaInicial.data.slice(0,10) + 'T' + (agendaInicial.hora ?? '07:00') : '');
    if (dtInicio) setDataPrevisao(dtInicio.slice(0, 16));
    if (agendaInicial.data_entrega) setDataEntrega(agendaInicial.data_entrega.slice(0, 16));
    // Observações
    setObsEditar(agendaInicial.obs ?? '');
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

  // â"€â"€ Submit â"€â"€
  const [isPending, startSubmit]          = useTransition();
  const [errorMsg, setErrorMsg]           = useState('');

  // â"€â"€ Estimativas (produtos com regra: pergunta prazo mÃ­nimo ou mÃ¡ximo) â"€â"€
  const [estPendente,  setEstPendente]  = useState<EstimativaPendente | null>(null);
  const [salvandoEst,  setSalvandoEst]  = useState(false);
  const [erroEst,      setErroEst]      = useState('');

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
      router.push(`/agenda/${estPendente.agendaId}`);
    } finally {
      setSalvandoEst(false);
    }
  }
  const formRef = useRef<HTMLFormElement>(null);

  // â"€â"€ Fecha dropdown ao clicar fora â"€â"€
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

  // â"€â"€ Auto-busca com debounce a partir de 3 caracteres â"€â"€
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
        const pets = await buscarCombinado(parteA, parteB);
        const lista: ResultadoBusca[] = pets.map((a): ResultadoBusca => ({ tipo: 'pet', animal: a }));
        setResultados(lista);
        setIdxCli(0);
        setDropdownAberto(lista.length > 0);
      } finally {
        setIsBuscando(false);
      }
      return;
    }

    // Busca simples: mÃ­nimo 3 caracteres
    if (textoTrim.length < 3) {
      setResultados([]);
      setDropdownAberto(false);
      return;
    }
    setIsBuscando(true);
    try {
      // Busca em paralelo: clientes e pets
      const [clientes, pets] = await Promise.all([
        buscarClientes(textoTrim),
        buscarPorPet(textoTrim),
      ]);
      const lista: ResultadoBusca[] = [
        ...clientes.slice(0, 6).map((c): ResultadoBusca => ({ tipo: 'cliente', cliente: c })),
        ...pets.filter((a) => a.obito !== 1).slice(0, 6).map((a): ResultadoBusca => ({ tipo: 'pet', animal: a })),
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

  /** Teclado na busca de clientes: â†'/â†" navega, Enter seleciona e avanÃ§a o foco */
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
        // AvanÃ§a o foco para o prÃ³ximo campo do formulÃ¡rio (Data)
        setTimeout(() => document.getElementById('data')?.focus(), 0);
      }
    } else if (e.key === 'Escape') {
      setDropdownAberto(false);
    }
  }

  /** Enter avanÃ§a para o prÃ³ximo campo (comportamento desktop/Delphi).
      Textareas e botÃµes mantÃªm o comportamento padrÃ£o. */
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    if (t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON') return;
    // As buscas tÃªm tratamento prÃ³prio (seleÃ§Ã£o via Enter)
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

  // â"€â"€ Selecionar cliente direto â"€â"€
  function selecionarCliente(c: Cliente, animalPreSel?: Animal) {
    setClienteSel(c);
    setResultados([]);
    setDropdownAberto(false);
    setQ('');
    setAnimalSel(animalPreSel ?? null);
    setAnimais(animalPreSel ? [animalPreSel] : []);
    carregarAnimais(c.id, animalPreSel?.id, animalPreSel);
  }

  // â"€â"€ Selecionar via resultado de pet â"€â"€
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
    // Animal parcial para prÃ©-selecionar
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
      // campos nÃ£o disponÃ­veis na busca rÃ¡pida
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
    // Auto-calcula data_entrega a partir da duraÃ§Ã£o do serviÃ§o
    const duracaoMin = parseInt(s?.duracao ?? '0', 10);
    if (duracaoMin > 0 && dataPrevisao) {
      const dt = new Date(dataPrevisao);
      dt.setMinutes(dt.getMinutes() + duracaoMin);
      setDataEntrega(dt.toISOString().slice(0, 16));
    }
  }

  function handleDataPrevisaoChange(val: string) {
    setDataPrevisao(val);
    // Recalcula data_entrega mantendo a duraÃ§Ã£o atual
    if (dataEntrega && val) {
      const inicioAntes = new Date(dataPrevisao);
      const fimAntes    = new Date(dataEntrega);
      const durMin = isNaN(inicioAntes.getTime()) || isNaN(fimAntes.getTime())
        ? 0
        : (fimAntes.getTime() - inicioAntes.getTime()) / 60000;
      if (durMin > 0) {
        const novoFim = new Date(val);
        novoFim.setMinutes(novoFim.getMinutes() + durMin);
        setDataEntrega(novoFim.toISOString().slice(0, 16));
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');

    // Regra: vendedor obrigatório
    if (!vendId) {
      setErrorMsg('Selecione o vendedor antes de gravar.');
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

    const dataAgenda = dataPrevisao.split('T')[0] || new Date().toISOString().split('T')[0];

    startSubmit(async () => {
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
          obs:            obsEditar,
          peso:           Number(pesoInput) > 0 ? Number(pesoInput) : undefined,
        });
        if (res.error) { setErrorMsg(res.error); return; }
        router.push('/agenda');
        return;
      }

      const result = await createAgenda({}, formData);
      if (result.error) { setErrorMsg(result.error); return; }

      // Adiciona produtos pendentes em sequÃªncia
      if (produtos.length > 0 && result.id) {
        const errosProdutos: string[] = [];
        for (const p of produtos) {
          const res = await adicionarItemNaAgenda(
            result.id, filial,
            p.id_dadospro, p.cod_filial,
            p.qtd, p.valor, p.desconto, p.nome_produto,
            p.nome_produto, p.preco, p.cod_pro,
          );
          if (res.error) errosProdutos.push(`${p.nome_produto}: ${res.error}`);
        }
        if (errosProdutos.length > 0) {
          // Mostra o erro real para diagnÃ³stico antes de navegar
          setErrorMsg(`Agenda #${result.id} criada. Erro ao salvar produtos â€" ${errosProdutos.join(' | ')}`);
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
              // padrÃ£o: prazo mÃ¡ximo (se nÃ£o houver mÃ­nimo cadastrado, sÃ³ hÃ¡ essa opÃ§Ã£o)
              escolha: 'max' as const,
            })),
          });
          return; // nÃ£o navega â€" o dialog de estimativa decide
        }
      }
      router.push(`/agenda/${result.id}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

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

      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-5">

        {/* â"€â"€ Cliente â"€â"€ */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
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
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="font-medium">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || 'â€"'}
                </p>
              </div>
              {modo !== 'editar' && (
                <Button type="button" variant="ghost" size="icon" onClick={limparCliente}>
                  <X className="h-4 w-4" />
                </Button>
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

              {/* Indicador de mÃ­nimo de caracteres */}
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
                          <p className="font-medium text-sm">
                            {r.animal.nome}
                            {r.animal.apelido && r.animal.apelido !== r.animal.nome && (
                              <span className="ml-1 font-normal text-muted-foreground">({r.animal.apelido})</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[r.animal.especie, r.animal.raca].filter(Boolean).join(' Â· ')}
                            {' â€" '}
                            <span className="font-medium text-foreground/70">{r.animal.nome_cliente}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* â"€â"€ Animal â"€â"€ */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              Animal
            </h2>
            {clienteSel && (
              <Button type="button" size="sm" variant="outline" onClick={() => setNovoAnimalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Pet
              </Button>
            )}
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
            <div className="grid sm:grid-cols-2 gap-2">
              {animais.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    const next = animalSel?.id === a.id ? null : a;
                    setAnimalSel(next);
                    setPesoInput(next?.peso ? String(next.peso) : '');
                  }}
                  className={cn(
                    'text-left rounded-lg border px-3 py-2.5 transition-colors',
                    animalSel?.id === a.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/40',
                  )}
                >
                  <p className="font-medium text-sm">{a.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[a.especie, a.raca, a.sexo === 'M' ? 'Macho' : a.sexo === 'F' ? 'FÃªmea' : '']
                      .filter(Boolean).join(' Â· ')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* â"€â"€ Data / Hora / Profissional / ServiÃ§o â"€â"€ */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Detalhes do Agendamento
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="data_previsao">InÃ­cio Previsto *</Label>
              <Input
                id="data_previsao"
                name="data_previsao"
                type="datetime-local"
                value={dataPrevisao}
                onChange={(e) => handleDataPrevisaoChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_entrega">TÃ©rmino Previsto</Label>
              <Input
                id="data_entrega"
                name="data_entrega"
                type="datetime-local"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Auto-calculado ao selecionar o serviÃ§o
              </p>
            </div>
          </div>

          {/* Peso do animal */}
          {animalSel && (
            <div className="space-y-1.5">
              <Label htmlFor="peso_animal" className="flex items-center gap-1.5">
                Peso do Animal
                {animalSel.peso && Number(animalSel.peso) > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (último registrado: {Number(animalSel.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg)
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
          <div className="space-y-1.5">
            <Label>
              Vendedor <span className="text-destructive">*</span>
            </Label>
            <Select
              value={vendId}
              onValueChange={(v) => {
                if (!v) return;
                const vend = vendedores.find((vd) => String(vd.id) === v);
                setVendId(v);
                setVendFilial(String(vend?.filial ?? filial));
              }}
            >
              <SelectTrigger className={!vendId ? 'border-destructive/50' : ''}>
                <SelectValue placeholder="Selecione o vendedor..." />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vd) => (
                  <SelectItem key={vd.id} value={String(vd.id)}>
                    {vd.nome.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select
                value={profId}
                onValueChange={(v) => { if (v) handleProfChange(v); }}
                items={(profissionais ?? []).map((p) => ({ value: String(p.id), label: p.nome }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            <div className="space-y-1.5">
              <Label>Serviço</Label>
              <Select
                value={servicoId}
                onValueChange={(v) => { if (v) handleServicoChange(v); }}
                items={(servicos ?? []).map((s) => ({ value: String(s.id), label: s.descricao }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(servicos ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>

        {/* â"€â"€ Produtos â"€â"€ */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <PackageSearch className="h-3.5 w-3.5" />
            Produtos / ServiÃ§os
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
                placeholder="Buscar por nome ou cÃ³digo... (mÃ­n. 3 caracteres)"
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
                        {[p.secao, p.grupo, p.unidade].filter(Boolean).join(' Â· ')}
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

          {/* Lista de produtos adicionados */}
          {produtos.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Produto</th>
                    <th className="text-right px-3 py-2 font-medium w-12">Qtd</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Valor</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Desc.</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {produtos.map((p, i) => {
                    const total = Math.max(0, (p.valor - p.desconto) * p.qtd);
                    return (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[180px]">{p.nome_produto}</p>
                          {p.unidade && <p className="text-xs text-muted-foreground">{p.unidade}</p>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{p.qtd}</td>
                        <td className="px-3 py-2 text-right font-mono">R$ {fmtMoeda(p.valor)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {p.desconto > 0 ? <span className="text-amber-600">R$ {fmtMoeda(p.desconto)}</span> : 'â€"'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">R$ {fmtMoeda(total)}</td>
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

          {produtos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Nenhum produto adicionado. Use a busca acima para incluir.
            </p>
          )}

          {/* â"€â"€ Desconto total (%) e resumo de valores â"€â"€ */}
          {produtos.length > 0 && (
            <div className="rounded-md border bg-muted/20 px-4 py-3 space-y-2">
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
                    âˆ' R$ {fmtMoeda(descontoTotalValor)}
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

          {/* â"€â"€ ObservaÃ§Ãµes (abaixo da lista de produtos) â"€â"€ */}
          <div className="space-y-1.5">
            <Label htmlFor="obs">ObservaÃ§Ãµes</Label>
            <textarea
              id="obs"
              name="obs"
              rows={2}
              placeholder="InformaÃ§Ãµes adicionais..."
              value={modo === 'editar' ? obsEditar : undefined}
              onChange={modo === 'editar' ? (e) => setObsEditar(e.target.value) : undefined}
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
                // Enter confirma, Esc cancela â€" sem propagar para o form
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
                  {[prodDialog.secao, prodDialog.grupo, prodDialog.unidade].filter(Boolean).join(' Â· ')}
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

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/agenda">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isPending || !clienteSel}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {modo === 'editar' ? 'Salvando...' : produtos.length > 0 ? 'Salvando agenda e produtos...' : 'Salvando...'}
              </>
            ) : modo === 'editar' ? (
              'Salvar Alterações'
            ) : (
              `Criar Agendamento${produtos.length > 0 ? ` (+ ${produtos.length} produto${produtos.length > 1 ? 's' : ''})` : ''}`
            )}
          </Button>
        </div>

      </form>

      {/* â"€â"€ Dialogs FORA do <form> para evitar submit acidental â"€â"€ */}
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

      {/* â"€â"€ Dialog de estimativa: pergunta prazo mÃ­nimo ou mÃ¡ximo â"€â"€ */}
      {estPendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl p-5 w-full max-w-md mx-4 space-y-4">
            <div>
              <h3 className="font-semibold">Criar Estimativas de Retorno</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Agenda #{estPendente.agendaId} salva. Os produtos abaixo possuem regra de
                estimativa â€" escolha o prazo para o retorno do cliente.
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
                        MÃ­nimo â€" {item.regra.dias_min} dias
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
                      MÃ¡ximo â€" {item.regra.dias_max} dias
                    </button>
                  </div>
                  {item.qtd > 1 && (
                    <p className="text-[11px] text-muted-foreground">
                      Quantidade {item.qtd}: prazo multiplicado ({item.qtd} Ã— {item.escolha === 'min' && item.regra.dias_min > 0 ? item.regra.dias_min : item.regra.dias_max} dias)
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
                onClick={() => router.push(`/agenda/${estPendente.agendaId}`)}
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

