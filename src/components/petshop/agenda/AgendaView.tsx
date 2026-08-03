'use client';

import { useRouter } from 'next/navigation';
import { AgendaItem, AgendaDetalhe, Profissional, Servico, Vendedor, STATUS_AGENDA } from '@/types/petshop';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, CalendarDays, Plus, Loader2, Clock, List,
  X, Users, CheckCircle2, Timer, Phone, Pencil, SlidersHorizontal, Printer, XCircle,
  PartyPopper, MessageCircle, Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { reagendarHorario, buscarDadosEmpresa, atualizarStatus } from '@/app/(petshop)/agenda/[id]/actions';
import { buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { useAgendaRealtime } from '@/hooks/useAgendaRealtime';
import { printWindow } from '@/lib/printWindow';
import { gerarCupomAgenda } from '@/components/petshop/print/cupomAgenda';
import GerenciarTecnicosDialog from '@/components/petshop/agenda/GerenciarTecnicosDialog';
import { definirAgendaTecnico } from '@/app/(petshop)/agenda/tecnicos-actions';

interface FilialOption { id: number; nome: string; }

interface Props {
  items:                AgendaItem[];
  profissionais:        Profissional[];
  servicos?:            Servico[];
  vendedores?:          Vendedor[];
  dataAtual:            string;
  profissionalIdAtual:  string;
  statusAtual:          string;
  filial?:              number;
  filialHome?:          number;
  filiais?:             FilialOption[];
  periodo?:             'dia' | 'semana';
  semanaInicio?:         string;   // ISO YYYY-MM-DD, segunda-feira da semana visualizada
}

// ── constantes da grade ──────────────────────────────────────────────────────
const PX_PER_HOUR = 88;   // pixels por hora na timeline
const HOUR_START  = 7;
const HOUR_END    = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);
const GUTTER_PX   = 56;   // largura da coluna de horários (grid por profissional)
const COL_MIN_PX  = 190;  // largura mínima de cada coluna de profissional

/** Converte string "DD/MM/YYYY HH:MM:SS" ou "YYYY-MM-DDTHH:MM:SS" → minutos desde meia-noite */
function parseTimeMins(s?: string): number | null {
  if (!s) return null;
  const parts = s.trim().split(' ');
  const timePart = parts.length >= 2 ? parts[1] : (s.includes('T') ? s.split('T')[1] : null);
  if (!timePart) return null;
  const [hh, mm] = timePart.split(':').map(Number);
  if (isNaN(hh)) return null;
  return hh * 60 + (mm || 0);
}

/** Data (DD/MM/YYYY) a partir de data_previsao ("DD/MM/YYYY HH:MM:SS"), com fallback em item.data */
function dataDDMM(item: { data_previsao?: string; data: string }): string {
  const parte = item.data_previsao?.trim().split(' ')[0];
  if (parte && parte.includes('/')) return parte;
  // item.data pode vir em YYYY-MM-DD (Firebird) — normaliza para DD/MM/YYYY
  if (item.data?.includes('-')) {
    const [y, m, d] = item.data.split('-');
    return `${d}/${m}/${y}`;
  }
  return item.data ?? '';
}

/** ISO (YYYY-MM-DD) → DD/MM/YYYY */
function isoParaDDMM(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Monta o link wa.me a partir de um telefone (com ou sem formatação) + mensagem */
function linkWhatsapp(telefone: string, mensagem: string): string | null {
  let digitos = telefone.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length <= 11) digitos = '55' + digitos; // adiciona DDI Brasil se ausente
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

function minsToTop(mins: number, pxPerHour: number = PX_PER_HOUR): number {
  return ((mins - HOUR_START * 60) / 60) * pxPerHour;
}

function formatHHMM(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Layout de colunas para evitar sobreposição visual de cards */
interface LayoutCard {
  item:      AgendaItem;
  startMins: number;
  endMins:   number;
  col:       number;
  totalCols: number;
}

function layoutCards(items: AgendaItem[]): LayoutCard[] {
  const cards: LayoutCard[] = [];

  for (const item of items) {
    const startMins = parseTimeMins(item.data_previsao);
    if (startMins === null) continue;
    const endRaw  = parseTimeMins(item.data_entrega);
    const endMins = endRaw && endRaw > startMins ? endRaw : startMins + 60;

    const overlapping = cards.filter(c => c.startMins < endMins && c.endMins > startMins);
    const usedCols    = new Set(overlapping.map(c => c.col));
    let col = 0;
    while (usedCols.has(col)) col++;

    cards.push({ item, startMins, endMins, col, totalCols: 1 });
  }

  // ajusta totalCols para cada grupo de sobreposição
  for (const card of cards) {
    const overlapping = cards.filter(c =>
      c !== card && c.startMins < card.endMins && c.endMins > card.startMins,
    );
    if (overlapping.length > 0) {
      const maxCol = Math.max(...overlapping.map(c => c.col), card.col);
      const total  = maxCol + 1;
      card.totalCols = total;
      for (const o of overlapping) o.totalCols = Math.max(o.totalCols, total);
    }
  }

  return cards;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function addDias(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function isoFromYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function hojeISO() { return new Date().toISOString().split('T')[0]; }

/** Status operacionais da agenda (campo SITUACAO), como no sistema legado. */
const SITUACOES = ['CONFIRMACAO', 'ABERTA', 'RECEBIDO', 'FINALIZADA', 'VISUALIZADA', 'ENCERRADA', 'RECONSULTA', 'APLICADO'];

/** Marca de pagamento: pago quando preenchido e diferente de 0/N (convenção do legado). */
function isPago(pago?: string): boolean {
  const v = (pago ?? '').trim().toUpperCase();
  return v !== '' && v !== '0' && v !== 'N';
}

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function diasDoGrid(year: number, month: number): { iso: string; outroMes: boolean }[] {
  const primeiro = new Date(year, month, 1).getDay();
  const ultimo   = new Date(year, month + 1, 0).getDate();
  const days: { iso: string; outroMes: boolean }[] = [];

  const mesAnterior    = month === 0 ? 11 : month - 1;
  const anoAnterior    = month === 0 ? year - 1 : year;
  const ultimoAnterior = new Date(anoAnterior, mesAnterior + 1, 0).getDate();
  for (let i = primeiro - 1; i >= 0; i--)
    days.push({ iso: isoFromYMD(anoAnterior, mesAnterior, ultimoAnterior - i), outroMes: true });

  for (let d = 1; d <= ultimo; d++)
    days.push({ iso: isoFromYMD(year, month, d), outroMes: false });

  const proximo    = month === 11 ? 0  : month + 1;
  const anoProximo = month === 11 ? year + 1 : year;
  let nextDay = 1;
  while (days.length < 42)
    days.push({ iso: isoFromYMD(anoProximo, proximo, nextDay++), outroMes: true });

  return days;
}

// ── Mini Calendário ───────────────────────────────────────────────────────────

function MiniCalendario({ dataSel, onSelectDay }: { dataSel: string; onSelectDay: (iso: string) => void }) {
  const [y0, m0] = dataSel.split('-').map(Number);
  const [viewYear,  setViewYear]  = useState(y0);
  const [viewMonth, setViewMonth] = useState(m0 - 1);

  function prevMes() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMes() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const hoje = hojeISO();
  const grid = diasDoGrid(viewYear, viewMonth);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMes} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">{MESES_PT[viewMonth]} {viewYear}</span>
        <button onClick={nextMes} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA_ABREV.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map(({ iso, outroMes }) => {
          const isHoje = iso === hoje;
          const isSel  = iso === dataSel;
          return (
            <button
              key={iso}
              onClick={() => onSelectDay(iso)}
              className={cn(
                'h-8 md:h-8 w-full rounded-full text-xs font-medium transition-colors flex items-center justify-center min-h-[2.25rem]',
                outroMes && 'text-muted-foreground/40',
                !outroMes && !isSel && !isHoje && 'hover:bg-muted text-foreground',
                isHoje && !isSel && 'text-primary font-bold',
                isSel && 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {Number(iso.split('-')[2])}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Card de agendamento (draggable) ───────────────────────────────────────────

interface CardProps {
  item:        AgendaItem;
  corServico?: string | null;
  isDragging:  boolean;
  onDragStart: (item: AgendaItem) => void;
  onDragEnd:   () => void;
  onClick:     (item: AgendaItem) => void;
  onDoubleClick?: (item: AgendaItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: AgendaItem) => void;
  height?:     number;
}

function CardAgendamento({ item, corServico, isDragging, onDragStart, onDragEnd, onClick, onDoubleClick, onContextMenu, height }: CardProps) {
  const compact = (height ?? 80) < 70;
  const info = STATUS_AGENDA[item.status] ?? { label: String(item.status), color: '' };
  const podeArrastar = item.status === 1 || item.status === 2;
  const pronto = (item.situacao ?? '').trim().toUpperCase() === 'ENCERRADA';

  const startMins = parseTimeMins(item.data_previsao);
  const endMins   = parseTimeMins(item.data_entrega);
  const startStr  = startMins !== null ? formatHHMM(startMins) : (item.hora?.slice(0, 5) ?? '');
  const endStr    = endMins   !== null ? formatHHMM(endMins)   : '';
  const duracao   = (startMins !== null && endMins !== null && endMins > startMins)
    ? endMins - startMins : null;

  const bgMap: Record<number, string> = {
    1: 'bg-blue-50   border-blue-200',
    2: 'bg-amber-50  border-amber-200',
    3: 'bg-green-50  border-green-200',
    4: 'bg-red-50    border-red-200    opacity-60',
  };

  return (
    <div
      draggable={podeArrastar}
      onDragStart={(e) => {
        if (!podeArrastar) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(item.id));
        onDragStart(item);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.preventDefault(); onClick(item); }}
      onDoubleClick={(e) => { e.preventDefault(); onDoubleClick?.(item); }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, item); }}
      className={cn(
        'relative h-full rounded-lg border px-2.5 py-1.5 text-xs hover:shadow-md transition-shadow bg-card cursor-pointer overflow-hidden text-gray-900',
        bgMap[item.status] ?? 'border-border',
        isDragging && 'opacity-30 scale-95',
        podeArrastar && 'cursor-grab active:cursor-grabbing',
        pronto && 'ring-2 ring-emerald-400 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]',
      )}
      style={corServico ? { borderLeft: `4px solid ${corServico}` } : undefined}
    >
      {pronto && (
        <div
          className="absolute -right-6 top-1.5 rotate-45 bg-emerald-500 text-white text-[9px] font-bold px-6 py-0.5 shadow-sm flex items-center justify-center gap-0.5 z-20"
          title="Pet pronto — atendimento encerrado"
        >
          <PartyPopper className="h-2.5 w-2.5" /> PRONTO
        </div>
      )}
      {compact ? (
        /* ── Modo compacto (card muito pequeno) ────────────────────────── */
        <div className="flex items-center gap-1.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/petshop/animais/${item.animal_id}/foto`}
            alt=""
            className="h-6 w-6 rounded-full object-cover shrink-0 border border-white/80 shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="font-bold truncate leading-tight">{item.animal}</span>
          <span className="shrink-0 font-mono text-gray-500 ml-auto">{startStr}</span>
        </div>
      ) : (
        /* ── Modo normal ───────────────────────────────────────────────── */
        <>
          {/* Linha 1: horário + duração + nº pedido */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[11px] font-semibold text-gray-700">
              {startStr}{endStr ? ` - ${endStr}` : ''}
            </span>
            <div className="flex items-center gap-2">
              {duracao !== null && (
                <span className="text-[10px] text-gray-500 font-mono">
                  ⏱ {duracao} min
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">
                #{item.id}
              </span>
            </div>
          </div>

          {/* Linha 2: foto + nome + dono */}
          <div className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/petshop/animais/${item.animal_id}/foto`}
              alt=""
              className="h-10 w-10 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight truncate text-gray-900">{item.animal}</p>
              {item.raca && (
                <p className="text-[10px] text-gray-500 truncate leading-tight">{item.raca}</p>
              )}
              <p className="text-[11px] text-gray-500 truncate flex items-center gap-0.5 mt-0.5">
                <Users className="h-3 w-3 shrink-0" />
                {item.cliente}
              </p>
            </div>
          </div>

          {/* Linha 3: badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.servico && (
              <span
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium border"
                style={corServico
                  ? { background: corServico + '22', borderColor: corServico, color: corServico }
                  : undefined}
              >
                {item.servico}
              </span>
            )}
            <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold border', info.color)}>
              {info.label}
            </span>
            {isPago(item.pago) && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold border bg-green-100 text-green-700 border-green-300">
                Pago
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Botão de novo agendamento por horário ─────────────────────────────────────

function HoraBotao({ hora, href, top }: { hora: string; href: string; top: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    router.push(href);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="absolute left-1 flex items-start gap-1.5 px-3 pt-2 rounded-md text-xs text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors group disabled:opacity-70"
      style={{ top: top + 2, zIndex: 1, cursor: loading ? 'wait' : 'pointer', width: 80, height: PX_PER_HOUR - 4 }}
      title={`Novo agendamento às ${hora}`}
    >
      {loading
        ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary mt-0.5" />
        : <Plus className="h-4 w-4 shrink-0 mt-0.5" />
      }
      <span className="font-mono opacity-0 group-hover:opacity-100 transition-opacity">
        {hora}
      </span>
    </button>
  );
}

// ── Painel lateral de detalhes ────────────────────────────────────────────────

interface DetailPanelProps {
  item:          AgendaItem;
  corServico?:   string | null;
  profissionais: Profissional[];
  servicos:      Servico[];
  vendedores:    Vendedor[];
  onClose:       () => void;
  onItemUpdate:  (updated: AgendaItem) => void;
}

function DetailPanel({ item, corServico, profissionais, servicos, vendedores, onClose, onItemUpdate }: DetailPanelProps) {
  const router                        = useRouter();
  const [detalhe,     setDetalhe]     = useState<AgendaDetalhe | null>(null);
  const [loadingDet,  setLoadingDet]  = useState(true);
  const [telefone,    setTelefone]    = useState('');
  const [cancelOpen,  setCancelOpen]  = useState(false);
  const [motivo,      setMotivo]      = useState('');
  const [cancelando,  setCancelando]  = useState(false);
  const [erroCancel,  setErroCancel]  = useState('');
  const [salvandoSit, setSalvandoSit] = useState(false);

  async function mudarSituacao(novo: string) {
    setSalvandoSit(true);
    const r = await atualizarStatus(item.id, novo);
    setSalvandoSit(false);
    if (r.error) return;
    setDetalhe((d) => (d ? { ...d, situacao: novo } : d));
    onItemUpdate({ ...(item as AgendaDetalhe), situacao: novo });
    router.refresh();
  }

  useEffect(() => {
    setLoadingDet(true);
    setDetalhe(null);
    setTelefone('');

    // Busca detalhe da agenda e telefone do cliente em paralelo
    Promise.all([
      fetch(`/api/petshop/agenda/detalhe?id=${item.id}&filial=${item.filial}`).then(r => r.json()),
      item.cliente_id
        ? fetch(`/api/petshop/clientes/${item.cliente_id}?filial=${item.filial}`).then(r => r.json()).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([det, cli]) => {
        setDetalhe(det as AgendaDetalhe);
        // telefone do detalhe (após recompile) ou do cadastro do cliente
        const tel = det?.celular || det?.telefone || cli?.celular || cli?.telefone || '';
        setTelefone(tel);
      })
      .catch(() => {})
      .finally(() => setLoadingDet(false));
  }, [item.id, item.filial, item.cliente_id]);

  // item tem os dados do card (sempre preenchidos); detalhe adiciona campos extras.
  // Nunca deixamos detalhe sobrescrever com valores vazios/undefined.
  const current: AgendaDetalhe = {
    ...(item as AgendaDetalhe),
    ...Object.fromEntries(
      Object.entries(detalhe ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    ),
  } as AgendaDetalhe;
  const info = STATUS_AGENDA[current.status] ?? { label: String(current.status), color: '' };

  const startMins = parseTimeMins(current.data_previsao);
  const endMins   = parseTimeMins(current.data_entrega);
  const startStr  = startMins !== null ? formatHHMM(startMins) : (current.hora?.slice(0, 5) ?? '');
  const endStr    = endMins   !== null ? formatHHMM(endMins)   : '';
  const duracao   = (startMins !== null && endMins !== null && endMins > startMins)
    ? endMins - startMins : null;

  const subtotal = parseFloat(current.sub_total || '0');
  const valorFmt = subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const [imprimindo, setImprimindo] = useState(false);

  async function handlePrint() {
    setImprimindo(true);
    const [empresa, cliente, itensRes] = await Promise.all([
      buscarDadosEmpresa(item.filial).catch(() => null),
      current.cliente_id ? buscarClienteCompleto(current.cliente_id).catch(() => null) : Promise.resolve(null),
      fetch(`/api/petshop/agenda/itens?id=${item.id}&filial=${item.filial}`).then(r => r.json()).catch(() => null),
    ]);
    setImprimindo(false);

    const html = gerarCupomAgenda({
      id:            item.id,
      cliente_id:    current.cliente_id,
      cliente:       current.cliente,
      telefone:      cliente?.telefone || current.telefone,
      celular:       cliente?.celular  || current.celular || telefone,
      endereco:      cliente?.endereco,
      numero:        cliente?.numero,
      bairro:        cliente?.bairro,
      cidade:        cliente?.cidade,
      data:          current.data,
      hora:          current.hora,
      data_previsao: current.data_previsao,
      data_entrega:  current.data_entrega,
      profissional:  current.profissional,
      vendedor:      detalhe?.vend_nome,
      servico:       current.servico,
      animal:        current.animal,
      raca:          current.raca,
      obs:           current.obs,
      valor:         current.sub_total || current.valor,
      itens:         itensRes?.dados ?? [],
      empresa,
    });
    printWindow(html);
  }

  function handleSalvo(updated: AgendaDetalhe) {
    setDetalhe(updated);
    onItemUpdate({
      ...item,
      prof_id:     updated.prof_id,
      profissional: updated.profissional,
      servico_id:  updated.servico_id,
      servico:     updated.servico,
      obs:         updated.obs,
    });
  }

  return (
    <aside className="w-full md:w-[340px] md:shrink-0 md:border-l bg-background flex flex-col overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold">Pedido #{item.id}</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Foto + nome */}
      <div className="flex flex-col items-center gap-3 px-4 py-6 border-b">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/petshop/animais/${item.animal_id}/foto`}
          alt={item.animal}
          className="h-32 w-32 rounded-full object-cover border-2 border-border shadow-md"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="text-center">
          <p className="text-2xl font-bold leading-tight">{current.animal}</p>
          {current.raca && <p className="text-sm text-muted-foreground mt-0.5">{current.raca}</p>}
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border mt-2', info.color)}>
            {info.label}
          </span>
        </div>
      </div>

      {/* Informações */}
      <div className="flex-1 px-4 py-4 space-y-3 text-sm">
        {loadingDet && <p className="text-xs text-muted-foreground">Carregando...</p>}

        <InfoRow label="Horário"
          value={`${startStr}${endStr ? ` – ${endStr}` : ''}${duracao !== null ? ` (${duracao} min)` : ''}`} />
        <InfoRow label="Valor"        value={valorFmt} highlight />
        <InfoRow label="Serviço"      value={current.servico} dot={corServico ?? undefined} />
        <InfoRow label="Profissional" value={current.profissional || '—'} />
        <InfoRow label="Cliente"      value={current.cliente} />
        {telefone && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-24 shrink-0 text-xs pt-0.5">Telefone</span>
            <a
              href={`tel:${telefone}`}
              className="flex-1 font-medium text-xs flex items-center gap-1.5 text-blue-600 hover:underline"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {telefone}
            </a>
          </div>
        )}
        {detalhe?.vend_nome && <InfoRow label="Vendedor" value={detalhe.vend_nome} />}
        {current.obs && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-24 shrink-0 text-xs pt-0.5">Observações</span>
            <span className="flex-1 font-medium text-xs whitespace-pre-wrap">{current.obs}</span>
          </div>
        )}
      </div>

      {/* Status operacional (SITUACAO) */}
      <div className="px-4 py-3 border-t space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Status do atendimento</label>
        <Select
          value={(current.situacao || '').toUpperCase() || null}
          onValueChange={(v) => { if (v) mudarSituacao(v); }}
          items={SITUACOES.map((s) => ({ value: s, label: s }))}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Definir status..." />
          </SelectTrigger>
          <SelectContent>
            {SITUACOES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {salvandoSit && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> salvando...</p>}
      </div>

      {/* Atendimento encerrado: avisar o cliente pelo WhatsApp que o pet está pronto */}
      {(current.situacao || '').toUpperCase() === 'ENCERRADA' && (
        <div className="px-4 py-3 border-t bg-emerald-50 dark:bg-emerald-950/20 space-y-2">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <PartyPopper className="h-3.5 w-3.5" /> Atendimento encerrado — {current.animal} está pronto!
          </p>
          {telefone ? (
            <a
              href={linkWhatsapp(
                telefone,
                `Olá, ${current.cliente}! O ${current.animal} já está pronto e te esperando para a retirada. Assim que puder, pode vir buscar. Obrigado!`,
              ) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium h-9 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Avisar cliente no WhatsApp
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">Cliente sem telefone/celular cadastrado.</p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="px-4 py-4 border-t space-y-2">
        <Button
          size="sm"
          className="w-full"
          onClick={() => router.push(`/agenda/${item.id}/editar`)}
          disabled={loadingDet}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Editar Agendamento
        </Button>
        {(current.servico ?? '').toUpperCase().includes('CONSULTA') && current.status !== 4 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-primary border-primary/30 hover:bg-primary/5"
            onClick={() => router.push(`/consultas/nova?agenda_id=${item.id}&filial=${item.filial}`)}
            disabled={loadingDet}
          >
            <Stethoscope className="h-4 w-4 mr-2" />
            Iniciar Consulta
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handlePrint}
          disabled={imprimindo || loadingDet}
        >
          {imprimindo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
          Reimprimir Agenda
        </Button>
        <Link href={`/agenda/${item.id}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            Ver detalhes completos
          </Button>
        </Link>
        {current.status !== 4 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => { setMotivo(''); setErroCancel(''); setCancelOpen(true); }}
            disabled={loadingDet}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar agenda
          </Button>
        )}
        <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>

      {/* Dialog: motivo do cancelamento */}
      <Dialog open={cancelOpen} onOpenChange={(v) => { if (!cancelando) setCancelOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Cancelar agenda
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Informe o motivo do cancelamento de <strong>{item.animal}</strong> ({item.cliente}).
          </p>
          <textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          {erroCancel && <p className="text-sm text-red-600">{erroCancel}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)} disabled={cancelando}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelando}
              onClick={async () => {
                if (!motivo.trim()) { setErroCancel('Informe o motivo.'); return; }
                setCancelando(true);
                setErroCancel('');
                const r = await atualizarStatus(item.id, 'CANCELADO', motivo.trim());
                setCancelando(false);
                if (r.error) { setErroCancel(r.error); return; }
                setCancelOpen(false);
                onClose();
                router.refresh();
              }}
            >
              {cancelando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar cancelamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </aside>
  );
}

function InfoRow({ label, value, highlight, dot }: { label: string; value: string; highlight?: boolean; dot?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-24 shrink-0 text-xs pt-0.5">{label}</span>
      <span className={cn('flex-1 font-medium text-xs flex items-center gap-1.5', highlight && 'text-green-600 font-bold')}>
        {dot && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dot }} />}
        {value}
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AgendaView({
  items, profissionais, servicos, vendedores = [], dataAtual, profissionalIdAtual, statusAtual, filial = 1,
  filialHome, filiais = [], periodo = 'dia', semanaInicio,
}: Props) {
  const router = useRouter();

  // Pré-carrega a rota de novo agendamento assim que a Agenda abre — o clique
  // no "+" de um slot vazio (criarNoSlot) só descobre a URL exata (data/hora)
  // no momento do clique, então não dá pra usar <Link prefetch> nela; isso
  // aquece o cache do Next.js (RSC + chunks) pra quando o clique acontecer
  // a navegação ser praticamente instantânea, já que a página em si não
  // depende dos query params pra decidir o que buscar (ver agenda/nova/page.tsx).
  useEffect(() => {
    router.prefetch('/agenda/nova');
    router.prefetch('/agenda/lista');
  }, [router]);

  // Botão "Visualização Rápida" — mesmo com o prefetch acima, o clique
  // precisa reagir na hora (spinner + desabilitado) pra não parecer travado
  // enquanto a navegação/dados carregam por trás.
  const [abrindoLista, startAbrirLista] = useTransition();
  function abrirVisualizacaoRapida() {
    startAbrirLista(() => router.push('/agenda/lista'));
  }

  // Visualizando filial diferente da padrão do usuário?
  const outraFilial = !!filialHome && filial !== filialHome;

  // ── Visão Dia / Semana ──
  const DIAS_SEMANA_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const weekDays = (() => {
    if (periodo !== 'semana' || !semanaInicio) return [];
    const base = new Date(semanaInicio + 'T00:00:00');
    const hojeIso = new Date().toISOString().split('T')[0];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      return { iso, label: DIAS_SEMANA_LABEL[i], diaMes: String(d.getDate()).padStart(2, '0'), isHoje: iso === hojeIso };
    });
  })();

  // ── Cores por tipo de serviço (PET_TIPO_SERVICO.COR_STATUS) ──
  const corPorServicoId: Record<number, string> = {};
  const legenda: { id: number; descricao: string; cor: string }[] = [];
  for (const s of servicos ?? []) {
    const cor = corServicoCss(s.cor_status);
    if (cor) {
      corPorServicoId[s.id] = cor;
      legenda.push({ id: s.id, descricao: s.descricao, cor });
    }
  }

  const [busca, setBusca]         = useState('');
  const [pagamento, setPagamento] = useState<'todos' | 'pagos' | 'nao'>('todos');
  const [, startTransition]       = useTransition();

  // ── Mobile: controles de gaveta ──
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileDetailOpen,  setMobileDetailOpen]  = useState(false);

  // Mini-calendário lateral (direita) — visibilidade persistida no navegador
  const [calendarioAberto, setCalendarioAberto] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem('agenda-calendario-aberto');
    if (v !== null) setCalendarioAberto(v === '1');
  }, []);
  function toggleCalendario() {
    setCalendarioAberto((prev) => {
      const novo = !prev;
      localStorage.setItem('agenda-calendario-aberto', novo ? '1' : '0');
      return novo;
    });
  }

  // Tipo de visualização: 'profissional' (colunas por técnico) ou 'geral' (timeline única)
  const [visualizacao, setVisualizacao] = useState<'profissional' | 'geral'>('profissional');
  useEffect(() => {
    const v = localStorage.getItem('agenda-visualizacao');
    if (v === 'geral' || v === 'profissional') setVisualizacao(v);
  }, []);
  function mudarVisualizacao(v: 'profissional' | 'geral') {
    setVisualizacao(v);
    localStorage.setItem('agenda-visualizacao', v);
  }

  // Mostrar agendas com NF emitida (STATUS 3)? Padrão: NÃO.
  const [mostrarNF, setMostrarNF] = useState(false);
  useEffect(() => {
    const v = localStorage.getItem('agenda-mostrar-nf');
    if (v !== null) setMostrarNF(v === '1');
  }, []);
  function mudarNF(v: boolean) {
    setMostrarNF(v);
    localStorage.setItem('agenda-mostrar-nf', v ? '1' : '0');
  }

  // Filtro por tipo de serviço (multi-seleção). Vazio = todos.
  const [servicosSel, setServicosSel] = useState<Set<string>>(new Set());
  const [servMenuOpen, setServMenuOpen] = useState(false);
  function toggleServico(nome: string) {
    setServicosSel((prev) => {
      const novo = new Set(prev);
      if (novo.has(nome)) novo.delete(nome); else novo.add(nome);
      return novo;
    });
  }

  // Menu de contexto (botão direito no card) para trocar o status/situação
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: AgendaItem } | null>(null);
  async function aplicarSituacao(it: AgendaItem, novo: string) {
    setCtxMenu(null);
    await atualizarStatus(it.id, novo);
    router.refresh();
  }

  // ── Atualização em tempo real via SSE ──
  const [liveFlash, setLiveFlash] = useState(false);
  useAgendaRealtime({
    filial,
    onEvent: () => {
      router.refresh();
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2_000);
    },
  });

  // ── Painel de detalhes ──
  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

  // ── Indicador de hora atual ──
  const [nowMins, setNowMins] = useState<number>(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMins(n.getHours() * 60 + n.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  const isToday = dataAtual === hojeISO();
  const showNow = isToday && nowMins >= HOUR_START * 60 && nowMins <= HOUR_END * 60;

  // Altura de cada hora no grid — menor no mobile para caber mais horários na tela
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const aplicar = () => setPxPerHour(mq.matches ? 44 : PX_PER_HOUR);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  // ── Drag & Drop ──
  const [dragItem, setDragItem]           = useState<AgendaItem | null>(null);
  const [dragOverMins, setDragOverMins]   = useState<number | null>(null);
  const [dragOverDia, setDragOverDia]     = useState<string | null>(null); // visão Semana: dia (ISO) sob o cursor
  const timelineRef                       = useRef<HTMLDivElement>(null);

  // ── Confirmação de reagendamento ──
  interface Pendente {
    item:             AgendaItem;
    novaData:         string;   // ISO YYYY-MM-DD do dia de destino
    novaHora:         string;
    novaDataPrevisao: string;
    novaDataEntrega:  string;
  }
  const [pendente, setPendente]     = useState<Pendente | null>(null);
  const [isSalvando, startSalvar]   = useTransition();
  const [erroReschedule, setErro]   = useState('');

  function navigate(params: Record<string, string | null | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data', dataAtual);
    if (profissionalIdAtual) sp.set('profissional_id', profissionalIdAtual);
    if (statusAtual)         sp.set('status', statusAtual);
    if (outraFilial)         sp.set('filial', String(filial));
    if (periodo === 'semana') sp.set('periodo', 'semana');
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/agenda?' + sp.toString()));
  }

  function goDay(iso: string) { navigate({ data: iso }); }

  function addDiasISO(iso: string, n: number): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  // Navega N dias — no modo Semana avança/retrocede a semana inteira (7 dias)
  function passoData(n: number) {
    if (periodo === 'semana' && semanaInicio) {
      navigate({ data: addDiasISO(semanaInicio, n * 7) });
    } else {
      navigate({ data: addDiasISO(dataAtual, n) });
    }
  }

  function mudarPeriodo(novo: 'dia' | 'semana') {
    if (novo === periodo) return;
    localStorage.setItem('agenda-periodo', novo);
    navigate({ periodo: novo === 'semana' ? 'semana' : null });
  }

  // Horário (min) arredondado para 30min a partir da posição do mouse na coluna
  function minsFromEvent(e: React.MouseEvent<HTMLElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - 12;                        // -12 = mesmo offset dos cards
    const bruto = HOUR_START * 60 + (y / pxPerHour) * 60;
    const mins = Math.round(bruto / 30) * 30;
    return Math.max(HOUR_START * 60, Math.min(mins, HOUR_END * 60));
  }

  // Realce do slot sob o cursor (coluna + horário)
  const [hoverSlot, setHoverSlot] = useState<{ key: string; mins: number } | null>(null);

  // Clicar numa célula vazia da coluna → cria agendamento no horário e com o profissional daquela coluna
  // (ou no dia da coluna, na visão Semana)
  function criarNoSlot(e: React.MouseEvent<HTMLElement>, profId?: number, diaISO?: string) {
    const mins = minsFromEvent(e);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    const params = new URLSearchParams({ data: diaISO ?? dataAtual, hora: `${hh}:${mm}` });
    if (profId) params.set('prof_id', String(profId));
    if (outraFilial) params.set('filial', String(filial));
    router.push(`/agenda/nova?${params.toString()}`);
  }

  // Fecha a agenda de um técnico direto do cabeçalho da coluna (grava OFF → some do grid)
  function fecharAgendaTecnico(profId?: number) {
    if (!profId) return;
    startTransition(async () => {
      await definirAgendaTecnico(profId, false);
      router.refresh();
    });
  }

  // Filtro por busca + pagamento
  // Serviços presentes nas agendas do dia (para o filtro de tipo de serviço)
  const servicosDisponiveis = Array.from(
    new Map(
      (items ?? [])
        .filter((i) => (i.servico ?? '').trim())
        .map((i) => [i.servico.trim(), { nome: i.servico.trim(), cor: corPorServicoId[i.servico_id] }]),
    ).values(),
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const filtrados = (items ?? []).filter((i) => {
    const passaBusca =
      !busca.trim() ||
      i.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      i.animal.toLowerCase().includes(busca.toLowerCase());
    const pago = isPago(i.pago);
    const passaPagamento =
      pagamento === 'todos' ||
      (pagamento === 'pagos' && pago) ||
      (pagamento === 'nao' && !pago);
    // NF emitida = STATUS 3. Por padrão escondemos; o check mostra.
    const passaNF = mostrarNF || i.status !== 3;
    // Tipo de serviço (vazio = todos)
    const passaServico = servicosSel.size === 0 || servicosSel.has((i.servico ?? '').trim());
    return passaBusca && passaPagamento && passaNF && passaServico;
  });

  // Layout com posicionamento absoluto (usado como fallback)
  const layoutedCards = layoutCards(filtrados);

  // ── Colunas por profissional (grid "agenda por profissional") ──
  function chaveProf(i: AgendaItem): string {
    if (i.prof_id) return `p${i.prof_id}`;
    const n = (i.profissional ?? '').trim();
    return n ? `n${n.toLowerCase()}` : 'sem';
  }
  // Agenda "aberta" = TEC_EMAIL === 'ON' (flag combinada). Só técnicos ON viram coluna.
  const agendaAberta = (p: Profissional) => (p.email ?? '').trim().toUpperCase() === 'ON';
  const colunasProf = (() => {
    const map = new Map<string, { key: string; nome: string; prof_id?: number }>();
    const profFiltro = profissionalIdAtual ? Number(profissionalIdAtual) : null;
    const idsConhecidos = new Set((profissionais ?? []).map((p) => p.id));
    // 1. Técnicos com agenda ABERTA (ON) → colunas fixas ao abrir, mesmo sem agendamento
    for (const p of (profissionais ?? [])) {
      if (profFiltro && p.id !== profFiltro) continue;
      if (!agendaAberta(p)) continue;
      map.set(`p${p.id}`, { key: `p${p.id}`, nome: p.nome, prof_id: p.id });
    }
    // 2. Agendamentos de profissionais fora da lista (texto/histórico) ainda aparecem.
    //    Profissionais conhecidos mas com agenda FECHADA (OFF) NÃO reaparecem aqui.
    for (const i of filtrados) {
      const k = chaveProf(i);
      if (map.has(k)) continue;
      if (i.prof_id && idsConhecidos.has(i.prof_id)) continue;
      if (profFiltro && i.prof_id !== profFiltro) continue;
      map.set(k, { key: k, nome: (i.profissional ?? '').trim() || 'Sem profissional', prof_id: i.prof_id || undefined });
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  })();

  const dataSel  = new Date(dataAtual + 'T00:00:00');
  const labelDia = periodo === 'semana' && weekDays.length === 7
    ? `Semana de ${weekDays[0].diaMes}/${new Date(weekDays[0].iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit' })} a ${weekDays[6].diaMes}/${new Date(weekDays[6].iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit' })}`
    : dataSel.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // ── Estatísticas ──
  const totalItems    = items.length;
  const emAtendimento = items.filter(i => i.status === 2).length;
  const concluidos    = items.filter(i => i.status === 3).length;
  const pendentes     = items.filter(i => i.status === 1).length;


  // ── handlers de drag ──
  function handleDragStart(item: AgendaItem) {
    setDragItem(item);
  }

  function handleDragEnd() {
    setDragItem(null);
    setDragOverMins(null);
    setDragOverDia(null);
  }

  const trackDragPos = useCallback((e: React.DragEvent) => {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y    = e.clientY - rect.top + el.scrollTop;
    const rawMins = HOUR_START * 60 + Math.round((y / pxPerHour) * 60 / 15) * 15;
    const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, rawMins));
    setDragOverMins(clamped);
  }, []);

  // Enquanto arrasta sobre uma coluna, calcula o horário (arredondado a 15 min).
  // Na visão Semana, cada coluna informa seu próprio dia (diaISO).
  function trackDragEmColuna(e: React.DragEvent<HTMLElement>, diaISO?: string) {
    if (!dragItem) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - 12;                       // -12 = mesmo offset dos cards
    const raw = HOUR_START * 60 + Math.round(((y / pxPerHour) * 60) / 15) * 15;
    const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, raw));
    setDragOverMins(clamped);
    setDragOverDia(diaISO ?? dataAtual);
  }

  function handleTimelineDrop(e: React.DragEvent, diaISO?: string) {
    e.preventDefault();
    if (!dragItem || dragOverMins === null) { setDragItem(null); return; }

    const diaDestino = diaISO ?? dataAtual;
    const startMins = parseTimeMins(dragItem.data_previsao);
    const mesmoDia  = dataDDMM(dragItem) === isoParaDDMM(diaDestino);
    if (mesmoDia && startMins === dragOverMins) { setDragItem(null); setDragOverMins(null); setDragOverDia(null); return; }

    const endRaw     = parseTimeMins(dragItem.data_entrega);
    const duracaoMin = (startMins !== null && endRaw && endRaw > startMins)
      ? endRaw - startMins : 60;

    const novaHora         = formatHHMM(dragOverMins);
    const novaDataPrevisao = `${diaDestino}T${novaHora}:00`;
    const entMins          = dragOverMins + duracaoMin;
    const novaDataEntrega  = `${diaDestino}T${formatHHMM(entMins)}:00`;

    setPendente({ item: dragItem, novaData: diaDestino, novaHora, novaDataPrevisao, novaDataEntrega });
    setDragItem(null);
    setDragOverDia(null);
    setDragOverMins(null);
    setErro('');
  }

  function cancelarReschedule() {
    setPendente(null);
    setErro('');
  }

  function confirmarReschedule() {
    if (!pendente) return;
    startSalvar(async () => {
      const res = await reagendarHorario(
        pendente.item.id,
        pendente.item.filial ?? 1,
        pendente.novaData,
        pendente.novaHora,
        pendente.novaDataPrevisao,
        pendente.novaDataEntrega,
      );
      if (res.error) {
        setErro(res.error);
        return;
      }
      setPendente(null);
      router.refresh();
    });
  }

  function fmtHora(h: string) {
    const [hh, mm] = h.split(':');
    return `${hh}h${mm !== '00' ? mm : ''}`;
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Overlay mobile (clique fora fecha a sidebar) ── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Setinha flutuante para reabrir o painel direito (desktop, quando recolhido) ── */}
      {!calendarioAberto && (
        <button
          onClick={toggleCalendario}
          title="Mostrar painel"
          className={cn(
            'hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 h-12 w-6 items-center justify-center',
            'rounded-l-lg border border-r-0 bg-background shadow-md',
            'text-muted-foreground hover:bg-muted hover:text-primary transition-colors',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* ── Sidebar de filtros (desktop: à DIREITA via order; ocultável pelo botão do cabeçalho) ── */}
      <aside className={cn(
        // Desktop: painel fixo à direita (order-2 = depois do grid) com borda à esquerda
        'md:order-2 md:w-72 md:shrink-0 md:border-l md:bg-background md:flex md:flex-col md:overflow-y-auto md:static md:z-auto md:translate-x-0 md:transition-none',
        // Mobile: gaveta deslizante da direita
        'fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-background flex flex-col overflow-y-auto border-l shadow-xl transition-transform duration-300 ease-in-out md:shadow-none',
        mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        // Botão do cabeçalho esconde todo o painel no desktop
        !calendarioAberto && 'md:hidden',
      )}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-semibold flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Agenda
            </h1>
            <div className="flex items-center gap-1">
              <Link href="/agenda/nova">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Novo
                </Button>
              </Link>
              {/* Botão fechar sidebar — só aparece no mobile */}
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden ml-1 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Recolher painel — só desktop (reabre pelo botão de calendário no topo) */}
              <button
                onClick={toggleCalendario}
                title="Esconder painel"
                className="hidden md:inline-flex ml-1 p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={() => goDay(hojeISO())}>
            Hoje
          </Button>

          <Button
            variant="outline" size="sm" className="w-full mt-2"
            onClick={abrirVisualizacaoRapida} disabled={abrindoLista}
          >
            {abrindoLista
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <List className="h-3.5 w-3.5 mr-1.5" />}
            Visualização Rápida
          </Button>

          {/* ── Controles rápidos — só mobile (no desktop já ficam no cabeçalho) ── */}
          <div className="md:hidden mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/tele-entregas/nova">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Entrega
                </Button>
              </Link>
              <Link href="/prevendas/nova">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Pré-venda
                </Button>
              </Link>
            </div>

            <div className="[&_button]:w-full">
              <GerenciarTecnicosDialog />
            </div>

            {/* Toggle Dia / Semana */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Período</label>
              <div className="relative inline-flex w-full h-9 items-center rounded-full p-0.5 border border-input bg-muted/40">
                <span
                  className={cn(
                    'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(.2,.9,.25,1)]',
                    periodo === 'semana' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0',
                  )}
                />
                <button
                  type="button"
                  onClick={() => mudarPeriodo('dia')}
                  className={cn('relative z-10 flex-1 text-xs font-semibold py-1.5', periodo === 'dia' ? 'text-foreground' : 'text-muted-foreground')}
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => mudarPeriodo('semana')}
                  className={cn('relative z-10 flex-1 text-xs font-semibold py-1.5', periodo === 'semana' ? 'text-foreground' : 'text-muted-foreground')}
                >
                  Semana
                </button>
              </div>
            </div>

            {/* Toggle de visualização (só na visão Dia) */}
            {periodo === 'dia' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Visualização</label>
                <div className="relative inline-flex w-full h-9 items-center rounded-full p-0.5 border border-input bg-muted/40">
                  <span
                    className={cn(
                      'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(.2,.9,.25,1)]',
                      visualizacao === 'geral' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => mudarVisualizacao('profissional')}
                    className={cn('relative z-10 flex-1 text-xs font-semibold py-1.5', visualizacao === 'profissional' ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => mudarVisualizacao('geral')}
                    className={cn('relative z-10 flex-1 text-xs font-semibold py-1.5', visualizacao === 'geral' ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    Geral
                  </button>
                </div>
              </div>
            )}

            {/* Check: NF emitida */}
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mostrarNF}
                onChange={(e) => mudarNF(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Mostrar NF emitida
            </label>

            {/* Tipos de serviço */}
            {servicosDisponiveis.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Tipos de serviço</label>
                  {servicosSel.size > 0 && (
                    <button onClick={() => setServicosSel(new Set())} className="text-[11px] text-primary hover:underline">Limpar</button>
                  )}
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border border-input p-2">
                  {servicosDisponiveis.map((s) => (
                    <label key={s.nome} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={servicosSel.has(s.nome)}
                        onChange={() => toggleServico(s.nome)}
                        className="h-3.5 w-3.5 rounded border-input"
                      />
                      {s.cor && <span className="h-2.5 w-2.5 rounded-sm shrink-0 border border-black/10" style={{ background: s.cor }} />}
                      <span className="truncate">{s.nome}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mini-calendário */}
          <div className="mt-3">
            <MiniCalendario dataSel={dataAtual} onSelectDay={goDay} />
          </div>
        </div>

        <div className="p-4 space-y-3 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros</p>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Profissional</label>
            <Select
              value={profissionalIdAtual || 'todos'}
              onValueChange={(v) => navigate({ profissional_id: v })}
              items={[
                { value: 'todos', label: 'Todos' },
                ...(profissionais ?? []).map((p) => ({ value: String(p.id), label: p.nome })),
              ]}
            >
              <SelectTrigger className="h-8 text-xs">
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
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={statusAtual || 'todos'}
              onValueChange={(v) => navigate({ status: v === 'todos' ? '' : v })}
              items={[
                { value: 'todos', label: 'Todos' },
                { value: '1', label: 'Agendado' },
                { value: '2', label: 'Em atendimento' },
                { value: '3', label: 'Finalizado' },
                { value: '4', label: 'Cancelado' },
              ]}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">Agendado</SelectItem>
                <SelectItem value="2">Em atendimento</SelectItem>
                <SelectItem value="3">Finalizado</SelectItem>
                <SelectItem value="4">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pagamento</label>
            <Select
              value={pagamento}
              onValueChange={(v) => setPagamento((v as 'todos' | 'pagos' | 'nao') || 'todos')}
              items={[
                { value: 'todos', label: 'Todas' },
                { value: 'pagos', label: 'Pagas' },
                { value: 'nao',   label: 'Não pagas' },
              ]}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="pagos">Pagas</SelectItem>
                <SelectItem value="nao">Não pagas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <Input
              placeholder="Cliente ou animal..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* ── Legenda de cores por tipo de serviço ── */}
          {legenda.length > 0 && (
            <div className="pt-3 border-t space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Legenda — Serviços
              </p>
              <div className="space-y-1">
                {legenda.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-3 w-3 rounded-sm shrink-0 border border-black/10"
                      style={{ background: l.cor }}
                    />
                    <span className="truncate">{l.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Área central (timeline + painel detalhes) ── */}
      <div className="flex-1 flex overflow-hidden md:order-1">

        {/* ── Coluna da timeline ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header da data + navegação */}
          <div className={cn('border-b px-3 md:px-6 py-1.5 md:py-2 shrink-0', outraFilial ? 'bg-amber-50' : 'bg-background')}>
            {outraFilial && (
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                <SlidersHorizontal className="h-3 w-3" />
                Você está vendo a agenda de OUTRA filial ({filial}) — sua filial padrão é {filialHome}.
              </div>
            )}
            <div className="flex items-center justify-between mb-1.5 md:mb-2">
              {/* Espaço à esquerda no desktop para não ficar sob o botão flutuante ☰ do menu */}
              <div className="flex items-center gap-2 min-w-0 md:pl-11">
                <div className="min-w-0">
                  <p className="text-xs md:text-base font-semibold capitalize truncate">{labelDia}</p>
                  {dragItem && (
                    <p className="text-xs text-primary font-medium animate-pulse">
                      Arraste para um horário...
                    </p>
                  )}
                </div>
              </div>

              {/* Legenda de cores por tipo de serviço (desktop) */}
              {legenda.length > 0 && (
                <div className="hidden lg:flex flex-wrap items-center justify-end gap-x-3 gap-y-1 flex-1 mx-4 max-h-12 overflow-hidden">
                  {legenda.map((l) => (
                    <span key={l.id} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0 border border-black/10" style={{ background: l.cor }} />
                      <span className="truncate max-w-[120px]">{l.descricao}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                {liveFlash && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 font-medium animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Atualizando
                  </span>
                )}
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => passoData(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => passoData(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Estatísticas + ações rápidas (mesma linha no desktop, para poupar altura) ── */}
            {/* Desktop: botões com texto / Mobile: apenas ícones com FAB principal */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 md:mb-0">
              <div className="hidden md:flex flex-wrap gap-1.5">
                <StatChip
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Total"
                  value={String(totalItems)}
                  color="text-foreground"
                />
                <StatChip
                  icon={<Timer className="h-3.5 w-3.5 text-amber-500" />}
                  label="Em atend."
                  value={String(emAtendimento)}
                  color="text-amber-600"
                />
                <StatChip
                  icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                  label="Concluídos"
                  value={String(concluidos)}
                  color="text-green-600"
                />
                <StatChip
                  icon={<Users className="h-3.5 w-3.5 text-blue-500" />}
                  label="Pendentes"
                  value={String(pendentes)}
                  color="text-blue-600"
                />
              </div>
              <div className="hidden md:block w-px h-6 bg-border mx-0.5" />
              <Link href={`/agenda/nova?data=${dataAtual}${outraFilial ? `&filial=${filial}` : ''}`}>
                <Button size="sm" className="h-8">
                  <Plus className="h-3.5 w-3.5 md:mr-1.5" />
                  <span className="hidden md:inline">Novo agendamento</span>
                  <span className="md:hidden ml-1">Agendar</span>
                </Button>
              </Link>
              <Link href="/tele-entregas/nova" className="hidden md:inline-block">
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tele-entrega
                </Button>
              </Link>
              <Link href="/prevendas/nova" className="hidden md:inline-block">
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Pré-venda
                </Button>
              </Link>
              <Button
                variant="outline" size="sm" className="h-8 hidden md:inline-flex"
                onClick={abrirVisualizacaoRapida} disabled={abrindoLista}
              >
                {abrindoLista
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <List className="h-3.5 w-3.5 mr-1.5" />}
                Visualização Rápida
              </Button>
              <div className="hidden md:inline-block">
                <GerenciarTecnicosDialog />
              </div>

              {/* Toggle Dia / Semana — desktop */}
              <div className="hidden md:relative md:inline-flex h-8 items-center rounded-full p-0.5 border border-white/40 bg-white/30 dark:bg-white/10 backdrop-blur-md shadow-inner">
                <span
                  className={cn(
                    'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full',
                    'bg-gradient-to-b from-white/90 to-white/60 dark:from-white/25 dark:to-white/10',
                    'shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.9)]',
                    'ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(.2,.9,.25,1)]',
                    periodo === 'semana' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0',
                  )}
                />
                <button
                  type="button"
                  onClick={() => mudarPeriodo('dia')}
                  className={cn(
                    'relative z-10 px-3 text-xs font-semibold transition-colors',
                    periodo === 'dia' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  title="Ver um dia"
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => mudarPeriodo('semana')}
                  className={cn(
                    'relative z-10 px-3 text-xs font-semibold transition-colors',
                    periodo === 'semana' ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  title="Ver a semana inteira"
                >
                  Semana
                </button>
              </div>

              {/* Toggle de visualização (liquid glass): por profissional x geral — desktop (só na visão Dia) */}
              {periodo === 'dia' && (
                <div className="hidden md:relative md:inline-flex h-8 items-center rounded-full p-0.5 border border-white/40 bg-white/30 dark:bg-white/10 backdrop-blur-md shadow-inner">
                  {/* Indicador deslizante de vidro */}
                  <span
                    className={cn(
                      'absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full',
                      'bg-gradient-to-b from-white/90 to-white/60 dark:from-white/25 dark:to-white/10',
                      'shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.9)]',
                      'ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(.2,.9,.25,1)]',
                      visualizacao === 'geral' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => mudarVisualizacao('profissional')}
                    className={cn(
                      'relative z-10 px-3 text-xs font-semibold transition-colors',
                      visualizacao === 'profissional' ? 'text-foreground' : 'text-muted-foreground',
                    )}
                    title="Uma coluna por profissional"
                  >
                    Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => mudarVisualizacao('geral')}
                    className={cn(
                      'relative z-10 px-3 text-xs font-semibold transition-colors',
                      visualizacao === 'geral' ? 'text-foreground' : 'text-muted-foreground',
                    )}
                    title="Todas as agendas do dia numa timeline única"
                  >
                    Geral
                  </button>
                </div>
              )}

              {/* Check: mostrar agendas com NF emitida — desktop */}
              <label className="hidden md:inline-flex items-center gap-1.5 h-8 px-2 rounded-md border border-input bg-background text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarNF}
                  onChange={(e) => mudarNF(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Mostrar NF emitida
              </label>

              {/* Filtro por tipo de serviço (multi-seleção, liquid glass) — desktop */}
              <div className="hidden md:block relative">
                <button
                  type="button"
                  onClick={() => setServMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 h-9 md:h-8 px-2.5 rounded-md border border-input bg-background text-xs font-medium hover:bg-muted transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Serviços{servicosSel.size > 0 ? ` (${servicosSel.size})` : ''}
                </button>
                {servMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[55]" onClick={() => setServMenuOpen(false)} />
                    <div className="absolute z-[56] mt-1 left-0 w-64 max-h-80 overflow-y-auto rounded-xl border border-white/40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-lg p-1.5">
                      <div className="flex items-center justify-between px-2 py-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tipos de serviço</span>
                        {servicosSel.size > 0 && (
                          <button onClick={() => setServicosSel(new Set())} className="text-[11px] text-primary hover:underline">Limpar</button>
                        )}
                      </div>
                      {servicosDisponiveis.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">Nenhum serviço no dia.</p>
                      ) : servicosDisponiveis.map((s) => (
                        <label key={s.nome} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={servicosSel.has(s.nome)}
                            onChange={() => toggleServico(s.nome)}
                            className="h-4 w-4 rounded border-input"
                          />
                          {s.cor && <span className="h-3 w-3 rounded-sm shrink-0 border border-black/10" style={{ background: s.cor }} />}
                          <span className="truncate">{s.nome}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Seletor de filial — desktop */}
              {filiais.length > 1 && (
                <div className="hidden md:block">
                  <Select
                    value={String(filial)}
                    onValueChange={(v) => navigate({ filial: Number(v) === filialHome ? null : v })}
                    items={filiais.map((f) => ({ value: String(f.id), label: f.nome }))}
                  >
                    <SelectTrigger className={cn('h-8 text-xs w-40', outraFilial && 'border-amber-400 text-amber-700 bg-amber-50 font-semibold')}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)} className="text-xs">{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Botão de filtro rápido no mobile (abre sidebar) */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex items-center gap-1 h-8 px-3 rounded-md border border-input bg-background text-xs font-medium hover:bg-muted transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
              </button>
            </div>
          </div>

          {/* ── Grid da agenda ── */}
          <div ref={timelineRef} className="flex-1 overflow-auto bg-muted/30 select-none p-2 md:p-3">
            {periodo === 'semana' && weekDays.length === 7 ? (
              /* ── Visão SEMANA: uma coluna por dia (Seg a Dom) ── */
              <div className="rounded-xl border border-border bg-card shadow-sm" style={{ minWidth: GUTTER_PX + 7 * COL_MIN_PX }}>
                {/* Cabeçalho: um dia por coluna */}
                <div className="flex sticky top-0 z-30 bg-card border-b border-border shadow-sm">
                  <div className="shrink-0" style={{ width: GUTTER_PX }} />
                  {weekDays.map((dia) => {
                    const ddmm = isoParaDDMM(dia.iso);
                    const qtd = filtrados.filter((i) => dataDDMM(i) === ddmm).length;
                    return (
                      <button
                        key={dia.iso}
                        type="button"
                        onClick={() => navigate({ data: dia.iso, periodo: null })}
                        title="Ver este dia isoladamente"
                        className={cn(
                          'flex-1 border-l px-2 py-2 text-center hover:bg-muted/40 transition-colors',
                          dia.isHoje && 'bg-primary/5',
                        )}
                        style={{ minWidth: COL_MIN_PX }}
                      >
                        <p className={cn('text-xs font-semibold', dia.isHoje && 'text-primary')}>
                          {dia.label} <span className="font-mono">{dia.diaMes}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{qtd} agend.</p>
                      </button>
                    );
                  })}
                </div>

                {/* Corpo: coluna de horários + 7 colunas de dias */}
                <div className="flex relative" style={{ height: (HOUR_END - HOUR_START + 1) * pxPerHour + 24 }}>
                  <div className="shrink-0 relative" style={{ width: GUTTER_PX }}>
                    {HOURS.map((h) => (
                      <span key={h} className="absolute left-1.5 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60" style={{ top: (h - HOUR_START) * pxPerHour + 12 }}>
                        {String(h).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>

                  {weekDays.map((dia) => {
                    const ddmm = isoParaDDMM(dia.iso);
                    const cards = layoutCards(filtrados.filter((i) => dataDDMM(i) === ddmm));
                    return (
                      <div
                        key={dia.iso}
                        className={cn('group/col flex-1 relative border-l border-border', dia.isHoje && 'bg-primary/[0.03]')}
                        style={{ minWidth: COL_MIN_PX }}
                        onDragOver={(e) => trackDragEmColuna(e, dia.iso)}
                        onDrop={(e) => handleTimelineDrop(e, dia.iso)}
                        onDragLeave={() => { setDragOverMins(null); setDragOverDia(null); }}
                      >
                        <button
                          type="button"
                          onClick={(e) => criarNoSlot(e, undefined, dia.iso)}
                          onMouseMove={(e) => setHoverSlot({ key: dia.iso, mins: minsFromEvent(e) })}
                          onMouseLeave={() => setHoverSlot((s) => (s?.key === dia.iso ? null : s))}
                          title="Clique para agendar neste horário"
                          className="absolute inset-0 z-0 w-full cursor-pointer"
                        />
                        {hoverSlot?.key === dia.iso && (
                          <div
                            className="absolute z-[5] rounded-md border border-primary/50 bg-primary/15 pointer-events-none flex items-center justify-center"
                            style={{ top: minsToTop(hoverSlot.mins, pxPerHour) + 12, height: pxPerHour / 2 - 2, left: 2, width: 40 }}
                            title={`Agendar às ${formatHHMM(hoverSlot.mins)}`}
                          >
                            <span className="text-xs font-bold text-primary/80 leading-none">+</span>
                          </div>
                        )}
                        {HOURS.map((h) => (
                          <div key={h}>
                            <div className="absolute left-0 right-0 border-t border-border pointer-events-none" style={{ top: (h - HOUR_START) * pxPerHour + 12 }} />
                            <div className="absolute left-0 right-0 border-t border-border/40 pointer-events-none" style={{ top: (h - HOUR_START) * pxPerHour + 12 + pxPerHour / 2 }} />
                          </div>
                        ))}
                        {dia.isHoje && nowMins >= HOUR_START * 60 && nowMins <= HOUR_END * 60 && (
                          <div className="absolute left-0 right-0 h-[2px] bg-red-500/70 z-20 pointer-events-none" style={{ top: minsToTop(nowMins, pxPerHour) + 12 }} />
                        )}
                        {dragItem && dragOverDia === dia.iso && dragOverMins !== null && (
                          <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: minsToTop(dragOverMins, pxPerHour) + 12 }}>
                            <div className="h-0.5 bg-primary" />
                            <span className="absolute -top-4 left-1 text-[10px] font-mono font-semibold text-primary bg-background/90 px-1 rounded">
                              {formatHHMM(dragOverMins)}
                            </span>
                          </div>
                        )}
                        {cards.map(({ item, startMins, endMins, col, totalCols }) => {
                          const top    = minsToTop(startMins, pxPerHour) + 12;
                          const height = Math.max(minsToTop(endMins, pxPerHour) - minsToTop(startMins, pxPerHour), 38);
                          return (
                            <div key={item.id} className="absolute z-10 px-0.5" style={{ top, height, left: `${(col / totalCols) * 100}%`, width: `${100 / totalCols}%` }}>
                              <CardAgendamento
                                item={item}
                                corServico={corPorServicoId[item.servico_id]}
                                isDragging={dragItem?.id === item.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onClick={(it) => { setSelectedItem(it); setMobileDetailOpen(true); }}
                                onDoubleClick={(it) => router.push(`/agenda/${it.id}/editar`)}
                                onContextMenu={(e, it) => setCtxMenu({ x: e.clientX, y: e.clientY, item: it })}
                                height={height}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : visualizacao === 'geral' ? (
              /* ── Visão GERAL: todas as agendas do dia numa timeline única ── */
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex sticky top-0 z-30 bg-card border-b border-border shadow-sm px-4 py-2.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Visão geral do dia — {filtrados.length} agendamento{filtrados.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex relative" style={{ height: (HOUR_END - HOUR_START + 1) * pxPerHour + 24 }}>
                  {/* Gutter de horários */}
                  <div className="shrink-0 relative" style={{ width: GUTTER_PX }}>
                    {HOURS.map((h) => (
                      <span key={h} className="absolute left-1.5 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60" style={{ top: (h - HOUR_START) * pxPerHour + 12 }}>
                        {String(h).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>
                  {/* Coluna única com todos os cards */}
                  <div
                    className="group/col flex-1 relative border-l border-border"
                    onDragOver={trackDragEmColuna}
                    onDrop={handleTimelineDrop}
                    onDragLeave={() => setDragOverMins(null)}
                  >
                    <button
                      type="button"
                      onClick={(e) => criarNoSlot(e)}
                      onMouseMove={(e) => setHoverSlot({ key: '__geral__', mins: minsFromEvent(e) })}
                      onMouseLeave={() => setHoverSlot((s) => (s?.key === '__geral__' ? null : s))}
                      title="Clique para agendar neste horário"
                      className="absolute inset-0 z-0 w-full cursor-pointer"
                    />
                    {HOURS.map((h) => (
                      <div key={h}>
                        <div className="absolute left-0 right-0 border-t border-border pointer-events-none" style={{ top: (h - HOUR_START) * pxPerHour + 12 }} />
                        <div className="absolute left-0 right-0 border-t border-border/40 pointer-events-none" style={{ top: (h - HOUR_START) * pxPerHour + 12 + pxPerHour / 2 }} />
                      </div>
                    ))}
                    {hoverSlot?.key === '__geral__' && (
                      <div
                        className="absolute z-[5] rounded-md border border-primary/50 bg-primary/15 pointer-events-none flex items-center justify-center"
                        style={{ top: minsToTop(hoverSlot.mins, pxPerHour) + 12, height: pxPerHour / 2 - 2, left: 2, width: 40 }}
                        title={`Agendar às ${formatHHMM(hoverSlot.mins)}`}
                      >
                        <span className="text-xs font-bold text-primary/80 leading-none">+</span>
                      </div>
                    )}
                    {showNow && (
                      <div className="absolute left-0 right-0 h-[2px] bg-red-500 z-20 pointer-events-none" style={{ top: minsToTop(nowMins, pxPerHour) + 12 }} />
                    )}
                    {/* Indicador de onde vai soltar ao arrastar */}
                    {dragItem && dragOverMins !== null && (
                      <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: minsToTop(dragOverMins, pxPerHour) + 12 }}>
                        <div className="h-0.5 bg-primary" />
                        <span className="absolute -top-4 left-1 text-[10px] font-mono font-semibold text-primary bg-background/90 px-1 rounded">
                          {formatHHMM(dragOverMins)}
                        </span>
                      </div>
                    )}
                    {layoutedCards.map(({ item, startMins, endMins, col, totalCols }) => {
                      const top    = minsToTop(startMins, pxPerHour) + 12;
                      const height = Math.max(minsToTop(endMins, pxPerHour) - minsToTop(startMins, pxPerHour), 38);
                      return (
                        <div key={item.id} className="absolute z-10 px-0.5" style={{ top, height, left: `calc(44px + ${col / totalCols} * (100% - 44px))`, width: `calc((100% - 44px) / ${totalCols})` }}>
                          <CardAgendamento
                            item={item}
                            corServico={corPorServicoId[item.servico_id]}
                            isDragging={dragItem?.id === item.id}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onClick={(it) => { setSelectedItem(it); setMobileDetailOpen(true); }}
                            onDoubleClick={(it) => router.push(`/agenda/${it.id}/editar`)}
                            onContextMenu={(e, it) => setCtxMenu({ x: e.clientX, y: e.clientY, item: it })}
                            height={height}
                          />
                        </div>
                      );
                    })}
                    {filtrados.length === 0 && (
                      <div className="absolute left-2 right-2 top-2 flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 shrink-0 opacity-40" />
                        {busca.trim() ? `Nenhum resultado para "${busca}".` : 'Nenhum agendamento para este dia. Clique num horário para criar.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : colunasProf.length === 0 ? (
              <div className="m-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0 opacity-40" />
                {busca.trim()
                  ? `Nenhum resultado para "${busca}".`
                  : 'Nenhum agendamento com previsão para este dia. Clique em "Novo agendamento" para criar.'}
              </div>
            ) : (
              <div
                className="rounded-xl border border-border bg-card shadow-sm"
                style={{ minWidth: GUTTER_PX + colunasProf.length * COL_MIN_PX }}
              >

                {/* Cabeçalho: um profissional por coluna (fixo no topo) */}
                <div className="flex sticky top-0 z-30 bg-card border-b border-border shadow-sm">
                  <div className="shrink-0" style={{ width: GUTTER_PX }} />
                  {colunasProf.map((c) => {
                    const qtd = filtrados.filter((i) => chaveProf(i) === c.key).length;
                    const iniciais = c.nome.split(/\s+/).slice(0, 2).map((p: string) => p[0] ?? '').join('').toUpperCase();
                    return (
                      <div key={c.key} className="group flex-1 border-l px-2 py-2.5 flex items-center gap-2" style={{ minWidth: COL_MIN_PX }}>
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold">
                          {iniciais || '—'}
                        </div>
                        {/* Clicar no nome fecha a agenda do técnico (grava OFF) */}
                        <button
                          type="button"
                          onClick={() => fecharAgendaTecnico(c.prof_id)}
                          disabled={!c.prof_id}
                          title={c.prof_id ? 'Fechar a agenda deste técnico (ele some do grid)' : undefined}
                          className="min-w-0 flex-1 text-left disabled:cursor-default"
                        >
                          <p className="text-xs font-semibold truncate leading-tight">{c.nome}</p>
                          <p className="text-[10px] text-muted-foreground">{qtd} agend.</p>
                        </button>
                        {c.prof_id && (
                          <button
                            type="button"
                            onClick={() => fecharAgendaTecnico(c.prof_id)}
                            title="Fechar agenda"
                            className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Corpo: coluna de horários + colunas de profissionais */}
                <div className="flex relative" style={{ height: (HOUR_END - HOUR_START + 1) * pxPerHour + 24 }}>

                  {/* Gutter de horários */}
                  <div className="shrink-0 relative" style={{ width: GUTTER_PX }}>
                    {HOURS.map((h) => (
                      <span
                        key={h}
                        className="absolute left-1.5 -translate-y-1/2 text-[11px] font-mono text-muted-foreground/60"
                        style={{ top: (h - HOUR_START) * pxPerHour + 12 }}
                      >
                        {String(h).padStart(2, '0')}:00
                      </span>
                    ))}
                  </div>

                  {/* Uma coluna por profissional */}
                  {colunasProf.map((c) => {
                    const cards = layoutCards(filtrados.filter((i) => chaveProf(i) === c.key));
                    return (
                      <div
                        key={c.key}
                        className="group/col flex-1 relative border-l border-border"
                        style={{ minWidth: COL_MIN_PX }}
                        onDragOver={trackDragEmColuna}
                        onDrop={handleTimelineDrop}
                        onDragLeave={() => setDragOverMins(null)}
                      >
                        {/* Camada clicável ao fundo: clicar em área vazia cria agendamento neste horário/profissional */}
                        <button
                          type="button"
                          onClick={(e) => criarNoSlot(e, c.prof_id)}
                          onMouseMove={(e) => setHoverSlot({ key: c.key, mins: minsFromEvent(e) })}
                          onMouseLeave={() => setHoverSlot((s) => (s?.key === c.key ? null : s))}
                          title="Clique para agendar neste horário"
                          className="absolute inset-0 z-0 w-full cursor-pointer"
                        />
                        {/* Realce do slot de 30 min sob o cursor */}
                        {hoverSlot?.key === c.key && (
                          <div
                            className="absolute z-[5] rounded-md border border-primary/50 bg-primary/15 pointer-events-none flex items-center justify-center"
                            style={{ top: minsToTop(hoverSlot.mins, pxPerHour) + 12, height: pxPerHour / 2 - 2, left: 2, width: 'calc(10% - 4px)' }}
                            title={`Agendar às ${formatHHMM(hoverSlot.mins)}`}
                          >
                            <span className="text-xs font-bold text-primary/80 leading-none">+</span>
                          </div>
                        )}
                        {/* Linhas de hora (sólidas) + meia-hora (mais leves) — estilo Google Agenda */}
                        {HOURS.map((h) => (
                          <div key={h}>
                            <div
                              className="absolute left-0 right-0 border-t border-border pointer-events-none"
                              style={{ top: (h - HOUR_START) * pxPerHour + 12 }}
                            />
                            <div
                              className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                              style={{ top: (h - HOUR_START) * pxPerHour + 12 + pxPerHour / 2 }}
                            />
                          </div>
                        ))}
                        {/* Linha de "agora" */}
                        {showNow && (
                          <div className="absolute left-0 right-0 h-[2px] bg-red-500/70 z-20 pointer-events-none" style={{ top: minsToTop(nowMins, pxPerHour) + 12 }} />
                        )}
                        {/* Indicador de onde vai soltar ao arrastar */}
                        {dragItem && dragOverMins !== null && (
                          <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: minsToTop(dragOverMins, pxPerHour) + 12 }}>
                            <div className="h-0.5 bg-primary" />
                            <span className="absolute -top-4 left-1 text-[10px] font-mono font-semibold text-primary bg-background/90 px-1 rounded">
                              {formatHHMM(dragOverMins)}
                            </span>
                          </div>
                        )}
                        {/* Cards do profissional */}
                        {cards.map(({ item, startMins, endMins, col, totalCols }) => {
                          const top    = minsToTop(startMins, pxPerHour) + 12;
                          const height = Math.max(minsToTop(endMins, pxPerHour) - minsToTop(startMins, pxPerHour), 38);
                          return (
                            <div
                              key={item.id}
                              className="absolute z-10 px-0.5"
                              style={{ top, height, left: `${10 + (col / totalCols) * 90}%`, width: `${90 / totalCols}%` }}
                            >
                              <CardAgendamento
                                item={item}
                                corServico={corPorServicoId[item.servico_id]}
                                isDragging={dragItem?.id === item.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onClick={(it) => { setSelectedItem(it); setMobileDetailOpen(true); }}
                                onDoubleClick={(it) => router.push(`/agenda/${it.id}/editar`)}
                                onContextMenu={(e, it) => setCtxMenu({ x: e.clientX, y: e.clientY, item: it })}
                                height={height}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Painel de detalhes — Desktop: sidebar direita / Mobile: bottom-sheet ── */}
        {selectedItem && (
          <>
            {/* Overlay do bottom-sheet no mobile */}
            <div
              className={cn(
                'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
                mobileDetailOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
              onClick={() => { setMobileDetailOpen(false); setSelectedItem(null); }}
            />
            {/* Desktop: painel lateral normal */}
            <div className="hidden md:flex md:min-h-0">
              <DetailPanel
                item={selectedItem}
                corServico={corPorServicoId[selectedItem.servico_id]}
                profissionais={profissionais}
                servicos={servicos ?? []}
                vendedores={vendedores}
                onClose={() => setSelectedItem(null)}
                onItemUpdate={(updated) => setSelectedItem(updated)}
              />
            </div>
            {/* Mobile: bottom-sheet deslizante de baixo */}
            <div
              className={cn(
                'fixed inset-x-0 bottom-0 z-50 md:hidden bg-background rounded-t-2xl shadow-2xl border-t',
                'transition-transform duration-300 ease-in-out',
                'max-h-[85vh] overflow-y-auto',
                mobileDetailOpen ? 'translate-y-0' : 'translate-y-full',
              )}
            >
              {/* Alça visual do bottom-sheet */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <DetailPanel
                item={selectedItem}
                corServico={corPorServicoId[selectedItem.servico_id]}
                profissionais={profissionais}
                servicos={servicos ?? []}
                vendedores={vendedores}
                onClose={() => { setMobileDetailOpen(false); setSelectedItem(null); }}
                onItemUpdate={(updated) => setSelectedItem(updated)}
              />
            </div>
          </>
        )}

      </div>

      {/* ── Menu de contexto (botão direito): trocar status ── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div
            className="fixed z-[61] w-52 rounded-lg border bg-popover shadow-lg py-1 text-sm"
            style={{ top: Math.min(ctxMenu.y, window.innerHeight - 340), left: Math.min(ctxMenu.x, window.innerWidth - 220) }}
          >
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b truncate">
              {ctxMenu.item.animal} — mudar status
            </div>
            {SITUACOES.map((s) => (
              <button
                key={s}
                onClick={() => aplicarSituacao(ctxMenu.item, s)}
                className="block w-full text-left px-3 py-1.5 hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Dialog de confirmação ── */}
      <Dialog open={!!pendente} onOpenChange={(open) => { if (!open && !isSalvando) cancelarReschedule(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Alterar Horário
            </DialogTitle>
          </DialogHeader>

          {pendente && (
            <div className="space-y-3 py-1">
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Pet:</span> <span className="font-medium">{pendente.item.animal}</span></p>
                <p><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{pendente.item.cliente}</span></p>
                <p>
                  <span className="text-muted-foreground">Horário atual:</span>{' '}
                  <span className="font-medium line-through text-muted-foreground">
                    {(pendente.item.data_previsao?.split(' ')[1] ?? pendente.item.hora ?? '').slice(0, 5)}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Novo horário:</span>{' '}
                  <span className="font-bold text-primary">{fmtHora(pendente.novaHora)}</span>
                  {dataDDMM(pendente.item) !== isoParaDDMM(pendente.novaData) && (
                    <span className="font-bold text-primary"> — {isoParaDDMM(pendente.novaData)}</span>
                  )}
                </p>
              </div>

              <p className="text-sm text-center">
                Deseja alterar para <strong>{fmtHora(pendente.novaHora)}</strong>
                {dataDDMM(pendente.item) !== isoParaDDMM(pendente.novaData) && (
                  <> do dia <strong>{isoParaDDMM(pendente.novaData)}</strong></>
                )}?
              </p>

              {erroReschedule && (
                <p className="text-xs text-red-600 text-center">{erroReschedule}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelarReschedule} disabled={isSalvando}>
              Não
            </Button>
            <Button onClick={confirmarReschedule} disabled={isSalvando}>
              {isSalvando ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : 'Sim, alterar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Chip de estatística ────────────────────────────────────────────────────────

function StatChip({
  icon, label, value, color, highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 h-8 text-xs',
      highlight ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border',
    )}>
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-semibold', color)}>{value}</span>
    </div>
  );
}
