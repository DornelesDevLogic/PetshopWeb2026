'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgendaItem, Profissional, Servico, STATUS_AGENDA } from '@/types/petshop';
import { corServicoCss } from '@/lib/cores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  List, CalendarDays, Search, X, Plus, ArrowUpDown, History, Loader2, Receipt, Eye, Pencil, BellRing,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import HistoricoAnimalModal from '@/components/petshop/agenda/HistoricoAnimalModal';
import EstimativasPetModal from '@/components/petshop/shared/EstimativasPetModal';
import CupomPreviewModal from '@/components/petshop/relatorios/CupomPreviewModal';
import type { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';
import { buscarItensCupom, buscarPagamentosCupom, type ItemCupomEspelho, type PagamentoCupom } from '@/app/(petshop)/relatorios/espelho-cupons/actions';
import { buscarCupomDaAgenda } from '@/app/(petshop)/agenda/lista/actions';

/** Converte DD/MM/YYYY (formato que o backend retorna em CupomEspelho.data) para YYYY-MM-DD */
function dataParaIso(s: string) {
  if (!s || !s.includes('/')) return s;
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
}

export interface Filtros {
  dataDe:   string;
  dataAte:  string;
  prevDe:   string;   // Data previsão (data_entrega) De
  prevAte:  string;   // Data previsão (data_entrega) Até
  status:   string;
  profId:   string;
  servId:   string;
  busca:    string;
  animal:   string;
  numero:   string;
  orderBy:  string;   // 'abertura' | 'previsao'
}

interface FilialOption { id: number; nome: string; }

interface Props {
  items:         AgendaItem[];
  profissionais: Profissional[];
  servicos:      Servico[];
  filtros:       Filtros;
  filial?:       number;
  filialHome?:   number;
  filiais?:      FilialOption[];
}

function parseValor(v: string): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Normaliza a data vinda do backend para DD/MM/AAAA */
function fmtData(d: string): string {
  if (!d) return '—';
  if (d.includes('/')) return d.split(' ')[0];
  const [iso] = d.split(' ');
  const [y, m, dd] = iso.split('-');
  if (!y || !m || !dd) return d;
  return `${dd}/${m}/${y}`;
}

// Grupos de status compatíveis com os radio buttons do legado
type GrupoStatus = 'todos' | 'abertos' | 'efetivadas' | 'canceladas';

function grupoDeStatus(status: string): GrupoStatus {
  if (status === '3') return 'efetivadas';
  if (status === '4') return 'canceladas';
  if (status === '1' || status === '2') return 'abertos';
  return 'todos';
}

export default function AgendaListaView({
  items, profissionais, servicos, filtros, filial, filialHome, filiais = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filtros ficam "em rascunho" no estado local — só valem de fato quando o
  // usuário clica em "Pesquisar" (ou aperta Enter). Antes, cada mudança de
  // filtro (incluindo digitar num campo de data com período grande) disparava
  // uma busca na hora, o que ficava lento/confuso sem nenhum indicativo de
  // carregamento. Filial e "Limpar filtros" continuam imediatos, por serem
  // troca de contexto/reset, não critério de busca.
  const [dataDe,  setDataDe]  = useState(filtros.dataDe);
  const [dataAte, setDataAte] = useState(filtros.dataAte);
  const [prevDe,  setPrevDe]  = useState(filtros.prevDe);
  const [prevAte, setPrevAte] = useState(filtros.prevAte);
  const [status,  setStatus]  = useState(filtros.status || 'todos');
  const [profId,  setProfId]  = useState(filtros.profId || 'todos');
  const [servId,  setServId]  = useState(filtros.servId || 'todos');
  const [busca,   setBusca]   = useState(filtros.busca);
  const [animal,  setAnimal]  = useState(filtros.animal);
  const [numero,  setNumero]  = useState(filtros.numero);
  const [orderBy, setOrderBy] = useState(filtros.orderBy || 'abertura');
  const [historicoDe, setHistoricoDe] = useState<AgendaItem | null>(null);
  const [estimativasDe, setEstimativasDe] = useState<AgendaItem | null>(null);
  const outraFilial = !!filialHome && filial !== filialHome;

  // ── Cupom da venda (F6 do legado) ──────────────────────────────────────────
  const [buscandoCupomDe, setBuscandoCupomDe] = useState<number | null>(null);
  const [candidatosCupom, setCandidatosCupom] = useState<{ agendaId: number; lista: CupomEspelho[] } | null>(null);
  const [erroCupom, setErroCupom] = useState('');
  const [cupomAberto, setCupomAberto] = useState<CupomEspelho | null>(null);
  const [itensCupom, setItensCupom] = useState<ItemCupomEspelho[]>([]);
  const [pagamentosCupom, setPagamentosCupom] = useState<PagamentoCupom[]>([]);
  const [carregandoItensCupom, setCarregandoItensCupom] = useState(false);
  const [carregandoPagCupom, setCarregandoPagCupom] = useState(false);

  function abrirCupom(c: CupomEspelho) {
    setCandidatosCupom(null);
    setCupomAberto(c);
    setCarregandoItensCupom(true);
    buscarItensCupom(c.numero_cupom, c.filial, dataParaIso(c.data))
      .then(setItensCupom)
      .finally(() => setCarregandoItensCupom(false));
    setCarregandoPagCupom(true);
    buscarPagamentosCupom(c.numero_cupom, c.filial, c.caixa, c.digito)
      .then(setPagamentosCupom)
      .finally(() => setCarregandoPagCupom(false));
  }

  async function handleVerCupom(i: AgendaItem) {
    setErroCupom('');
    setBuscandoCupomDe(i.id);
    const candidatos = await buscarCupomDaAgenda(i.id, i.filial);
    setBuscandoCupomDe(null);
    if (candidatos.length === 0) {
      setErroCupom(`Nenhum cupom encontrado para a agenda #${i.id}.`);
      return;
    }
    if (candidatos.length === 1) { abrirCupom(candidatos[0]); return; }
    setCandidatosCupom({ agendaId: i.id, lista: candidatos });
  }

  // Re-sincroniza o rascunho quando a URL muda por fora (voltar/avançar do
  // navegador, ou um link externo apontando pra /agenda/lista com filtros).
  useEffect(() => {
    setDataDe(filtros.dataDe);   setDataAte(filtros.dataAte);
    setPrevDe(filtros.prevDe);   setPrevAte(filtros.prevAte);
    setStatus(filtros.status || 'todos');
    setProfId(filtros.profId || 'todos');
    setServId(filtros.servId || 'todos');
    setBusca(filtros.busca);     setAnimal(filtros.animal);
    setNumero(filtros.numero);   setOrderBy(filtros.orderBy || 'abertura');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtros.dataDe, filtros.dataAte, filtros.prevDe, filtros.prevAte,
    filtros.status, filtros.profId, filtros.servId,
    filtros.busca, filtros.animal, filtros.numero, filtros.orderBy,
  ]);

  function irPara(overrides: Partial<Filtros> & { filial?: number | null }) {
    const f = { dataDe, dataAte, prevDe, prevAte, status, profId, servId, busca, animal, numero, orderBy, ...overrides };
    const sp = new URLSearchParams();
    if (f.dataDe)  sp.set('data_de',  f.dataDe);
    if (f.dataAte) sp.set('data_ate', f.dataAte);
    if (f.prevDe)  sp.set('prev_de',  f.prevDe);
    if (f.prevAte) sp.set('prev_ate', f.prevAte);
    sp.set('status', f.status);
    sp.set('profissional_id', f.profId || 'todos');
    if (f.servId) sp.set('servico_id', f.servId);
    if (f.busca)  sp.set('busca', f.busca);
    if (f.animal) sp.set('animal', f.animal);
    if (f.numero) sp.set('numero', f.numero);
    if (f.orderBy && f.orderBy !== 'abertura') sp.set('order_by', f.orderBy);
    const filialAlvo = 'filial' in overrides ? overrides.filial : filial;
    if (filialAlvo && filialAlvo !== filialHome) sp.set('filial', String(filialAlvo));
    startTransition(() => router.push(`/agenda/lista?${sp.toString()}`));
  }

  function handlePesquisar(e?: React.FormEvent) {
    e?.preventDefault();
    irPara({});
  }

  function limparFiltros() {
    setPrevDe(''); setPrevAte(''); setBusca(''); setAnimal(''); setNumero('');
    setServId('todos'); setProfId('todos'); setStatus('todos');
    irPara({ prevDe: '', prevAte: '', busca: '', animal: '', numero: '', servId: '', profId: 'todos', status: 'todos' });
  }

  // ── Cores por serviço (mesma legenda da agenda) ──
  const corPorServicoId: Record<number, string> = {};
  for (const s of servicos ?? []) {
    const cor = corServicoCss(s.cor_status);
    if (cor) corPorServicoId[s.id] = cor;
  }

  // ── Totalizadores (regra do legado: abertas=1,2 · efetivadas=3 · canceladas=4) ──
  const tot = { abertas: 0, vAbertas: 0, efetivadas: 0, vEfetivadas: 0, canceladas: 0, vCanceladas: 0 };
  for (const i of items ?? []) {
    const v = parseValor(i.sub_total || i.valor);
    if (i.status === 3)      { tot.efetivadas++; tot.vEfetivadas += v; }
    else if (i.status === 4) { tot.canceladas++; tot.vCanceladas += v; }
    else                     { tot.abertas++;    tot.vAbertas    += v; }
  }
  const totalGeral  = tot.abertas + tot.efetivadas + tot.canceladas;
  const vTotalGeral = tot.vAbertas + tot.vEfetivadas + tot.vCanceladas;

  const grupoAtual = grupoDeStatus(status);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          Visualização Rápida — Agendas
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/agenda">
            <Button variant="outline" size="sm">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              Calendário
            </Button>
          </Link>
          <Link href="/agenda/nova">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Novo
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filtros ── */}
      <form onSubmit={handlePesquisar} className="rounded-xl border bg-card p-4 space-y-3">

        {/* Linha 1: Datas */}
        <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', filiais.length > 1 ? 'lg:grid-cols-9' : 'lg:grid-cols-8')}>
          {filiais.length > 1 && (
            <div className="space-y-1 min-w-0">
              <label className="text-[11px] text-muted-foreground">Filial</label>
              <Select
                value={String(filial ?? filialHome ?? '')}
                onValueChange={(v) => v && irPara({ filial: Number(v) === filialHome ? null : Number(v) })}
                items={filiais.map((f) => ({ value: String(f.id), label: f.nome }))}
              >
                <SelectTrigger className={cn('h-8 text-xs w-full min-w-0', outraFilial && 'border-amber-400 text-amber-700 bg-amber-50 font-semibold')}>
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)} className="text-xs">{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Datas Abertura
            </label>
            <Input
              type="date"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">até</label>
            <Input
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Datas Previsão
            </label>
            <Input
              type="date"
              value={prevDe}
              onChange={(e) => setPrevDe(e.target.value)}
              className="h-8 text-xs"
              placeholder="Qualquer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">até</label>
            <Input
              type="date"
              value={prevAte}
              onChange={(e) => setPrevAte(e.target.value)}
              className="h-8 text-xs"
              placeholder="Qualquer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Profissional</label>
            <Select
              value={profId || 'todos'}
              onValueChange={(v) => v && setProfId(v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(profissionais ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Serviço</label>
            <Select
              value={servId || 'todos'}
              onValueChange={(v) => v && setServId(v === 'todos' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(servicos ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Nº Agenda</label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex: 283500"
              inputMode="numeric"
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Ordenar por
            </label>
            <Select
              value={orderBy || 'abertura'}
              onValueChange={(v) => v && setOrderBy(v)}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abertura">Dt. abertura</SelectItem>
                <SelectItem value="previsao">Dt. previsão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha 2: Busca textual + Animal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Cliente / Profissional</label>
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-8">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por cliente ou profissional..."
                className="flex-1 min-w-0 text-xs bg-transparent outline-none"
              />
              {busca && (
                <button type="button" onClick={() => setBusca('')}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Animal</label>
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-8">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={animal}
                onChange={(e) => setAnimal(e.target.value)}
                placeholder="Buscar por nome do animal..."
                className="flex-1 min-w-0 text-xs bg-transparent outline-none"
              />
              {animal && (
                <button type="button" onClick={() => setAnimal('')}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Linha 3: Situação (radio buttons como no legado) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground mr-1">Situação:</span>
          {[
            { key: 'todos',      label: 'Todos',       statusValue: 'todos' },
            { key: 'abertos',    label: 'Em aberto',   statusValue: '1'     },
            { key: 'efetivadas', label: 'Efetivadas',  statusValue: '3'     },
            { key: 'canceladas', label: 'Canceladas',  statusValue: '4'     },
          ].map(({ key, label, statusValue }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(statusValue)}
              className={cn(
                'h-7 px-3 rounded-full text-xs font-medium border transition-colors',
                grupoAtual === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {label}
              {key !== 'todos' && (
                <span className={cn(
                  'ml-1.5 font-mono',
                  grupoAtual === key ? 'text-primary-foreground/70' : 'text-muted-foreground/60',
                )}>
                  {key === 'abertos' ? tot.abertas : key === 'efetivadas' ? tot.efetivadas : tot.canceladas}
                </span>
              )}
            </button>
          ))}

          <Button type="submit" size="sm" disabled={isPending} className="h-7 px-4">
            {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
            Pesquisar
          </Button>

          {/* Limpar filtros */}
          {(filtros.prevDe || filtros.prevAte || filtros.busca || filtros.animal || filtros.numero || filtros.servId || (filtros.profId && filtros.profId !== 'todos')) && (
            <button
              type="button"
              onClick={limparFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Limpar filtros
            </button>
          )}
        </div>
      </form>

      {/* ── Grid ── */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
          <Loader2 className="h-8 w-8 mb-2 animate-spin" />
          <p className="text-sm">Pesquisando...</p>
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
          <List className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhuma agenda encontrada para os filtros.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 px-2">Núm.</TableHead>
                <TableHead className="text-center w-24 px-1">Data</TableHead>
                <TableHead className="text-center w-16 px-1">Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="px-2">Animal</TableHead>
                <TableHead className="px-2">Raça</TableHead>
                <TableHead className="px-2">Serviço</TableHead>
                <TableHead className="px-2">Profissional</TableHead>
                <TableHead className="text-right w-24 px-2">Total</TableHead>
                <TableHead className="text-center w-28 px-1">Status</TableHead>
                <TableHead className="text-center w-12 px-1">Cupom</TableHead>
                <TableHead className="text-center w-20 px-1">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const st  = STATUS_AGENDA[i.status] ?? { label: String(i.status), color: 'bg-muted text-muted-foreground' };
                const cor = corPorServicoId[i.servico_id];
                return (
                  <TableRow
                    key={i.id}
                    className={cn('cursor-pointer hover:bg-muted/40', i.status === 4 && 'opacity-50')}
                    onClick={() => router.push(`/agenda/${i.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground px-2">#{i.id}</TableCell>
                    <TableCell className="text-center text-xs font-mono px-1 whitespace-nowrap">{fmtData(i.data)}</TableCell>
                    <TableCell className="text-center text-xs font-mono px-1">{i.hora?.slice(0, 5) || '—'}</TableCell>
                    <TableCell className="text-sm font-medium">
                      <span className="flex items-center gap-1.5">
                        {i.cliente || '—'}
                        {i.animal_id > 0 && (
                          <button
                            type="button"
                            title="Histórico do animal"
                            onClick={(e) => { e.stopPropagation(); setHistoricoDe(i); }}
                            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm px-2">
                      <span className="flex items-center gap-1.5">
                        {i.animal || '—'}
                        {i.animal_id > 0 && (
                          <button
                            type="button"
                            title="Estimativas do pet (vacinas, vermífugos e outros pendentes)"
                            onClick={(e) => { e.stopPropagation(); setEstimativasDe(i); }}
                            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <BellRing className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground px-2">{i.raca || '—'}</TableCell>
                    <TableCell className="text-sm px-2">
                      <span className="flex items-center gap-1.5">
                        {cor && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cor }} />}
                        {i.servico || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm px-2">{i.profissional || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-mono px-2">
                      R$ {fmtMoeda(parseValor(i.sub_total || i.valor))}
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', st.color)}>
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-center px-1">
                      {i.status === 3 && (
                        <button
                          type="button"
                          title="Ver cupom da venda"
                          disabled={buscandoCupomDe === i.id}
                          onClick={(e) => { e.stopPropagation(); handleVerCupom(i); }}
                          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          {buscandoCupomDe === i.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Receipt className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-1">
                      <span className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          title="Visualizar"
                          onClick={(e) => { e.stopPropagation(); router.push(`/agenda/${i.id}`); }}
                          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); router.push(`/agenda/${i.id}/editar`); }}
                          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Totalizadores (como no legado) ── */}
      <div className="rounded-xl border bg-card px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="font-semibold text-blue-600">
            {tot.abertas} <span className="font-mono font-normal text-xs">· R$ {fmtMoeda(tot.vAbertas)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Efetivadas</p>
          <p className="font-semibold text-green-600">
            {tot.efetivadas} <span className="font-mono font-normal text-xs">· R$ {fmtMoeda(tot.vEfetivadas)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Canceladas</p>
          <p className="font-semibold text-red-500">
            {tot.canceladas} <span className="font-mono font-normal text-xs">· R$ {fmtMoeda(tot.vCanceladas)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total geral</p>
          <p className="font-bold text-primary">
            {totalGeral} <span className="font-mono font-normal text-xs">· R$ {fmtMoeda(vTotalGeral)}</span>
          </p>
        </div>
      </div>

      {historicoDe && (
        <HistoricoAnimalModal
          animalId={historicoDe.animal_id}
          animalNome={historicoDe.animal || 'Pet'}
          clienteId={historicoDe.cliente_id}
          clienteNome={historicoDe.cliente || '—'}
          filial={historicoDe.filial}
          onClose={() => setHistoricoDe(null)}
        />
      )}

      {estimativasDe && (
        <EstimativasPetModal
          animalId={estimativasDe.animal_id}
          animalNome={estimativasDe.animal || 'Pet'}
          onClose={() => setEstimativasDe(null)}
        />
      )}

      {erroCupom && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-destructive/30 bg-card px-4 py-2.5 text-sm text-destructive shadow-lg"
          onClick={() => setErroCupom('')}
        >
          <Receipt className="h-4 w-4 shrink-0" />
          {erroCupom}
        </div>
      )}

      {/* Mais de um cupom bateu na janela de datas — deixa o usuário escolher */}
      {candidatosCupom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCandidatosCupom(null)}>
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Mais de um cupom encontrado — agenda #{candidatosCupom.agendaId}
              </h2>
              <button type="button" onClick={() => setCandidatosCupom(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {candidatosCupom.lista.map((c) => (
                <button
                  key={c.numero_cupom}
                  type="button"
                  onClick={() => abrirCupom(c)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                >
                  <span className="font-mono text-xs text-muted-foreground">#{c.numero_cupom}</span>
                  <span className="flex-1 text-xs">{fmtData(c.data)} {c.hora?.slice(0, 5)}</span>
                  <span className="font-medium">R$ {fmtMoeda(c.valor_liquido)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {cupomAberto && (
        <CupomPreviewModal
          cupom={cupomAberto}
          itens={itensCupom}
          pagamentos={pagamentosCupom}
          carregandoItens={carregandoItensCupom}
          carregandoPagamentos={carregandoPagCupom}
          onClose={() => setCupomAberto(null)}
        />
      )}
    </div>
  );
}
