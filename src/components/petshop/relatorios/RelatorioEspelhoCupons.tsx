'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Vendedor, Cliente } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/agenda/nova/actions';
import { buscarItensCupom, buscarPagamentosCupom, type ItemCupomEspelho, type PagamentoCupom } from '@/app/(petshop)/relatorios/espelho-cupons/actions';
import CupomPreviewModal from '@/components/petshop/relatorios/CupomPreviewModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Receipt, ChevronDown, ChevronUp, Search, X, Loader2, Eye, Printer, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportarCsv } from '@/lib/exportarCsv';

export interface CupomEspelho {
  numero_cupom:  number;
  digito:        number;
  caixa:         string;
  data:          string;
  hora:          string;
  filial:        number;
  valor_total:   number;
  desconto:      number;
  acrescimo:     number;
  valor_liquido: number;
  cancelado:     boolean;
  vendedor_id:   number;
  vendedor:      string;
  cliente_id:    number;
  cliente_filial: number;
  cliente:       string;
  modelo:        string;
  chave_nfce:    string;
}

interface Filtros {
  dataDe: string; dataAte: string;
  numeroCupom: string; clienteId: string; clienteNome: string;
  vendedorId: string; modelo: string; caixa: string; situacao: string;
}

interface Props {
  cupons:     CupomEspelho[];
  vendedores: Vendedor[];
  filial:     number;
  filtros:    Filtros;
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}
function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
/** Converte DD/MM/YYYY (formato que o backend retorna em CupomEspelho.data) para YYYY-MM-DD (formato que os filtros de itens/pagamentos esperam) */
function paraIso(s: string) {
  if (!s) return s;
  if (!s.includes('/')) return s;
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
}

export default function RelatorioEspelhoCupons({ cupons, vendedores, filial, filtros }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [dataDe, setDataDe]   = useState(filtros.dataDe);
  const [dataAte, setDataAte] = useState(filtros.dataAte);
  const [numeroCupom, setNumeroCupom] = useState(filtros.numeroCupom);
  const [vendedorId, setVendedorId]   = useState(filtros.vendedorId || 'todos');
  const [modelo, setModelo]           = useState(filtros.modelo || 'todos');
  const [caixa, setCaixa]             = useState(filtros.caixa);
  const [situacao, setSituacao]       = useState(filtros.situacao);

  // ── Cliente: busca com lupa ──
  const [clienteQ, setClienteQ]     = useState(filtros.clienteNome);
  const [clienteId, setClienteId]   = useState(filtros.clienteId);
  const [clienteOpts, setClienteOpts] = useState<Cliente[]>([]);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (clienteId) return;
    if (debRef.current) clearTimeout(debRef.current);
    if (clienteQ.trim().length < 3) { setClienteOpts([]); return; }
    debRef.current = setTimeout(async () => {
      setClienteOpts(await buscarClientes(clienteQ.trim()));
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [clienteQ, clienteId]);

  // ── Drill-down de itens por cupom ──
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [itensPorCupom, setItensPorCupom] = useState<Record<number, ItemCupomEspelho[]>>({});
  const [carregandoItens, setCarregandoItens] = useState<Set<number>>(new Set());

  // ── Formas de pagamento por cupom (usado no recibo e no sintético) ──
  const [pagamentosPorCupom, setPagamentosPorCupom] = useState<Record<number, PagamentoCupom[]>>({});
  const [carregandoPagamentos, setCarregandoPagamentos] = useState<Set<number>>(new Set());

  async function carregarPagamentos(c: CupomEspelho) {
    if (pagamentosPorCupom[c.numero_cupom]) return;
    setCarregandoPagamentos((prev) => new Set(prev).add(c.numero_cupom));
    const pagamentos = await buscarPagamentosCupom(c.numero_cupom, c.filial || filial, c.caixa, c.digito);
    setPagamentosPorCupom((prev) => ({ ...prev, [c.numero_cupom]: pagamentos }));
    setCarregandoPagamentos((prev) => { const n = new Set(prev); n.delete(c.numero_cupom); return n; });
  }

  async function toggleAberto(c: CupomEspelho) {
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(c.numero_cupom)) novo.delete(c.numero_cupom); else novo.add(c.numero_cupom);
      return novo;
    });
    if (!itensPorCupom[c.numero_cupom]) {
      setCarregandoItens((prev) => new Set(prev).add(c.numero_cupom));
      const itens = await buscarItensCupom(c.numero_cupom, c.filial || filial, paraIso(c.data));
      setItensPorCupom((prev) => ({ ...prev, [c.numero_cupom]: itens }));
      setCarregandoItens((prev) => { const n = new Set(prev); n.delete(c.numero_cupom); return n; });
    }
    carregarPagamentos(c);
  }

  // ── Recibo (visualizar cupom individual, como no Retaguarda) ──
  const [cupomRecibo, setCupomRecibo] = useState<CupomEspelho | null>(null);

  async function verCupom(c: CupomEspelho) {
    setCupomRecibo(c);
    if (!itensPorCupom[c.numero_cupom]) {
      setCarregandoItens((prev) => new Set(prev).add(c.numero_cupom));
      const itens = await buscarItensCupom(c.numero_cupom, c.filial || filial, paraIso(c.data));
      setItensPorCupom((prev) => ({ ...prev, [c.numero_cupom]: itens }));
      setCarregandoItens((prev) => { const n = new Set(prev); n.delete(c.numero_cupom); return n; });
    }
    carregarPagamentos(c);
  }

  // ── Modo de exibição: Analítico (item a item) ou Sintético (totais + pagamentos) ──
  const [modo, setModo] = useState<'analitico' | 'sintetico'>('analitico');

  // ── Data/hora de impressão — só definida no cliente, evita mismatch de SSR ──
  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  useEffect(() => {
    if (modo !== 'sintetico') return;
    cupons.forEach((c) => { if (!pagamentosPorCupom[c.numero_cupom]) carregarPagamentos(c); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, cupons]);

  function pesquisar() {
    const sp = new URLSearchParams();
    sp.set('data_de', dataDe);
    sp.set('data_ate', dataAte);
    if (numeroCupom)          sp.set('numero_cupom', numeroCupom);
    if (clienteId)            sp.set('cliente_id', clienteId);
    if (clienteQ)             sp.set('cliente_nome', clienteQ);
    if (vendedorId !== 'todos') sp.set('vendedor_id', vendedorId);
    if (modelo !== 'todos')   sp.set('modelo', modelo);
    if (caixa)                sp.set('caixa', caixa);
    sp.set('situacao', situacao);
    startTransition(() => router.push(`/relatorios/espelho-cupons?${sp.toString()}`));
  }

  const totalGeral = useMemo(() => cupons.reduce((s, c) => s + c.valor_liquido, 0), [cupons]);

  function exportar() {
    exportarCsv(
      `espelho_cupons_${dataDe}_a_${dataAte}`,
      [
        { titulo: 'Cupom',    valor: (c) => c.numero_cupom },
        { titulo: 'Caixa',    valor: (c) => c.caixa },
        { titulo: 'Data',     valor: (c) => fmtData(c.data) },
        { titulo: 'Hora',     valor: (c) => c.hora?.slice(0, 5) || '' },
        { titulo: 'Modelo',   valor: (c) => c.modelo === '65' ? 'NFC-e' : c.modelo === '55' ? 'NF-e' : c.modelo },
        { titulo: 'Cliente',  valor: (c) => c.cliente || '' },
        { titulo: 'Vendedor', valor: (c) => c.vendedor },
        { titulo: 'Bruto',    valor: (c) => c.valor_total.toFixed(2).replace('.', ',') },
        { titulo: 'Desconto', valor: (c) => c.desconto.toFixed(2).replace('.', ',') },
        { titulo: 'Acréscimo',valor: (c) => c.acrescimo.toFixed(2).replace('.', ',') },
        { titulo: 'Líquido',  valor: (c) => c.valor_liquido.toFixed(2).replace('.', ',') },
        { titulo: 'Situação', valor: (c) => c.cancelado ? 'Cancelado' : 'Emitido' },
      ],
      cupons,
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Espelho de Cupons
        </h1>
      </div>

      {/* Cabeçalho de impressão — só aparece na hora de imprimir */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Espelho de Cupons — {modo === 'sintetico' ? 'Sintético' : 'Analítico'}
        </h1>
        <p className="text-xs">
          Período: {fmtData(dataDe)} a {fmtData(dataAte)}
          {caixa && ` · Caixa: ${caixa}`}
          {numeroCupom && ` · Cupom: ${numeroCupom}`}
          {vendedorId !== 'todos' && ` · Vendedor: ${vendedores.find((v) => String(v.id) === vendedorId)?.nome ?? vendedorId}`}
          {' · '}Situação: {situacao === 'cancelados' ? 'Cancelados' : situacao === 'todos' ? 'Todos' : 'Não cancelados'}
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-card p-4 space-y-3 print:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entre datas</label>
            <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nº do cupom</label>
            <Input value={numeroCupom} onChange={(e) => setNumeroCupom(e.target.value)} className="h-9 text-sm" placeholder="Ex: 283670" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Caixa</label>
            <Input value={caixa} onChange={(e) => setCaixa(e.target.value)} className="h-9 text-sm" placeholder="Ex: 101" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Modelo</label>
            <Select value={modelo} onValueChange={(v) => setModelo(v ?? 'todos')}
              items={[
                { value: 'todos', label: 'Todos' },
                { value: '65', label: 'NFC-e (65)' },
                { value: '55', label: 'NF-e (55)' },
              ]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="65">NFC-e (65)</SelectItem>
                <SelectItem value="55">NF-e (55)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2 relative">
            <label className="text-xs text-muted-foreground">Cliente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={clienteQ}
                onChange={(e) => { setClienteQ(e.target.value); setClienteId(''); }}
                placeholder="Buscar cliente..."
                className="h-9 text-sm pl-8 pr-7"
              />
              {(clienteQ || clienteId) && (
                <button onClick={() => { setClienteQ(''); setClienteId(''); setClienteOpts([]); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {clienteOpts.length > 0 && !clienteId && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {clienteOpts.map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => { setClienteId(String(c.id)); setClienteQ(c.nome); setClienteOpts([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0">
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vendedor</label>
            <Select value={vendedorId} onValueChange={(v) => setVendedorId(v ?? 'todos')}
              items={[{ value: 'todos', label: 'Todos' }, ...vendedores.map((v) => ({ value: String(v.id), label: v.nome }))]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {vendedores.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Situação</label>
            <Select value={situacao} onValueChange={(v) => setSituacao(v ?? 'nao_cancelados')}
              items={[
                { value: 'nao_cancelados', label: 'Não cancelados' },
                { value: 'cancelados', label: 'Cancelados' },
                { value: 'todos', label: 'Todos' },
              ]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_cancelados">Não cancelados</SelectItem>
                <SelectItem value="cancelados">Cancelados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={pesquisar} size="sm">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Pesquisar
          </Button>
        </div>
      </div>

      {/* Totais + modo de exibição */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cupons.length} cupom{cupons.length === 1 ? '' : 'ns'} · Total: <strong className="text-primary">{fmtMoeda(totalGeral)}</strong>
        </p>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button type="button" onClick={() => setModo('analitico')}
              className={cn('px-3 py-1.5 font-medium', modo === 'analitico' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50')}>
              Analítico
            </button>
            <button type="button" onClick={() => setModo('sintetico')}
              className={cn('px-3 py-1.5 font-medium border-l', modo === 'sintetico' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/50')}>
              Sintético
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportar}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Resultado */}
      {cupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <Receipt className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum cupom encontrado para os filtros informados.</p>
        </div>
      ) : modo === 'sintetico' ? (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cupom</TableHead>
                <TableHead>Caixa</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">Acrésc.</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
                <TableHead>Pagamentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cupons.map((c) => {
                const pagamentos = pagamentosPorCupom[c.numero_cupom] ?? [];
                const carregandoPg = carregandoPagamentos.has(c.numero_cupom);
                return (
                  <TableRow key={c.numero_cupom} className={cn(c.cancelado && 'opacity-50')}>
                    <TableCell className="font-mono text-xs">#{c.numero_cupom}</TableCell>
                    <TableCell className="text-xs">{c.caixa}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmtData(c.data)} {c.hora?.slice(0, 5)}</TableCell>
                    <TableCell className="text-xs">{c.vendedor}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoeda(c.valor_total)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoeda(c.desconto)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoeda(c.acrescimo)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">{fmtMoeda(c.valor_liquido)}</TableCell>
                    <TableCell className="text-xs">
                      {carregandoPg ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : pagamentos.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        pagamentos.map((p, i) => (
                          <span key={i} className="mr-2 whitespace-nowrap">
                            {p.descricao}: <strong>{fmtMoeda(p.valor)}</strong>
                          </span>
                        ))
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-2">
          {cupons.map((c) => {
            const aberto = abertos.has(c.numero_cupom);
            const carregando = carregandoItens.has(c.numero_cupom);
            const itens = itensPorCupom[c.numero_cupom] ?? [];
            const pagamentos = pagamentosPorCupom[c.numero_cupom] ?? [];
            const carregandoPg = carregandoPagamentos.has(c.numero_cupom);
            return (
              <div key={c.numero_cupom} className={cn('rounded-lg border bg-card overflow-hidden', c.cancelado && 'opacity-60')}>
                <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-sm">
                  <button type="button" onClick={() => toggleAberto(c)} className="flex flex-1 items-center gap-3 text-left min-w-0">
                    {aberto ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">#{c.numero_cupom}</span>
                    <span className="text-xs text-muted-foreground w-12 shrink-0">Cx {c.caixa}</span>
                    <span className="w-28 shrink-0 text-xs">{fmtData(c.data)} {c.hora?.slice(0, 5)}</span>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0',
                      c.cancelado ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200',
                    )}>
                      {c.cancelado ? 'Cancelado' : 'Emitido'}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{c.modelo === '65' ? 'NFC-e' : c.modelo === '55' ? 'NF-e' : c.modelo}</span>
                    <span className="flex-1 min-w-0 truncate font-medium">{c.cliente || '—'}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{c.vendedor}</span>
                    <span className="font-semibold text-primary shrink-0 w-24 text-right">{fmtMoeda(c.valor_liquido)}</span>
                  </button>
                  <button type="button" onClick={() => verCupom(c)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground print:hidden" title="Visualizar cupom">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                {aberto && (
                  <div className="border-t overflow-x-auto">
                    {carregando ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />Carregando itens...
                      </p>
                    ) : itens.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-muted-foreground">Nenhum item encontrado.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="w-20 text-right">Qtd</TableHead>
                            <TableHead className="w-28 text-right">Preço</TableHead>
                            <TableHead className="w-28 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itens.map((it, i) => (
                            <TableRow key={i} className={cn(it.cancelado && 'opacity-50')}>
                              <TableCell className="text-sm">
                                <span className="font-medium">{it.descricao}</span>
                                <span className="ml-2 text-xs text-muted-foreground">{it.cod_pro}</span>
                                {it.cancelado && <span className="ml-2 text-xs text-red-600">(cancelado)</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm">{it.qtd}</TableCell>
                              <TableCell className="text-right text-sm">{fmtMoeda(it.preco)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{fmtMoeda(it.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <div className="px-4 py-2 border-t bg-muted/20 text-xs flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground mr-1">Pagamentos:</span>
                      {carregandoPg ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : pagamentos.length === 0 ? (
                        <span className="text-muted-foreground">nenhuma forma registrada</span>
                      ) : (
                        pagamentos.map((p, i) => (
                          <span key={i} className="mr-2">{p.descricao}: <strong>{fmtMoeda(p.valor)}</strong></span>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recibo — visualização do cupom individual (equivalente ao preview do Retaguarda) */}
      {cupomRecibo && (
        <CupomPreviewModal
          cupom={cupomRecibo}
          itens={itensPorCupom[cupomRecibo.numero_cupom] ?? []}
          pagamentos={pagamentosPorCupom[cupomRecibo.numero_cupom] ?? []}
          carregandoItens={carregandoItens.has(cupomRecibo.numero_cupom)}
          carregandoPagamentos={carregandoPagamentos.has(cupomRecibo.numero_cupom)}
          onClose={() => setCupomRecibo(null)}
        />
      )}
    </div>
  );
}
