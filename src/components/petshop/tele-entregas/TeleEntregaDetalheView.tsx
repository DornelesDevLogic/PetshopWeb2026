'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck, ArrowLeft, CheckCircle, XCircle, Save,
  MapPin, Package, Plus, Trash2, Search, X, Bell, Printer, History, Pencil,
} from 'lucide-react';
import HistoricoClienteModal from '@/components/petshop/tele-entregas/HistoricoClienteModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  type TeleEntregaDetalhe, type ItemEntrega,
  atualizarTeleEntrega, confirmarTeleEntrega, cancelarTeleEntrega,
  adicionarItemEntrega, removerItemEntrega, atualizarItemEntrega,
  buscarProdutosTele, type ProdutoBuscaItem,
  buscarClientesTele, buscarClienteDetalhe, type ClienteBuscaItem,
} from '@/app/(petshop)/tele-entregas/actions';
import { buscarVendedores, type Vendedor } from '@/app/(petshop)/vendedores/actions';
import {
  verificarRegrasProdutos, criarEstimativa,
  type RegraProduto,
} from '@/app/(petshop)/estimativas/actions';
import { getFilialClient } from '@/lib/filial';
import { printWindow } from '@/lib/printWindow';
import { gerarComandaTeleEntrega } from '@/components/petshop/print/comandaTeleEntrega';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';
import { DadosEmpresa } from '@/types/petshop';

// ---------- helpers ----------

type ProdutoBusca = ProdutoBuscaItem;

const buscarProdutos = buscarProdutosTele;

function fmtMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}
function fmtData(s: string) {
  if (!s) return '—';
  // já está em DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  // ISO: YYYY-MM-DD
  const d = s.split(' ')[0];
  const [y, m, dd] = d.split('-');
  if (!dd) return s;
  return `${dd}/${m}/${y}`;
}
function toDateInput(s: string) {
  if (!s) return '';
  // DD/MM/YYYY → YYYY-MM-DD para <input type="date">
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [dd, mm, yyyy] = s.slice(0, 10).split('/');
    return `${yyyy}-${mm}-${dd}`;
  }
  return s.split(' ')[0];
}

const STATUS_LABEL: Record<number, string> = { 1: 'Aberta', 3: 'Entregue', 4: 'Cancelada' };
const STATUS_CLS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-red-100 text-red-700',
};

// ---------- component ----------

interface Props {
  detalhe: TeleEntregaDetalhe;
  itens:   ItemEntrega[];
  empresa: DadosEmpresa | null;
}

export default function TeleEntregaDetalheView({ detalhe, itens: itensInit, empresa }: Props) {
  const router = useRouter();
  const canEdit = Number(detalhe.status) === 1;

  // campos editáveis — info geral
  const [clienteId,   setClienteId]   = useState(detalhe.cliente_id);
  const [clienteNome, setClienteNome] = useState(detalhe.cliente);
  const [animal,      setAnimal]      = useState(detalhe.animal ?? '');
  const [vendedorId,  setVendedorId]  = useState('');
  const [dataPedido,  setDataPedido]  = useState(toDateInput(detalhe.data));
  const [horaPedido,  setHoraPedido]  = useState(detalhe.hora?.slice(0, 5) ?? '');
  const [vendedores,  setVendedores]  = useState<Vendedor[]>([]);

  // campos editáveis — endereço / entrega
  const [endereco,    setEndereco]    = useState(detalhe.endereco);
  const [nroEndereco, setNroEndereco] = useState(detalhe.nro_endereco);
  const [bairro,      setBairro]      = useState(detalhe.bairro);
  const [cep,         setCep]         = useState(detalhe.cep);
  const [dataEntrega, setDataEntrega] = useState(toDateInput(detalhe.data_entrega));
  const [horaEntrega, setHoraEntrega] = useState(detalhe.hora_entrega?.slice(0, 5) ?? '');
  const [formapgto,   setFormapgto]   = useState(detalhe.formapgto);
  const [condpgto,    setCondpgto]    = useState(detalhe.condpgto);
  const [frete,       setFrete]       = useState(String(detalhe.valor_frete || 0));
  const [obs,         setObs]         = useState(detalhe.dados);

  // busca cliente
  const [clienteQuery,  setClienteQuery]  = useState('');
  const [clienteOpcoes, setClienteOpcoes] = useState<ClienteBuscaItem[]>([]);
  const [clienteAberto, setClienteAberto] = useState(false);
  const [alterandoCliente, setAlterandoCliente] = useState(false);
  const clienteDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // editar item existente
  const [editItemDlg, setEditItemDlg] = useState<ItemEntrega | null>(null);
  const [editQtd,     setEditQtd]     = useState('');
  const [editValor,   setEditValor]   = useState('');
  const [editErro,    setEditErro]    = useState('');

  // itens
  const [itens, setItens] = useState<ItemEntrega[]>(itensInit);

  // produto busca
  const [prodQuery,    setProdQuery]    = useState('');
  const [prodOpcoes,   setProdOpcoes]   = useState<ProdutoBusca[]>([]);
  const [prodAberto,   setProdAberto]   = useState(false);
  const [prodFocusIdx, setProdFocusIdx] = useState(-1);
  const [prodDlg,      setProdDlg]      = useState<ProdutoBusca | null>(null);
  const [dlgQtd,       setDlgQtd]       = useState('1');
  const [dlgValor,     setDlgValor]     = useState('');
  const [dlgDesc,      setDlgDesc]      = useState('0');
  const [dlgErro,      setDlgErro]      = useState('');
  const [dlgRegra,     setDlgRegra]     = useState<RegraProduto | null>(null);
  const [dlgDias,      setDlgDias]      = useState<number | null>(null);
  const prodDebRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputProdRef = useRef<HTMLInputElement>(null);
  const listaProdRef = useRef<HTMLUListElement>(null);

  // estados de ação
  const [salvando, setSalvando]  = useState(false);
  const [erro,     setErro]      = useState('');
  const [sucesso,  setSucesso]   = useState('');

  // modal cancelar
  const [showCancel,   setShowCancel]   = useState(false);
  const [justificativa, setJustificativa] = useState('');

  // modal histórico
  const [showHistorico, setShowHistorico] = useState(false);

  // ---------- efeitos de inicialização ----------

  useEffect(() => {
    buscarVendedores().then(setVendedores).catch(() => {});
  }, []);

  // ---------- busca cliente ----------

  useEffect(() => {
    if (clienteDebRef.current) clearTimeout(clienteDebRef.current);
    if (clienteQuery.trim().length < 2) { setClienteOpcoes([]); setClienteAberto(false); return; }
    clienteDebRef.current = setTimeout(async () => {
      const r = await buscarClientesTele(clienteQuery);
      setClienteOpcoes(r);
      setClienteAberto(r.length > 0);
    }, 300);
    return () => { if (clienteDebRef.current) clearTimeout(clienteDebRef.current); };
  }, [clienteQuery]);

  function selecionarCliente(c: ClienteBuscaItem) {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteQuery('');
    setClienteOpcoes([]);
    setClienteAberto(false);
    setAlterandoCliente(false);
    buscarClienteDetalhe(c.id).then(det => {
      if (!det) return;
      if (!endereco) setEndereco(det.endereco);
      if (!nroEndereco) setNroEndereco(det.numero);
      if (!bairro) setBairro(det.bairro);
      if (!cep) setCep(det.cep);
    }).catch(() => {});
  }

  // ---------- editar item ----------

  function abrirEdicaoItem(item: ItemEntrega) {
    setEditItemDlg(item);
    setEditQtd(String(item.qtd));
    setEditValor(String(item.valor));
    setEditErro('');
  }

  async function handleEditarItem() {
    if (!editItemDlg) return;
    const qtd   = Number(editQtd)   || 0;
    const valor = Number(editValor) || 0;
    if (qtd <= 0)   { setEditErro('Quantidade inválida'); return; }
    if (valor <= 0) { setEditErro('Valor inválido'); return; }
    setSalvando(true);
    const r = await atualizarItemEntrega({ id_item: editItemDlg.id_item, qtd, valor });
    setSalvando(false);
    if (r.CodStatus === 1) {
      setItens(prev => prev.map(i => i.id_item === editItemDlg.id_item ? { ...i, qtd, valor } : i));
      setEditItemDlg(null);
    } else {
      setEditErro(r.DescricaoStatus);
    }
  }

  // ---------- busca produto ----------

  useEffect(() => {
    if (prodDebRef.current) clearTimeout(prodDebRef.current);
    const termos = normalizarTermosBusca(prodQuery);
    if (!termos.some(t => t.length >= 2)) { setProdOpcoes([]); setProdAberto(false); return; }
    prodDebRef.current = setTimeout(async () => {
      const r = await buscarProdutos(termoPrincipal(termos));
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

  async function abrirDlgProduto(p: ProdutoBusca) {
    setProdDlg(p);
    setDlgQtd('1');
    setDlgValor(String(p.preco));
    setDlgDesc('0');
    setDlgErro('');
    setDlgDias(null);
    setProdQuery('');
    setProdOpcoes([]);
    setProdAberto(false);
    const regras = await verificarRegrasProdutos([p.id_dadospro]).catch(() => []);
    setDlgRegra(regras[0] ?? null);
    if (!regras[0]) setDlgDias(0);
  }

  async function confirmarProduto() {
    if (!prodDlg) return;
    const qtd   = Number(dlgQtd)   || 0;
    const valor = Number(dlgValor) || 0;
    if (qtd <= 0)   { setDlgErro('Quantidade inválida'); return; }
    if (valor <= 0) { setDlgErro('Valor deve ser maior que R$ 0,00'); return; }
    if (dlgRegra && dlgDias === null) { setDlgErro('Escolha o prazo do lembrete'); return; }
    setSalvando(true);
    const r = await adicionarItemEntrega({
      agenda_id:   detalhe.id,
      prod_id:     prodDlg.id_dadospro,
      prod_filial: prodDlg.filial,
      dadospro_id: prodDlg.id_dadospro,
      cod_prod:    prodDlg.cod_pro,
      qtd, valor,
      desconto: Number(dlgDesc) || 0,
      descricao: '',
    });
    if (r.CodStatus === 1 && dlgRegra && (dlgDias ?? 0) > 0) {
      await criarEstimativa({
        clienteId:     detalhe.cliente_id,
        clienteFilial: getFilialClient(),
        clienteNome:   detalhe.cliente,
        animalId:      0,
        animalFilial:  getFilialClient(),
        animalNome:    detalhe.animal ?? '',
        dadosproId:    prodDlg.id_dadospro,
        descPro:       prodDlg.descricao,
        qtd,
        dataCompra:    new Date().toISOString().split('T')[0],
        dias:          dlgDias!,
        orcaId:        detalhe.id,
        orcaFilial:    getFilialClient(),
      }).catch(() => null);
    }
    setSalvando(false);
    if (r.CodStatus === 1) {
      setProdDlg(null);
      setTimeout(() => inputProdRef.current?.focus(), 0);
      router.refresh();
    } else {
      setDlgErro(r.DescricaoStatus);
    }
  }

  async function handleRemoverItem(idItem: number) {
    if (!confirm('Remover este item?')) return;
    const r = await removerItemEntrega(idItem);
    if (r.CodStatus === 1) {
      setItens(prev => prev.filter(i => i.id_item !== idItem));
    } else {
      setErro(r.DescricaoStatus);
    }
  }

  // ---------- salvar edição ----------

  async function salvarEdicao(depoisImprimir = false) {
    setSalvando(true); setErro(''); setSucesso('');
    const body: Record<string, unknown> = {
      id:           detalhe.id,
      cliente_id:   clienteId,
      cliente:      clienteNome,
      animal,
      data:         dataPedido,
      hora:         horaPedido,
      endereco, bairro, cep, nro_endereco: nroEndereco,
      formapgto, condpgto, dados: obs,
      valor_frete:  Number(frete) || 0,
      data_entrega: dataEntrega,
      hora_entrega: horaEntrega,
    };
    if (vendedorId) {
      const vend = vendedores.find(v => String(v.id) === vendedorId);
      body.codvend      = Number(vendedorId);
      body.vend_filial  = vend?.filial ?? 1;
      body.profissional = vend?.nome ?? '';
    }
    const r = await atualizarTeleEntrega(body);
    setSalvando(false);
    if (r.CodStatus !== 1) { setErro(r.DescricaoStatus); return; }
    if (depoisImprimir) handlePrint();
    router.push('/tele-entregas');
  }

  // ---------- confirmar entrega ----------

  async function handleConfirmar() {
    if (!confirm('Confirmar entrega realizada?')) return;
    setSalvando(true);
    const r = await confirmarTeleEntrega(detalhe.id);
    setSalvando(false);
    if (r.CodStatus === 1) router.refresh();
    else setErro(r.DescricaoStatus);
  }

  // ---------- cancelar ----------

  async function handleCancelar() {
    if (!justificativa.trim()) { setErro('Informe a justificativa'); return; }
    setSalvando(true);
    const r = await cancelarTeleEntrega(detalhe.id, justificativa);
    setSalvando(false);
    if (r.CodStatus === 1) { setShowCancel(false); router.refresh(); }
    else setErro(r.DescricaoStatus);
  }

  // ---------- imprimir ----------
  function handlePrint() {
    const html = gerarComandaTeleEntrega({
      id:           detalhe.id,
      cliente:      detalhe.cliente,
      endereco:     endereco,
      nro_endereco: nroEndereco,
      bairro:       bairro,
      cep:          cep,
      data:         detalhe.data,
      hora:         detalhe.hora,
      data_entrega: dataEntrega,
      hora_entrega: horaEntrega,
      animal:       detalhe.animal,
      profissional: detalhe.profissional,
      formapgto:    formapgto,
      condpgto:     condpgto,
      dados:        obs,
      valor_frete:  Number(frete) || 0,
      desconto:     detalhe.desconto || 0,
      itens:        itens.map(i => ({ produto: i.produto, qtd: i.qtd, valor: i.valor, cod_pro: i.cod_pro })),
      empresa,
    });
    printWindow(html);
  }

  // ---------- totais ----------
  const totalProdutos = itens.reduce((s, i) => s + (i.qtd * i.valor), 0);
  const freteVal = Number(frete) || 0;
  const totalFinal = totalProdutos + freteVal - (detalhe.desconto || 0);

  // ---------- render ----------

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">

      {/* cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/tele-entregas">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Tele-entrega #{detalhe.id}
          </h1>
          <p className="text-sm text-muted-foreground">{detalhe.cliente}</p>
        </div>
        <span className={cn('text-sm px-3 py-1 rounded-full font-medium', STATUS_CLS[detalhe.status] ?? 'bg-muted text-muted-foreground')}>
          {STATUS_LABEL[detalhe.status] ?? detalhe.status}
        </span>
        <Button variant="outline" size="sm" onClick={() => setShowHistorico(true)} className="gap-1.5">
          <History className="h-4 w-4" /> Histórico
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>

      {/* alertas */}
      {erro    && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{erro}</p>}
      {sucesso && <p className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">{sucesso}</p>}

      {/* ── Info geral ── */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {canEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* cliente */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Cliente</label>
              {alterandoCliente ? (
                <div className="relative">
                  <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-9">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      onBlur={() => { if (!clienteOpcoes.length) { setAlterandoCliente(false); setClienteQuery(''); } }}
                      placeholder="Buscar cliente..."
                      className="flex-1 min-w-0 text-sm bg-transparent outline-none"
                    />
                    <button onClick={() => { setAlterandoCliente(false); setClienteQuery(''); setClienteOpcoes([]); setClienteAberto(false); }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  {clienteAberto && clienteOpcoes.length > 0 && (
                    <ul className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto text-sm">
                      {clienteOpcoes.map(c => (
                        <li key={c.id} onMouseDown={() => selecionarCliente(c)} className="px-3 py-2 cursor-pointer hover:bg-muted">
                          <p className="font-medium">{c.nome}</p>
                          <p className="text-xs text-muted-foreground">{c.telefone || c.celular}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-input px-3 h-9">
                  <span className="text-sm font-medium">{clienteNome}</span>
                  <button onClick={() => setAlterandoCliente(true)} className="text-xs text-primary hover:underline">Alterar</button>
                </div>
              )}
            </div>
            {/* data e hora pedido */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data pedido</label>
              <Input type="date" value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hora pedido</label>
              <Input type="time" value={horaPedido} onChange={(e) => setHoraPedido(e.target.value)} className="h-9 text-sm" />
            </div>
            {/* animal */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Animal</label>
              <Input value={animal} onChange={(e) => setAnimal(e.target.value)} className="h-9 text-sm" />
            </div>
            {/* vendedor */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Vendedor / Profissional</label>
              <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                <option value="">— {detalhe.profissional || 'selecione'} —</option>
                {vendedores.map(v => <option key={v.id} value={String(v.id)}>{v.nome}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Data pedido</p><p className="font-medium">{fmtData(detalhe.data)}</p></div>
            <div><p className="text-xs text-muted-foreground">Hora</p><p className="font-medium">{detalhe.hora?.slice(0,5) || '—'}</p></div>
            <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Animal</p><p className="font-medium">{detalhe.animal || '—'}</p></div>
            <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Profissional</p><p className="font-medium">{detalhe.profissional || '—'}</p></div>
          </div>
        )}
      </div>

      {/* ── Endereço de entrega ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
        </h2>
        {canEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Endereço</label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} className="h-9 text-sm" />
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
              <Input value={cep} onChange={(e) => setCep(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        ) : (
          <p className="text-sm">{[endereco, nroEndereco, bairro, cep].filter(Boolean).join(', ') || '—'}</p>
        )}
      </section>

      {/* ── Entrega ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm">Dados da Entrega</h2>
        {canEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Data entrega</label>
              <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hora entrega</label>
              <Input type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Forma pgto</label>
              <Input value={formapgto} onChange={(e) => setFormapgto(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Condição pgto</label>
              <Input value={condpgto} onChange={(e) => setCondpgto(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Frete (R$)</label>
              <Input type="number" min="0" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} className="h-9 text-sm text-right font-mono" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={obs} onChange={(e) => setObs(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Data entrega</p><p>{fmtData(detalhe.data_entrega)}</p></div>
            <div><p className="text-xs text-muted-foreground">Hora</p><p>{detalhe.hora_entrega?.slice(0,5) || '—'}</p></div>
            <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Forma pgto</p><p>{detalhe.formapgto || '—'}</p></div>
            <div className="col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground">Condição pgto</p><p>{detalhe.condpgto || '—'}</p></div>
          </div>
        )}
      </section>

      {/* ── Produtos ── */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium text-sm flex items-center gap-1.5">
          <Package className="h-4 w-4 text-primary" /> Produtos
        </h2>

        {/* busca produto (só se aberta) */}
        {canEdit && (
          <div className="relative">
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-9">
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
                      abrirDlgProduto(prodOpcoes[prodFocusIdx >= 0 ? prodFocusIdx : 0]);
                    }
                  } else if (e.key === 'Escape') {
                    setProdAberto(false);
                    setProdFocusIdx(-1);
                  }
                }}
                placeholder="Adicionar produto..."
                className="flex-1 min-w-0 text-sm bg-transparent outline-none"
              />
              {prodQuery && <button onClick={() => { setProdQuery(''); setProdOpcoes([]); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            {prodAberto && prodOpcoes.length > 0 && (
              <ul ref={listaProdRef} className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg max-h-56 overflow-y-auto text-sm">
                {prodOpcoes.map((p, i) => (
                  <li
                    key={p.id_dadospro}
                    onMouseDown={(e) => { e.preventDefault(); abrirDlgProduto(p); }}
                    className={cn('px-3 py-2 cursor-pointer', i === prodFocusIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  >
                    <span className="font-medium">{p.descricao}</span>
                    <span className={cn('text-xs ml-2', i === prodFocusIdx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{p.cod_pro}</span>
                    <span className={cn('text-xs ml-2', p.estoque <= 0 ? 'text-red-500' : i === prodFocusIdx ? 'text-primary-foreground/70' : 'text-muted-foreground')}>Est: {p.estoque}</span>
                    <span className={cn('text-xs font-mono ml-2', i === prodFocusIdx ? 'text-primary-foreground' : 'text-primary')}>R$ {fmtMoeda(p.preco)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* lista */}
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum produto adicionado.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-1.5 w-20">Código</th>
                  <th className="text-left px-3 py-1.5">Produto</th>
                  <th className="text-center px-2 py-1.5 w-14">Qtd</th>
                  <th className="text-right px-2 py-1.5 w-20">Valor</th>
                  <th className="text-right px-2 py-1.5 w-20">Total</th>
                  {canEdit && <th className="w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id_item} className="border-t">
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{item.cod_pro}</td>
                    <td className="px-3 py-1.5">
                      <p className="font-medium">{item.produto}</p>
                      <p className="text-xs text-muted-foreground">{item.unidade}</p>
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono">{item.qtd}</td>
                    <td className="px-2 py-1.5 text-right font-mono">R$ {fmtMoeda(item.valor)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-primary">
                      R$ {fmtMoeda(item.qtd * item.valor)}
                    </td>
                    {canEdit && (
                      <td className="px-1">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => abrirEdicaoItem(item)} className="text-muted-foreground hover:text-primary" title="Editar qtd/valor">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleRemoverItem(item.id_item)} className="text-muted-foreground hover:text-destructive" title="Remover">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* totais */}
        <div className="space-y-1 text-sm pt-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span className="font-mono">R$ {fmtMoeda(totalProdutos)}</span>
          </div>
          {(detalhe.desconto || 0) > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Desconto</span><span className="font-mono">-R$ {fmtMoeda(detalhe.desconto)}</span>
            </div>
          )}
          {freteVal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Frete</span><span className="font-mono">R$ {fmtMoeda(freteVal)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base border-t pt-1.5">
            <span>Total</span><span className="font-mono text-primary">R$ {fmtMoeda(totalFinal)}</span>
          </div>
        </div>
      </section>

      {/* ── Ações ── */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => { setShowCancel(true); setJustificativa(''); setErro(''); }} className="text-red-500 border-red-200 hover:bg-red-50 justify-center">
            <XCircle className="h-4 w-4 mr-1.5" /> Cancelar Entrega
          </Button>
          <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 justify-center" onClick={handleConfirmar} disabled={salvando}>
            <CheckCircle className="h-4 w-4 mr-1.5" /> Confirmar Entregue
          </Button>
          <Button variant="outline" onClick={() => salvarEdicao(true)} disabled={salvando} className="gap-1.5 justify-center">
            <Printer className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Gravar e Imprimir'}
          </Button>
          <Button onClick={() => salvarEdicao(false)} disabled={salvando} className="gap-1.5 justify-center">
            <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Gravar'}
          </Button>
        </div>
      )}

      {/* ── Justificativa cancelamento ── */}
      {detalhe.justificativa && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-medium text-red-700">Motivo do cancelamento</p>
          <p className="text-red-600 mt-1">{detalhe.justificativa}</p>
        </div>
      )}

      {/* ── Modal cancelar ── */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold">Cancelar tele-entrega #{detalhe.id}</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium">Justificativa *</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2 text-sm resize-none h-20 outline-none focus:ring-2 ring-primary"
                placeholder="Motivo do cancelamento..."
                autoFocus
              />
              {erro && <p className="text-xs text-destructive">{erro}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancel(false)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={salvando}>
                {salvando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Diálogo de produto ── */}
      {prodDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl p-5 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-sm">{prodDlg.descricao}</h2>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Qtd</label>
                <Input type="number" min="1" step="0.001" value={dlgQtd} onChange={(e) => setDlgQtd(e.target.value)} autoFocus className="h-10 text-sm text-right font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valor (R$)</label>
                <Input type="number" min="0" step="0.01" value={dlgValor} onChange={(e) => setDlgValor(e.target.value)} className="h-10 text-sm text-right font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Desc. (%)</label>
                <Input type="number" min="0" max="100" value={dlgDesc} onChange={(e) => setDlgDesc(e.target.value)} className="h-10 text-sm text-right font-mono" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estoque: <span className={prodDlg.estoque <= 0 ? 'text-red-500 font-semibold' : ''}>{prodDlg.estoque}</span>
              {' '}· Tabela: R$ {fmtMoeda(prodDlg.preco)}
            </p>
            {dlgRegra && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Bell className="h-3.5 w-3.5" />
                  Lembrete de recompra — escolha o prazo:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: `Mínimo (${dlgRegra.dias_min} dias)`, val: dlgRegra.dias_min },
                    { label: `Máximo (${dlgRegra.dias_max} dias)`, val: dlgRegra.dias_max },
                    { label: 'Não criar lembrete', val: 0 },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setDlgDias(opt.val)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                        dlgDias === opt.val
                          ? opt.val === 0 ? 'border-gray-400 bg-gray-400 text-white' : 'border-amber-500 bg-amber-500 text-white'
                          : opt.val === 0 ? 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                          : 'border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {dlgErro && <p className="text-xs text-destructive">{dlgErro}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setProdDlg(null)}>Cancelar</Button>
              <Button size="sm" onClick={confirmarProduto} disabled={salvando || (dlgRegra !== null && dlgDias === null)} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Diálogo editar item ── */}
      {editItemDlg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl p-5 w-full max-w-xs space-y-4">
            <h2 className="font-semibold text-sm">{editItemDlg.produto}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Quantidade</label>
                <Input
                  type="number" min="0.001" step="0.001"
                  value={editQtd}
                  onChange={(e) => setEditQtd(e.target.value)}
                  autoFocus
                  className="h-10 text-sm text-right font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valor (R$)</label>
                <Input
                  type="number" min="0.01" step="0.01"
                  value={editValor}
                  onChange={(e) => setEditValor(e.target.value)}
                  className="h-10 text-sm text-right font-mono"
                />
              </div>
            </div>
            {editErro && <p className="text-xs text-destructive">{editErro}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditItemDlg(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleEditarItem} disabled={salvando} className="gap-1">
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal histórico do cliente ── */}
      {showHistorico && (
        <HistoricoClienteModal
          clienteId={detalhe.cliente_id}
          clienteNome={detalhe.cliente}
          onClose={() => setShowHistorico(false)}
        />
      )}
    </div>
  );
}
