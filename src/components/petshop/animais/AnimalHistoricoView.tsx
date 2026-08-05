'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Animal, AgendaItem, AgendaDetalhe, AgendaItemServico,
  AnimalHistoricoItem, ConsultaAnimalItem, ConsultaDetalhe,
  Profissional, Servico,
} from '@/types/petshop';
import type { Estimativa } from '@/app/(petshop)/estimativas/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, PawPrint, Calendar, ShoppingBag, Stethoscope,
  Search, X, ChevronUp, ChevronDown, Eye, Loader2, ExternalLink, BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import IniciarConsultaDialog from './IniciarConsultaDialog';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  animal:        Animal;
  agendas:       AgendaItem[];
  compras:       AnimalHistoricoItem[];
  consultas:     ConsultaAnimalItem[];
  estimativas:   Estimativa[];
  profissionais: Profissional[];
  servicos:      Servico[];
  filial:        number;
}

const ESTIMATIVA_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Pendente',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  1: { label: 'Enviada',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
  3: { label: 'Atendida',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtData(s: string) {
  if (!s) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return d.toLocaleDateString('pt-BR');
}

function fmtDataHora(s: string) {
  if (!s) return '—';
  // "DD/MM/YYYY HH:MM:SS"
  if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 16);
  return d.toLocaleString('pt-BR').slice(0, 16);
}

function fmtHora(s: string) {
  if (!s) return '';
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return '';
}

function fmtMoeda(s: string | number) {
  const v = parseFloat(String(s).replace(',', '.'));
  if (isNaN(v)) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Mapeamento de SITUACAO conforme legendas do sistema legado
const SITUACAO_MAP: Record<string, { label: string; cls: string }> = {
  'ABERTA':       { label: 'Aberta',        cls: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  'APLICADA':     { label: 'Aplicada',      cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  'ATRASADA':     { label: 'Atrasada',      cls: 'bg-red-100 text-red-700 border-red-200' },
  'CANCELADA':    { label: 'Cancelada',     cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  'CONFIRMACAO':  { label: 'Confirmação',   cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'FINALIZADA':   { label: 'Finalizada',    cls: 'bg-pink-100 text-pink-700 border-pink-200' },
  'RECEBIDA':     { label: 'Recebida',      cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  'RECONSULTA':   { label: 'Reconsulta',    cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  'VISUALIZADA':  { label: 'Visualizada',   cls: 'bg-gray-200 text-gray-700 border-gray-300' },
  'ENTREGANDO':   { label: 'Entregando',    cls: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  'ENCERRADA':    { label: 'Encerrada',     cls: 'bg-green-100 text-green-700 border-green-200' },
};

function BadgeStatus({ status, situacao }: { status: number; situacao?: string }) {
  const key = (situacao ?? '').toUpperCase().trim();
  const base = SITUACAO_MAP[key];
  // "Finalizada *NF*" quando situacao=FINALIZADA e status fiscal=3 (NF emitida)
  const label = base
    ? (key === 'FINALIZADA' && status === 3 ? 'Finalizada *NF*' : base.label)
    : (situacao || `#${status}`);
  const cls = base?.cls ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', cls)}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 text-sm py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="font-medium flex-1 break-words">{value || '—'}</span>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabId = 'agendas' | 'compras' | 'consultas' | 'estimativas';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'agendas',     label: 'Agendamentos',  icon: <Calendar    className="h-4 w-4" /> },
  { id: 'compras',     label: 'Compras / NF',  icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'consultas',   label: 'Consultas',     icon: <Stethoscope className="h-4 w-4" /> },
  { id: 'estimativas', label: 'Estimativas',   icon: <BellRing    className="h-4 w-4" /> },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function AnimalHistoricoView({
  animal, agendas, compras, consultas, estimativas, profissionais, servicos, filial,
}: Props) {
  const router = useRouter();

  // ── Filtros / ordenação ──
  const [tab,          setTab]          = useState<TabId>('agendas');
  const [busca,        setBusca]        = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [sortCol,      setSortCol]      = useState<string>('data');
  const [sortAsc,      setSortAsc]      = useState(false);

  // ── Seleção de estimativas → Iniciar Consulta ──
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [iniciarConsultaAberto, setIniciarConsultaAberto] = useState(false);
  function toggleSelecionada(id: number) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ── Modal agenda ──
  const [agendaModal,    setAgendaModal]    = useState<AgendaDetalhe | null>(null);
  const [agendaItens,    setAgendaItens]    = useState<AgendaItemServico[]>([]);
  const [loadingAgenda,  setLoadingAgenda]  = useState(false);
  const [agendaModalId,  setAgendaModalId]  = useState<number | null>(null);

  // ── Modal consulta ──
  const [consultaModal,        setConsultaModal]        = useState<ConsultaDetalhe | null>(null);
  const [consultaModalId,      setConsultaModalId]      = useState<number | null>(null);
  const [loadingConsulta,      setLoadingConsulta]      = useState(false);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc((v) => !v);
    else { setSortCol(col); setSortAsc(false); }
  }

  // ── Abre modal de agenda com fetch de detalhe ──
  const abrirAgenda = useCallback(async (id: number) => {
    if (loadingAgenda) return;
    setAgendaModalId(id);
    setLoadingAgenda(true);
    setAgendaModal(null);
    setAgendaItens([]);
    try {
      const [det, itens] = await Promise.all([
        fetch(`/api/petshop/agenda/detalhe?id=${id}&filial=${filial}`).then((r) => r.json()),
        fetch(`/api/petshop/agenda/itens?id=${id}&filial=${filial}`).then((r) => r.json()).catch(() => ({ dados: [] })),
      ]);
      // CodStatus < 0 = não encontrado no Delphi
      if (typeof det?.CodStatus === 'number' && det.CodStatus < 0) {
        setAgendaModal(null);
      } else {
        setAgendaModal(det as AgendaDetalhe);
        setAgendaItens((itens?.dados ?? []) as AgendaItemServico[]);
      }
    } catch {
      setAgendaModal(null);
    } finally {
      setLoadingAgenda(false);
    }
  }, [loadingAgenda, filial]);

  function fecharAgenda() {
    setAgendaModal(null);
    setAgendaModalId(null);
    setAgendaItens([]);
  }

  const abrirConsulta = useCallback(async (c: ConsultaAnimalItem) => {
    if (loadingConsulta) return;
    setConsultaModalId(c.id);
    setLoadingConsulta(true);
    setConsultaModal(null);
    try {
      const det = await fetch(`/api/petshop/consultas/detalhe?id=${c.id}&filial=${filial}`).then((r) => r.json());
      if (typeof det?.CodStatus === 'number' && det.CodStatus < 0) {
        setConsultaModal({ ...c } as ConsultaDetalhe);
      } else {
        setConsultaModal(det as ConsultaDetalhe);
      }
    } catch {
      setConsultaModal({ ...c } as ConsultaDetalhe);
    } finally {
      setLoadingConsulta(false);
    }
  }, [loadingConsulta, filial]);

  function fecharConsulta() {
    setConsultaModal(null);
    setConsultaModalId(null);
  }

  const q = busca.toLowerCase();

  // ── Filtra + ordena ──
  function ordenar<T>(arr: T[], valFn: (item: T) => string | number) {
    return [...arr].sort((a, b) => {
      const cmp = String(valFn(a)).localeCompare(String(valFn(b)), 'pt-BR', { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
  }

  const agendasFilt = ordenar(
    agendas.filter((a) => {
      if (filtroStatus !== 'todos' && String(a.status) !== filtroStatus) return false;
      if (!q) return true;
      return a.servico?.toLowerCase().includes(q) || a.profissional?.toLowerCase().includes(q) || a.data?.toLowerCase().includes(q);
    }),
    (a) => sortCol === 'servico' ? a.servico : sortCol === 'status' ? a.status : a.data ?? '',
  );

  const comprasFilt = ordenar(
    compras.filter((c) => !q || c.produto?.toLowerCase().includes(q) || String(c.num_nf).includes(q)),
    (c) => sortCol === 'produto' ? c.produto : c.data ?? '',
  );

  const consultasFilt = ordenar(
    consultas.filter((c) => !q || c.veterinario?.toLowerCase().includes(q) || c.motivo?.toLowerCase().includes(q) || c.data?.toLowerCase().includes(q)),
    (c) => sortCol === 'veterinario' ? c.veterinario : c.data ?? '',
  );

  const estimativasFilt = ordenar(
    estimativas.filter((e) => !q || e.produto?.toLowerCase().includes(q)),
    (e) => e.data_compra ?? '',
  );

  const contadores: Record<TabId, number> = {
    agendas:     agendasFilt.length,
    compras:     comprasFilt.length,
    consultas:   consultasFilt.length,
    estimativas: estimativasFilt.length,
  };

  return (
    <>
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <PawPrint className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-xl font-semibold truncate">
            Histórico — {animal.nome}
            {animal.apelido && animal.apelido !== animal.nome && (
              <span className="ml-1 font-normal text-muted-foreground text-base">"{animal.apelido}"</span>
            )}
          </h1>
        </div>
        <Link href={`/animais/${animal.id}`} className="ml-auto">
          <Button variant="outline" size="sm">Ver cadastro</Button>
        </Link>
      </div>

      {/* ── Info rápida ── */}
      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">Proprietário:</span>{' '}
          <Link href={`/clientes/${animal.id_cliente}`} className="text-primary hover:underline">
            {animal.nome_cliente}
          </Link>
        </span>
        {animal.especie && <span>· {animal.especie}</span>}
        {animal.raca    && <span>· {animal.raca}</span>}
        {animal.peso    && <span>· {animal.peso} kg</span>}
      </div>

      {/* ── Filtros globais ── */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar..."
            className="pl-8 h-8 text-sm"
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {tab === 'agendas' && (
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm">
            <option value="todos">Todos os status</option>
            <option value="1">Orçamento</option>
            <option value="2">Pedido</option>
            <option value="3">NF emitida</option>
            <option value="4">Cancelado</option>
          </select>
        )}
      </div>

      {/* ── Abas ── */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b bg-muted/20 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} type="button"
              onClick={() => { setTab(t.id); setSortCol('data'); setSortAsc(false); }}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.id
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}>
              {t.icon}
              {t.label}
              <span className={cn('ml-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold',
                tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                {contadores[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Aba: Agendamentos ── */}
        {tab === 'agendas' && (
          agendasFilt.length === 0
            ? <EmptyState icon={<Calendar className="h-8 w-8 opacity-30" />} msg="Nenhum agendamento encontrado." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Nº</TableHead>
                      <SortTh col="data"    label="Data / Hora"  current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <SortTh col="servico" label="Serviço"      current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <SortTh col="status" label="Situação" current={sortCol} asc={sortAsc} onSort={toggleSort} className="text-center" />
                      <TableHead className="text-center w-16">Pago</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendasFilt.map((a) => {
                      const loading = loadingAgenda && agendaModalId === a.id;
                      return (
                        <TableRow key={a.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs text-muted-foreground font-mono">{a.id}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <p className="text-sm font-medium">{fmtData(a.data)}</p>
                            {a.hora && <p className="text-xs text-muted-foreground">{fmtHora(a.hora)}</p>}
                          </TableCell>
                          <TableCell className="text-sm">{a.servico || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.profissional || '—'}</TableCell>
                          <TableCell className="text-right text-sm">{fmtMoeda(a.sub_total)}</TableCell>
                          <TableCell className="text-center"><BadgeStatus status={a.status} situacao={a.situacao} /></TableCell>
                          <TableCell className="text-center">
                            {a.pago === 'S' && (
                              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 border-green-300">
                                Pago
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-3">
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={loading}
                              onClick={() => abrirAgenda(a.id)}
                            >
                              {loading
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <><Eye className="h-3.5 w-3.5 mr-1" />Ver</>}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )
        )}

        {/* ── Aba: Compras / NF ── */}
        {tab === 'compras' && (
          comprasFilt.length === 0
            ? <EmptyState icon={<ShoppingBag className="h-8 w-8 opacity-30" />} msg="Nenhuma compra registrada." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortTh col="data"    label="Data"    current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <SortTh col="produto" label="Produto" current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <TableHead className="text-right w-20">Qtd</TableHead>
                      <TableHead className="text-right w-32">Valor Unit.</TableHead>
                      <TableHead className="text-right w-32">Preço Tab.</TableHead>
                      <TableHead className="hidden md:table-cell w-24 text-muted-foreground">NF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comprasFilt.map((c, i) => (
                      <TableRow key={i} className="hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap text-sm">{fmtData(c.data)}</TableCell>
                        <TableCell>
                          <p className="text-sm">{c.produto}</p>
                          {c.unidade && <p className="text-xs text-muted-foreground">{c.unidade}</p>}
                        </TableCell>
                        <TableCell className="text-right text-sm">{c.qtd}</TableCell>
                        <TableCell className="text-right text-sm">{fmtMoeda(c.valor_unit)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{fmtMoeda(c.preco_tab)}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{c.num_nf || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
        )}

        {/* ── Aba: Consultas ── */}
        {tab === 'consultas' && (
          consultasFilt.length === 0
            ? <EmptyState icon={<Stethoscope className="h-8 w-8 opacity-30" />} msg="Nenhuma consulta registrada." />
            : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortTh col="data"        label="Data"        current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <SortTh col="veterinario" label="Veterinário" current={sortCol} asc={sortAsc} onSort={toggleSort} />
                      <TableHead>Motivo</TableHead>
                      <TableHead className="text-right w-20">Peso</TableHead>
                      <TableHead className="text-right w-24">Temp.</TableHead>
                      <TableHead className="hidden lg:table-cell">Diagnóstico</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultasFilt.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/40 align-top">
                        <TableCell className="whitespace-nowrap text-sm">{fmtData(c.data)}</TableCell>
                        <TableCell className="text-sm">{c.veterinario || '—'}</TableCell>
                        <TableCell>
                          <p className="text-sm">{c.motivo || '—'}</p>
                          {c.obs && <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate" title={c.obs}>{c.obs}</p>}
                        </TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">{c.peso ? `${c.peso} kg` : '—'}</TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">{c.temperatura ? `${c.temperatura} °C` : '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs">
                          <p className="truncate" title={c.diagnostico}>{c.diagnostico || '—'}</p>
                          {c.prognostico && <p className="text-xs truncate" title={c.prognostico}>Prog.: {c.prognostico}</p>}
                        </TableCell>
                        <TableCell className="text-right pr-3">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            disabled={loadingConsulta && consultaModalId === c.id}
                            onClick={() => abrirConsulta(c)}>
                            {loadingConsulta && consultaModalId === c.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><Eye className="h-3.5 w-3.5 mr-1" />Ver</>}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
        )}

        {/* ── Aba: Estimativas ── */}
        {tab === 'estimativas' && (
          <div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Selecione itens abaixo pra já lançar na consulta, ou inicie sem nenhum selecionado.
              </p>
              <Button size="sm" variant="outline" onClick={() => setIniciarConsultaAberto(true)}>
                <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                Iniciar Consulta
              </Button>
            </div>
            {estimativasFilt.length === 0
              ? <EmptyState icon={<BellRing className="h-8 w-8 opacity-30" />} msg="Nenhuma estimativa registrada." />
              : (
              <div className="divide-y">
                {estimativasFilt.map((e) => {
                  const st = ESTIMATIVA_STATUS[e.status] ?? { label: String(e.status), cls: 'bg-muted text-muted-foreground' };
                  const sel = selecionadas.has(e.id);
                  const jaAtendida = e.status === 3;
                  return (
                    <label
                      key={e.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        jaAtendida ? 'cursor-default opacity-60' : 'cursor-pointer',
                        sel ? 'bg-primary/5' : !jaAtendida && 'hover:bg-muted/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        disabled={jaAtendida}
                        onChange={() => toggleSelecionada(e.id)}
                        className="h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.produto}</p>
                        <p className="text-xs text-muted-foreground">
                          Comprado em {fmtData(e.data_compra)} · previsto para {fmtData(e.data_estimada)} · qtd {e.qtd}
                        </p>
                      </div>
                      <span className={cn('shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', st.cls)}>
                        {st.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              )}
          </div>
        )}

      </div>

      {/* Barra flutuante: aparece só com itens selecionados na aba Estimativas */}
      {tab === 'estimativas' && selecionadas.size > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border bg-card shadow-lg px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {selecionadas.size} {selecionadas.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelecionadas(new Set())}>
              Limpar seleção
            </Button>
            <Button size="sm" onClick={() => setIniciarConsultaAberto(true)}>
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              Iniciar Consulta
            </Button>
          </div>
        </div>
      )}
    </div>

    {/* ════════════════════════════════════════════════════════
        Modal — Detalhe do Agendamento (somente leitura)
        ════════════════════════════════════════════════════════ */}
    {agendaModalId !== null && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) fecharAgenda(); }}>
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Agendamento #{agendaModalId}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                somente leitura
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/agenda/${agendaModalId}`} target="_blank"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </Link>
              <button type="button" onClick={fecharAgenda}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {loadingAgenda ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : agendaModal ? (
              <>
                {/* Status destaque */}
                <div className="flex items-center gap-2 flex-wrap">
                  <BadgeStatus status={agendaModal.status} situacao={agendaModal.situacao} />
                  {agendaModal.pago === 'S' && (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold bg-green-100 text-green-700 border-green-200">
                      Pago
                    </span>
                  )}
                </div>

                {/* Bloco: Datas */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Datas</h3>
                  <InfoRow label="Agendado em"  value={fmtData(agendaModal.data)} />
                  <InfoRow label="Previsão"     value={agendaModal.data_previsao ? fmtDataHora(agendaModal.data_previsao) : undefined} />
                  <InfoRow label="Entrega"      value={agendaModal.data_entrega  ? fmtDataHora(agendaModal.data_entrega)  : undefined} />
                </div>

                {/* Bloco: Serviço */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Serviço</h3>
                  <InfoRow label="Serviço"      value={agendaModal.servico} />
                  <InfoRow label="Profissional" value={agendaModal.profissional} />
                  <InfoRow label="Vendedor"     value={agendaModal.vend_nome} />
                </div>

                {/* Bloco: Animal / Cliente */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Animal / Cliente</h3>
                  <InfoRow label="Pet"      value={agendaModal.animal} />
                  <InfoRow label="Raça"     value={agendaModal.raca} />
                  <InfoRow label="Cliente"  value={agendaModal.cliente} />
                  <InfoRow label="Telefone" value={agendaModal.telefone || agendaModal.celular} />
                </div>

                {/* Bloco: Valores */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Valores</h3>
                  <InfoRow label="Valor"    value={fmtMoeda(agendaModal.valor)} />
                  <InfoRow label="Desconto" value={fmtMoeda(agendaModal.desconto)} />
                  <InfoRow label="Total"    value={fmtMoeda(agendaModal.sub_total)} />
                </div>

                {/* Checklist de serviços */}
                {(agendaModal.banho_normal || agendaModal.tosa_alta || agendaModal.tosa_baixa ||
                  agendaModal.antipulga || agendaModal.hidra || agendaModal.medic) && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Extras</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['Banho',        agendaModal.banho_normal],
                        ['Tosa Alta',    agendaModal.tosa_alta],
                        ['Tosa Baixa',   agendaModal.tosa_baixa],
                        ['Antipulga',    agendaModal.antipulga],
                        ['Hidratação',   agendaModal.hidra],
                        ['Medicação',    agendaModal.medic],
                      ].filter(([, v]) => v && v !== '0' && v !== 'N').map(([label]) => (
                        <span key={label} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itens */}
                {agendaItens.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Produtos / Serviços ({agendaItens.length})
                    </h3>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right w-16">Qtd</TableHead>
                            <TableHead className="text-right w-28">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agendaItens.map((it, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{it.produto || it.descricao}</TableCell>
                              <TableCell className="text-right text-sm">{it.qtd}</TableCell>
                              <TableCell className="text-right text-sm">{fmtMoeda(it.valor_liq)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {agendaModal.obs && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Observações</h3>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">{agendaModal.obs}</p>
                  </div>
                )}

                {/* Cancelamento */}
                {agendaModal.status === 3 && agendaModal.justificativa && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2">Cancelamento</h3>
                    <p className="text-sm text-muted-foreground bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {agendaModal.justificativa}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Não foi possível carregar os detalhes.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t flex justify-end shrink-0">
            <Button variant="outline" onClick={fecharAgenda}>Fechar</Button>
          </div>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════════════════════
        Modal — Detalhe da Consulta (somente leitura)
        ════════════════════════════════════════════════════════ */}
    {consultaModalId !== null && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) fecharConsulta(); }}>
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">
                Consulta {consultaModal ? `— ${fmtData(consultaModal.data)}` : `#${consultaModalId}`}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-1">
                somente leitura
              </span>
            </div>
            <button type="button" onClick={fecharConsulta}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {loadingConsulta ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : consultaModal ? (
              <>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Informações Gerais</h3>
                  <InfoRow label="Data"        value={fmtData(consultaModal.data)} />
                  <InfoRow label="Veterinário" value={consultaModal.veterinario} />
                  <InfoRow label="Motivo"      value={consultaModal.motivo} />
                  <InfoRow label="Peso"        value={consultaModal.peso ? `${consultaModal.peso} kg` : undefined} />
                  <InfoRow label="Temperatura" value={consultaModal.temperatura ? `${consultaModal.temperatura} °C` : undefined} />
                </div>

                {(consultaModal.diagnostico || consultaModal.diagnostico_def || consultaModal.prognostico) && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Diagnóstico</h3>
                    <InfoRow label="Diag. Provisório"  value={consultaModal.diagnostico} />
                    <InfoRow label="Diag. Definitivo"  value={consultaModal.diagnostico_def} />
                    <InfoRow label="Prognóstico"       value={consultaModal.prognostico} />
                  </div>
                )}

                {consultaModal.prescricao && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Prescrição</h3>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">{consultaModal.prescricao}</p>
                  </div>
                )}

                {consultaModal.obs_gerais && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Observações Gerais</h3>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">{consultaModal.obs_gerais}</p>
                  </div>
                )}

                {consultaModal.texto && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Texto / Anamnese</h3>
                    <p className="text-sm bg-muted/30 rounded-lg px-3 py-2 whitespace-pre-wrap">{consultaModal.texto}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Não foi possível carregar os detalhes.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t flex justify-end shrink-0">
            <Button variant="outline" onClick={fecharConsulta}>Fechar</Button>
          </div>
        </div>
      </div>
    )}

    {iniciarConsultaAberto && (
      <IniciarConsultaDialog
        animal={animal}
        filial={filial}
        estimativas={estimativas.filter((e) => selecionadas.has(e.id))}
        profissionais={profissionais}
        servicos={servicos}
        onClose={() => setIniciarConsultaAberto(false)}
      />
    )}
    </>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
      {icon}
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function SortTh({ col, label, current, asc, onSort, className }: {
  col: string; label: string; current: string; asc: boolean;
  onSort: (col: string) => void; className?: string;
}) {
  return (
    <TableHead className={cn('cursor-pointer select-none hover:bg-muted/30', className)}
      onClick={() => onSort(col)}>
      <span className="flex items-center gap-1">
        {label}
        {current === col
          ? (asc ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />)
          : <ChevronUp className="h-3 w-3 opacity-20" />}
      </span>
    </TableHead>
  );
}
