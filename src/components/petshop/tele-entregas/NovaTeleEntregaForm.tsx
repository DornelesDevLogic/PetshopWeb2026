'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Search, X, Plus, Trash2, MapPin, Package, UserPlus, Bell, History, ShoppingBag, ChevronDown, ChevronUp, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  criarTeleEntrega, adicionarItemEntrega,
  buscarClientesTele, buscarClientesPorPet, buscarProdutosTele, buscarClienteDetalhe,
  buscarSugestoesTele,
  type ClienteBuscaItem, type ProdutoBuscaItem, type SugestaoItem,
} from '@/app/(petshop)/tele-entregas/actions';
import HistoricoClienteModal from '@/components/petshop/tele-entregas/HistoricoClienteModal';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import NovoClienteModal, { type ClienteCriado } from '@/components/petshop/NovoClienteModal';
import EditableValor from '@/components/petshop/EditableValor';
import { getFilialClient } from '@/lib/filial';
import { buscarUltimasComprasCliente, type CompraHistItem } from '@/app/(petshop)/clientes/historico-actions';
import type { Vendedor } from '@/app/(petshop)/vendedores/actions';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';

// ---------- types ----------

interface ItemLocal {
  key:         number;
  id_dadospro: number; filial: number;
  cod_pro:     string; produto: string; unidade: string;
  qtd:         number; valor:   number; desconto: number;
  regra?:      RegraProduto;    // regra de estimativa, se existir
  dias?:       number;          // 0 = não criar, >0 = criar com N dias
}

// ---------- helpers ----------

function fmtMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function dataHoje() {
  return new Date().toISOString().split('T')[0];
}

// ---------- component ----------

interface Props {
  vendedores?: Vendedor[];
  vendedorInicial?: number;        // vendedor vinculado ao usuário logado (VENDEDOR.FK_USUARIO)
  vendedorFilialInicial?: number;
}

export default function NovaTeleEntregaForm({ vendedores = [], vendedorInicial, vendedorFilialInicial }: Props) {
  const router = useRouter();

  // cliente
  const [clienteQuery,    setClienteQuery]    = useState('');
  const [clienteOpcoes,   setClienteOpcoes]   = useState<ClienteBuscaItem[]>([]);
  const [clienteSel,      setClienteSel]      = useState<ClienteBuscaItem | null>(null);
  const [clienteAberto,   setClienteAberto]   = useState(false);
  const [clienteFocusIdx, setClienteFocusIdx] = useState(-1);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [showHistorico,   setShowHistorico]   = useState(false);
  const clienteDebRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  const inputClienteRef = useRef<HTMLInputElement>(null);
  const listaClienteRef = useRef<HTMLUListElement>(null);

  // endereço de entrega
  const [endereco,    setEndereco]    = useState('');
  const [nroEndereco, setNroEndereco] = useState('');
  const [bairro,      setBairro]      = useState('');
  const [cep,         setCep]         = useState('');

  // dados da entrega
  const [dataEntrega,  setDataEntrega]  = useState('');
  const [horaEntrega,  setHoraEntrega]  = useState('');
  const [animal,       setAnimal]       = useState('');
  const [vendedorId,   setVendedorId]   = useState('');
  const [vendedorFilial, setVendedorFilial] = useState('');

  // Pré-seleciona o vendedor vinculado ao usuário logado — só uma vez, sem
  // sobrescrever se o usuário já escolheu outro.
  const vendedorAutoAplicado = useRef(false);
  useEffect(() => {
    if (vendedorAutoAplicado.current || !vendedorInicial || vendedorId) return;
    const v = vendedores.find(
      (x) => x.id === vendedorInicial && (!vendedorFilialInicial || x.filial === vendedorFilialInicial),
    );
    if (v) {
      setVendedorId(String(v.id));
      setVendedorFilial(String(v.filial));
      vendedorAutoAplicado.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendedores, vendedorInicial, vendedorFilialInicial]);
  const [formapgto,    setFormapgto]    = useState('');
  const [condpgto,     setCondpgto]     = useState('');
  const [frete,        setFrete]        = useState('0');
  const [obs,          setObs]          = useState('');

  // desconto total %
  const [descontoPorc, setDescontoPorc] = useState('0');

  // produtos
  const [prodQuery,    setProdQuery]    = useState('');
  const [prodOpcoes,   setProdOpcoes]   = useState<ProdutoBuscaItem[]>([]);
  const [prodAberto,   setProdAberto]   = useState(false);
  const [prodFocusIdx, setProdFocusIdx] = useState(-1);
  const prodDebRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputProdRef  = useRef<HTMLInputElement>(null);
  const listaProdRef  = useRef<HTMLUListElement>(null);

  // diálogo de produto
  const [prodDlg,   setProdDlg]   = useState<ProdutoBuscaItem | null>(null);
  const [dlgQtd,    setDlgQtd]    = useState('1');
  const [dlgValor,  setDlgValor]  = useState('');
  const [dlgDesc,   setDlgDesc]   = useState('0');
  const [dlgErro,   setDlgErro]   = useState('');
  const [dlgRegra,  setDlgRegra]  = useState<RegraProduto | null>(null);
  const [dlgDias,   setDlgDias]   = useState<number | null>(null); // null=ainda não escolheu, 0=não criar

  const [itens,      setItens]      = useState<ItemLocal[]>([]);
  const keyCounter   = useRef(0);
  const [salvando,   setSalvando]   = useState(false);
  const [erroGeral,  setErroGeral]  = useState('');

  // painel de últimas compras
  const [ultimasCompras,      setUltimasCompras]      = useState<CompraHistItem[]>([]);
  const [carregandoCompras,   setCarregandoCompras]   = useState(false);
  const [painelComprasAberto, setPainelComprasAberto] = useState(true);

  // sugestões do dia (mais vendidos nas tele-entregas dos últimos 2 dias)
  const [sugestoes, setSugestoes] = useState<SugestaoItem[]>([]);
  useEffect(() => {
    buscarSugestoesTele(2, 2).then(setSugestoes).catch(() => {});
  }, []);

  // ---------- totais ----------

  const totalProdutos = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const descPct       = Math.max(0, Math.min(100, Number(descontoPorc) || 0));
  const descontoVal   = totalProdutos * descPct / 100;
  const freteVal      = Number(frete) || 0;
  const totalFinal    = totalProdutos - descontoVal + freteVal;

  // ---------- busca cliente ----------

  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return; }
    if (clienteDebRef.current) clearTimeout(clienteDebRef.current);
    if (!clienteQuery || clienteQuery.length < 2) { setClienteOpcoes([]); setClienteAberto(false); return; }
    clienteDebRef.current = setTimeout(async () => {
      // "dono/pet" ou "pet/dono": busca combinada via nome do animal
      const [parteA, parteB] = clienteQuery.split('/').map((s) => s.trim());
      const r = parteA && parteB && parteA.length >= 2 && parteB.length >= 2
        ? await buscarClientesPorPet(parteA, parteB)
        : await buscarClientesTele(clienteQuery);
      setClienteOpcoes(r);
      setClienteAberto(r.length > 0);
      setClienteFocusIdx(-1);
    }, 350);
    return () => { if (clienteDebRef.current) clearTimeout(clienteDebRef.current); };
  }, [clienteQuery]);

  async function selecionarCliente(c: ClienteBuscaItem) {
    setClienteSel(c);
    justSelectedRef.current = true;
    setClienteQuery(c.nome);
    setClienteOpcoes([]);
    setClienteAberto(false);
    setClienteFocusIdx(-1);
    // foca campo de produto após selecionar cliente
    setTimeout(() => inputProdRef.current?.focus(), 100);
    setUltimasCompras([]);
    setCarregandoCompras(true);
    const [det] = await Promise.all([
      buscarClienteDetalhe(c.id).catch(() => null),
      buscarUltimasComprasCliente(c.id).then(setUltimasCompras).catch(() => {}),
    ]);
    setCarregandoCompras(false);
    if (det) {
      setEndereco(det.endereco || '');
      setNroEndereco(det.numero || '');
      setBairro(det.bairro || '');
      setCep(det.cep || '');
    }
  }

  function aoNovoClienteCriado(c: ClienteCriado) {
    setShowNovoCliente(false);
    selecionarCliente({ id: c.id, filial: getFilialClient(), nome: c.nome, telefone: c.telefone, celular: c.celular });
  }

  // ---------- busca produto ----------

  useEffect(() => {
    if (prodDebRef.current) clearTimeout(prodDebRef.current);
    const termos = normalizarTermosBusca(prodQuery);
    if (!termos.some(t => t.length >= 2)) { setProdOpcoes([]); setProdAberto(false); return; }
    prodDebRef.current = setTimeout(async () => {
      const r = await buscarProdutosTele(termoPrincipal(termos));
      const filtrados = filtrarProdutosPorTermos(r, termos, p => p.descricao + ' ' + p.cod_pro);
      setProdOpcoes(filtrados);
      setProdAberto(filtrados.length > 0);
      setProdFocusIdx(-1);
    }, 300);
    return () => { if (prodDebRef.current) clearTimeout(prodDebRef.current); };
  }, [prodQuery]);

  // scroll automático para o item focado
  useEffect(() => {
    if (!listaProdRef.current || prodFocusIdx < 0) return;
    (listaProdRef.current.children[prodFocusIdx] as HTMLElement | undefined)
      ?.scrollIntoView({ block: 'nearest' });
  }, [prodFocusIdx]);

  async function abrirDialogoProduto(p: ProdutoBuscaItem) {
    setProdDlg(p);
    setDlgQtd('1');
    setDlgValor(String(p.preco));
    setDlgDesc('0');
    setDlgErro('');
    setDlgDias(null);
    setProdQuery('');
    setProdOpcoes([]);
    setProdAberto(false);
    // verifica regra de estimativa para o produto
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setDlgRegra(regras[0] ?? null);
    if (!regras[0]) setDlgDias(0); // sem regra → não cria estimativa
  }

  function confirmarProduto() {
    if (!prodDlg) return;
    const qtd   = Number(dlgQtd)   || 0;
    const valor = Number(dlgValor) || 0;
    if (qtd <= 0)   { setDlgErro('Quantidade inválida'); return; }
    if (valor <= 0) { setDlgErro('Valor deve ser maior que R$ 0,00'); return; }
    if (dlgRegra && dlgDias === null) { setDlgErro('Escolha o prazo do lembrete'); return; }
    const chave = ++keyCounter.current;
    setItens(prev => [...prev, {
      key:         chave,
      id_dadospro: prodDlg.id_dadospro,
      filial:      prodDlg.filial,
      cod_pro:     prodDlg.cod_pro,
      produto:     prodDlg.descricao,
      unidade:     prodDlg.unidade,
      qtd, valor,
      desconto:    Number(dlgDesc) || 0,
      regra:       dlgRegra ?? undefined,
      dias:        dlgDias ?? 0,
    }]);
    setProdDlg(null);
    setTimeout(() => inputProdRef.current?.focus(), 0);
  }

  function removerItem(key: number) {
    setItens(prev => prev.filter(i => i.key !== key));
  }

  function alterarValorItem(key: number, novoValor: number) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, valor: novoValor } : i));
  }

  // ---------- salvar ----------

  async function salvar() {
    setErroGeral('');
    if (!clienteSel)        { setErroGeral('Selecione um cliente'); return; }
    if (!vendedorId)        { setErroGeral('Selecione o vendedor'); return; }
    if (itens.length === 0) { setErroGeral('Adicione pelo menos um produto'); return; }

    setSalvando(true);

    const dadosObs = [obs, formapgto && `Pgto: ${formapgto}`, condpgto && `Cond: ${condpgto}`].filter(Boolean).join(' | ');

    const body: Record<string, unknown> = {
      cliente_id:   clienteSel.id,
      cliente:      clienteSel.nome,
      valor:        totalFinal,
      sub_total:    totalProdutos,
      val_produtos: totalProdutos,
      desconto:     descontoVal,
      valor_frete:  freteVal || 0,
    };
    if (animal) body.animal = animal;
    if (vendedorId) {
      const vend = vendedores.find(v => String(v.id) === vendedorId && String(v.filial) === vendedorFilial);
      body.codvend      = Number(vendedorId);
      body.vend_filial  = Number(vendedorFilial) || 1;
      body.profissional = vend?.nome ?? '';
    }
    if (dadosObs)     body.dados        = dadosObs;
    if (dataEntrega)  body.data_entrega = dataEntrega;
    if (horaEntrega)  body.hora_entrega = horaEntrega;
    if (endereco)     body.endereco     = endereco;
    if (bairro)       body.bairro       = bairro;
    if (cep)          body.cep          = cep;
    if (nroEndereco)  body.nro_endereco = nroEndereco;

    const res = await criarTeleEntrega(body);
    if (res.CodStatus !== 1 || !res.id) {
      setErroGeral(res.DescricaoStatus || 'Erro ao criar tele-entrega');
      setSalvando(false);
      return;
    }

    const orcaId = res.id;
    const erros: string[] = [];

    for (const item of itens) {
      const r = await adicionarItemEntrega({
        agenda_id:   orcaId,
        prod_id:     item.id_dadospro,
        prod_filial: item.filial,
        dadospro_id: item.id_dadospro,
        cod_prod:    item.cod_pro,
        qtd:         item.qtd,
        valor:       item.valor,
        desconto:    item.desconto,
        descricao:   '',
      });
      if (r.CodStatus !== 1) erros.push(`${item.produto}: ${r.DescricaoStatus}`);

      // cria estimativa se produto tem regra e dias escolhido > 0
      if (item.regra && (item.dias ?? 0) > 0) {
        await criarEstimativa({
          clienteId:     clienteSel.id,
          clienteFilial: getFilialClient(),
          clienteNome:   clienteSel.nome,
          animalId:      0,
          animalFilial:  getFilialClient(),
          animalNome:    animal,
          dadosproId:    item.id_dadospro,
          descPro:       item.produto,
          qtd:           item.qtd,
          dataCompra:    dataHoje(),
          dias:          item.dias!,
          orcaId,
          orcaFilial:    getFilialClient(),
        }).catch(() => null);
      }
    }

    setSalvando(false);
    if (erros.length > 0) {
      setErroGeral(`Entrega criada (#${orcaId}), mas alguns itens falharam: ${erros.join('; ')}`);
    } else {
      router.push(`/tele-entregas/${orcaId}`);
    }
  }

  // ---------- render ----------

  return (
    <div className="relative p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {salvando && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-white font-medium text-sm">Gravando tele-entrega...</p>
        </div>
      )}
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        Nova Tele-entrega
      </h1>

      {/* ── Cliente ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Cliente</h2>
          <button
            onClick={() => setShowNovoCliente(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        </div>
        <div className="relative">
          <div className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 h-9 transition-colors',
            clienteAberto ? 'border-primary ring-1 ring-primary' : 'border-input',
          )}>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputClienteRef}
              value={clienteQuery}
              onChange={(e) => {
                setClienteQuery(e.target.value);
                if (clienteSel && e.target.value !== clienteSel.nome) setClienteSel(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!clienteAberto && clienteOpcoes.length > 0) { setClienteAberto(true); return; }
                  const next = Math.min(clienteFocusIdx + 1, clienteOpcoes.length - 1);
                  setClienteFocusIdx(next);
                  listaClienteRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = Math.max(clienteFocusIdx - 1, 0);
                  setClienteFocusIdx(prev);
                  listaClienteRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (clienteAberto && clienteOpcoes.length > 0) {
                    selecionarCliente(clienteOpcoes[clienteFocusIdx >= 0 ? clienteFocusIdx : 0]);
                  }
                } else if (e.key === 'Tab') {
                  if (clienteAberto && clienteOpcoes.length > 0) {
                    e.preventDefault();
                    selecionarCliente(clienteOpcoes[clienteFocusIdx >= 0 ? clienteFocusIdx : 0]);
                  }
                } else if (e.key === 'Escape') {
                  setClienteAberto(false);
                  setClienteFocusIdx(-1);
                }
              }}
              onBlur={() => setTimeout(() => setClienteAberto(false), 150)}
              placeholder="Digite nome ou telefone..."
              className="flex-1 min-w-0 text-sm bg-transparent outline-none"
            />
            {clienteSel && (
              <button tabIndex={-1} onClick={() => { setClienteSel(null); setClienteQuery(''); inputClienteRef.current?.focus(); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {clienteAberto && clienteOpcoes.length > 0 && (
            <ul
              ref={listaClienteRef}
              className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto text-sm"
            >
              {clienteOpcoes.map((c, i) => (
                <li
                  key={c.id}
                  onMouseDown={(e) => { e.preventDefault(); selecionarCliente(c); }}
                  className={cn(
                    'px-3 py-2 cursor-pointer',
                    i === clienteFocusIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  <p className="font-medium">{c.nome}</p>
                  <p className={cn('text-xs', i === clienteFocusIdx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {c.telefone || c.celular}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {clienteSel && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Tel: {clienteSel.telefone || clienteSel.celular || '—'} · Código: {clienteSel.id}
            </p>
            <button
              type="button"
              onClick={() => setShowHistorico(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
            >
              <History className="h-3.5 w-3.5" />
              Histórico do cliente
            </button>
          </div>
        )}
      </section>

      {/* ── Painel inteligente: Últimas Compras ── */}
      {clienteSel && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setPainelComprasAberto(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Últimas compras de {clienteSel.nome}
              {ultimasCompras.length > 0 && (
                <span className="rounded-full bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 px-1.5 text-[10px] font-semibold">
                  {ultimasCompras.length}
                </span>
              )}
            </span>
            {painelComprasAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {painelComprasAberto && (
            <div className="px-4 pb-4">
              {carregandoCompras ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 py-3">
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Buscando histórico de compras...
                </div>
              ) : ultimasCompras.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-700/60 dark:text-amber-400/60 py-3">
                  <ShoppingBag className="h-4 w-4" />
                  Nenhuma compra encontrada para este cliente.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mb-2">
                    Clique em + para adicionar o produto à entrega
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {ultimasCompras.map((c, i) => {
                      const valor = parseFloat(String(c.valor_unit).replace(',', '.')) || 0;
                      const dataStr = c.data.slice(0, 10);
                      const [y, m, d] = dataStr.split('-');
                      const dataFmt = (y && m && d) ? `${d}/${m}/${y}` : dataStr;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-white/80 dark:bg-white/5 border border-amber-100 dark:border-amber-900 px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.produto}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {dataFmt} · Qtd {c.qtd} · {c.unidade}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-primary whitespace-nowrap">
                            R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            title="Adicionar à entrega"
                            onClick={async () => {
                              // Busca o produto pelo nome para obter id_dadospro
                              const prods = await buscarProdutosTele(c.produto.slice(0, 20));
                              const match = prods[0];
                              if (match) abrirDialogoProduto(match);
                            }}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Endereço de entrega ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Endereço</label>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua / Av." className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Número</label>
            <Input value={nroEndereco} onChange={(e) => setNroEndereco(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Bairro</label>
            <Input value={bairro} onChange={(e) => setBairro(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">CEP</label>
            <Input value={cep} onChange={(e) => setCep(e.target.value)} className="h-9 text-sm" placeholder="00000-000" />
          </div>
        </div>
      </section>

      {/* ── Produtos ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-1.5">
          <Package className="h-4 w-4 text-primary" /> Produtos
        </h2>

        {/* Sugestão do dia: mais vendidos nas tele-entregas dos últimos 2 dias */}
        {sugestoes.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sugestão do dia
              <span className="font-normal text-violet-600/70 dark:text-violet-400/70">
                — mais vendidos nas tele-entregas (últimos 2 dias)
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {sugestoes.map((s) => (
                <button
                  key={s.id_dadospro}
                  type="button"
                  onClick={() => abrirDialogoProduto(s)}
                  className="flex items-center justify-between gap-2 rounded-md border border-violet-200 dark:border-violet-800 bg-background px-3 py-2 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.descricao}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-violet-500" />
                      {s.total_vendido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} vendidos
                      {s.cod_pro ? ` · ${s.cod_pro}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-mono text-violet-700 dark:text-violet-300">
                      R$ {fmtMoeda(s.preco)}
                    </span>
                    <Plus className="h-4 w-4 text-violet-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <div className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 h-9 transition-colors',
            prodAberto ? 'border-primary ring-1 ring-primary' : 'border-input',
          )}>
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputProdRef}
              value={prodQuery}
              onChange={(e) => { setProdQuery(e.target.value); setProdFocusIdx(-1); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!prodAberto && prodOpcoes.length > 0) { setProdAberto(true); setProdFocusIdx(0); return; }
                  setProdFocusIdx(i => Math.min(i + 1, prodOpcoes.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setProdFocusIdx(i => Math.max(i - 1, 0));
                } else if (e.key === 'PageDown') {
                  e.preventDefault();
                  setProdFocusIdx(i => Math.min(i + 5, prodOpcoes.length - 1));
                } else if (e.key === 'PageUp') {
                  e.preventDefault();
                  setProdFocusIdx(i => Math.max(i - 5, 0));
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  setProdFocusIdx(0);
                } else if (e.key === 'End') {
                  e.preventDefault();
                  setProdFocusIdx(prodOpcoes.length - 1);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (prodAberto && prodOpcoes.length > 0) {
                    abrirDialogoProduto(prodOpcoes[prodFocusIdx >= 0 ? prodFocusIdx : 0]);
                  }
                } else if (e.key === 'Escape') {
                  setProdAberto(false);
                  setProdFocusIdx(-1);
                }
              }}
              onBlur={() => setTimeout(() => setProdAberto(false), 150)}
              placeholder="Buscar produto por nome ou código..."
              className="flex-1 min-w-0 text-sm bg-transparent outline-none"
            />
            {prodQuery && (
              <button tabIndex={-1} onClick={() => { setProdQuery(''); setProdOpcoes([]); inputProdRef.current?.focus(); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          {prodAberto && prodOpcoes.length > 0 && (
            <ul ref={listaProdRef} className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg max-h-56 overflow-y-auto text-sm">
              {prodOpcoes.map((p, i) => (
                <li
                  key={p.id_dadospro}
                  onMouseDown={(e) => { e.preventDefault(); abrirDialogoProduto(p); }}
                  className={cn(
                    'px-3 py-2 cursor-pointer',
                    i === prodFocusIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  <span className="font-medium">{p.descricao}</span>
                  <span className={cn('text-xs ml-2', i === prodFocusIdx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{p.cod_pro}</span>
                  <span className={cn('text-xs ml-2', p.estoque <= 0 ? 'text-red-500' : i === prodFocusIdx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    Est: {p.estoque}
                  </span>
                  <span className={cn('text-xs font-mono ml-2', i === prodFocusIdx ? 'text-primary-foreground' : 'text-primary')}>R$ {fmtMoeda(p.preco)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {itens.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-1.5 w-20">Código</th>
                  <th className="text-left px-3 py-1.5">Produto</th>
                  <th className="text-center px-2 py-1.5 w-16">Qtd</th>
                  <th className="text-right px-2 py-1.5 w-24">Valor</th>
                  <th className="text-right px-2 py-1.5 w-24">Total</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.key} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{item.cod_pro}</td>
                    <td className="px-3 py-1.5">
                      <p className="font-medium flex items-center gap-1.5">
                        {item.produto}
                        {item.regra && (item.dias ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <Bell className="h-2.5 w-2.5" /> {item.dias}d
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.unidade}</p>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono">{item.qtd}</td>
                    <td className="px-2 py-1.5 text-right font-mono">
                      R$ <EditableValor valor={item.valor} fmt={fmtMoeda} onCommit={(v) => alterarValorItem(item.key, v)} />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">
                      R$ {fmtMoeda(item.qtd * item.valor)}
                    </td>
                    <td className="px-1">
                      <button onClick={() => removerItem(item.key)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {itens.length > 0 && (
          <div className="flex items-center justify-end gap-3">
            <label className="text-xs text-muted-foreground">Desconto total (%)</label>
            <Input
              type="number" min="0" max="100" step="0.1"
              value={descontoPorc}
              onChange={(e) => setDescontoPorc(e.target.value)}
              className="h-8 w-20 text-sm text-right font-mono"
            />
          </div>
        )}
      </section>

      {/* ── Dados da entrega ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm">Dados da Entrega</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 space-y-1">
            <label className="text-xs text-muted-foreground">
              Vendedor <span className="text-destructive">*</span>
            </label>
            <select
              value={vendedorId ? `${vendedorFilial}:${vendedorId}` : ''}
              onChange={(e) => {
                const [fil, id] = e.target.value.split(':');
                setVendedorId(id ?? '');
                setVendedorFilial(fil ?? '');
              }}
              className={cn(
                'w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 ring-primary',
                !vendedorId ? 'border-destructive/50' : 'border-input',
              )}
            >
              <option value="">— Selecione —</option>
              {vendedores.map(v => (
                <option key={`${v.filial}:${v.id}`} value={`${v.filial}:${v.id}`}>{v.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data de entrega</label>
            <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hora de entrega</label>
            <Input type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Animal</label>
            <Input value={animal} onChange={(e) => setAnimal(e.target.value)} placeholder="Nome do animal" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Forma de pagamento</label>
            <Input value={formapgto} onChange={(e) => setFormapgto(e.target.value)} placeholder="Dinheiro, cartão..." className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Condição de pagamento</label>
            <Input value={condpgto} onChange={(e) => setCondpgto(e.target.value)} placeholder="À vista, 30d..." className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Frete (R$)</label>
            <Input type="number" min="0" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} className="h-9 text-sm text-right font-mono" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Observações</label>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background p-2 text-sm resize-none outline-none focus:ring-2 ring-primary"
            placeholder="Instruções de entrega, portão, etc."
          />
        </div>
      </section>

      {/* ── Totais ── */}
      {itens.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal produtos</span><span className="font-mono">R$ {fmtMoeda(totalProdutos)}</span></div>
          {descontoVal > 0 && <div className="flex justify-between text-red-500"><span>Desconto ({descPct}%)</span><span className="font-mono">-R$ {fmtMoeda(descontoVal)}</span></div>}
          {freteVal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="font-mono">R$ {fmtMoeda(freteVal)}</span></div>}
          <div className="flex justify-between font-semibold text-base border-t pt-1.5"><span>Total</span><span className="font-mono text-primary">R$ {fmtMoeda(totalFinal)}</span></div>
        </div>
      )}

      {erroGeral && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{erroGeral}</p>}

      {/* ── Ações ── */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={salvando}>Cancelar</Button>
        <Button onClick={salvar} disabled={salvando} className="gap-1.5">
          {salvando ? 'Salvando...' : <><Truck className="h-4 w-4" /> Criar Tele-entrega</>}
        </Button>
      </div>

      {/* ── Diálogo de produto ── */}
      {prodDlg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setProdDlg(null);
            if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
              e.preventDefault();
              confirmarProduto();
            }
          }}
        >
          <div className="bg-card rounded-xl shadow-xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-sm">{prodDlg.descricao}</h2>
            <p className="text-xs text-muted-foreground font-mono">{prodDlg.cod_pro}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Qtd</label>
                <Input type="number" min="1" step="0.001" value={dlgQtd} onChange={(e) => setDlgQtd(e.target.value)} autoFocus className="h-9 text-sm text-right font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valor (R$)</label>
                <Input type="number" min="0" step="0.01" value={dlgValor} onChange={(e) => setDlgValor(e.target.value)} className="h-9 text-sm text-right font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Desc. (%)</label>
                <Input type="number" min="0" max="100" value={dlgDesc} onChange={(e) => setDlgDesc(e.target.value)} className="h-9 text-sm text-right font-mono" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estoque: <span className={prodDlg.estoque <= 0 ? 'text-red-500 font-semibold' : ''}>{prodDlg.estoque}</span>
              {' '}· Tabela: R$ {fmtMoeda(prodDlg.preco)}
            </p>

            {/* ── Estimativa ── */}
            {dlgRegra && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Bell className="h-3.5 w-3.5" />
                  Lembrete de recompra — escolha o prazo:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDlgDias(dlgRegra.dias_min)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      dlgDias === dlgRegra.dias_min
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40',
                    )}
                  >
                    Mínimo ({dlgRegra.dias_min} dias)
                  </button>
                  <button
                    onClick={() => setDlgDias(dlgRegra.dias_max)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      dlgDias === dlgRegra.dias_max
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40',
                    )}
                  >
                    Máximo ({dlgRegra.dias_max} dias)
                  </button>
                  <button
                    onClick={() => setDlgDias(0)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      dlgDias === 0
                        ? 'border-gray-400 bg-gray-400 text-white'
                        : 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
                    )}
                  >
                    Não criar lembrete
                  </button>
                </div>
              </div>
            )}

            {dlgErro && <p className="text-xs text-destructive">{dlgErro}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setProdDlg(null)}>Cancelar</Button>
              <Button size="sm" onClick={confirmarProduto} className="gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal novo cliente ── */}
      {showNovoCliente && (
        <NovoClienteModal
          onClose={() => setShowNovoCliente(false)}
          onSuccess={aoNovoClienteCriado}
        />
      )}

      {/* ── Modal histórico do cliente ── */}
      {showHistorico && clienteSel && (
        <HistoricoClienteModal
          clienteId={clienteSel.id}
          clienteNome={clienteSel.nome}
          onClose={() => setShowHistorico(false)}
        />
      )}
    </div>
  );
}
