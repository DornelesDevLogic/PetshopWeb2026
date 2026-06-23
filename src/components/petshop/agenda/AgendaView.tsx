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
  X, Users, CheckCircle2, Timer, Phone, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { reagendarHorario } from '@/app/(petshop)/agenda/[id]/actions';

interface Props {
  items:                AgendaItem[];
  profissionais:        Profissional[];
  servicos?:            Servico[];
  vendedores?:          Vendedor[];
  dataAtual:            string;
  profissionalIdAtual:  string;
  statusAtual:          string;
}

// ── constantes da grade ──────────────────────────────────────────────────────
const PX_PER_HOUR = 88;   // pixels por hora na timeline
const HOUR_START  = 7;
const HOUR_END    = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START);

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

function minsToTop(mins: number): number {
  return ((mins - HOUR_START * 60) / 60) * PX_PER_HOUR;
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
                'h-8 w-full rounded-full text-xs font-medium transition-colors flex items-center justify-center',
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
  height?:     number;
}

function CardAgendamento({ item, corServico, isDragging, onDragStart, onDragEnd, onClick, height }: CardProps) {
  const compact = (height ?? 80) < 70;
  const info = STATUS_AGENDA[item.status] ?? { label: String(item.status), color: '' };
  const podeArrastar = item.status === 1 || item.status === 2;

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
      className={cn(
        'h-full rounded-lg border px-2.5 py-1.5 text-xs hover:shadow-md transition-shadow bg-card cursor-pointer overflow-hidden text-gray-900',
        bgMap[item.status] ?? 'border-border',
        isDragging && 'opacity-30 scale-95',
        podeArrastar && 'cursor-grab active:cursor-grabbing',
      )}
      style={corServico ? { borderLeft: `4px solid ${corServico}` } : undefined}
    >
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
    <aside className="w-[340px] shrink-0 border-l bg-background flex flex-col overflow-y-auto">
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
        <Link href={`/agenda/${item.id}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            Ver detalhes completos
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>

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
  items, profissionais, servicos, vendedores = [], dataAtual, profissionalIdAtual, statusAtual,
}: Props) {
  const router = useRouter();

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
  const [, startTransition]       = useTransition();

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

  // ── Drag & Drop ──
  const [dragItem, setDragItem]           = useState<AgendaItem | null>(null);
  const [dragOverMins, setDragOverMins]   = useState<number | null>(null);
  const timelineRef                       = useRef<HTMLDivElement>(null);

  // ── Confirmação de reagendamento ──
  interface Pendente {
    item:             AgendaItem;
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
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/agenda?' + sp.toString()));
  }

  function goDay(iso: string) { navigate({ data: iso }); }

  // Filtro por busca
  const filtrados = (items ?? []).filter(
    (i) =>
      !busca.trim() ||
      i.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      i.animal.toLowerCase().includes(busca.toLowerCase()),
  );

  // Layout com posicionamento absoluto
  const layoutedCards = layoutCards(filtrados);

  const dataSel  = new Date(dataAtual + 'T00:00:00');
  const labelDia = dataSel.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

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
  }

  const trackDragPos = useCallback((e: React.DragEvent) => {
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y    = e.clientY - rect.top + el.scrollTop;
    const rawMins = HOUR_START * 60 + Math.round((y / PX_PER_HOUR) * 60 / 15) * 15;
    const clamped = Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, rawMins));
    setDragOverMins(clamped);
  }, []);

  function handleTimelineDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!dragItem || dragOverMins === null) { setDragItem(null); return; }

    const startMins = parseTimeMins(dragItem.data_previsao);
    if (startMins === dragOverMins) { setDragItem(null); setDragOverMins(null); return; }

    const endRaw     = parseTimeMins(dragItem.data_entrega);
    const duracaoMin = (startMins !== null && endRaw && endRaw > startMins)
      ? endRaw - startMins : 60;

    const novaHora         = formatHHMM(dragOverMins);
    const novaDataPrevisao = `${dataAtual}T${novaHora}:00`;
    const entMins          = dragOverMins + duracaoMin;
    const novaDataEntrega  = `${dataAtual}T${formatHHMM(entMins)}:00`;

    setPendente({ item: dragItem, novaHora, novaDataPrevisao, novaDataEntrega });
    setDragItem(null);
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
        dataAtual,
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

      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 border-r bg-background flex flex-col overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-semibold flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Agenda
            </h1>
            <Link href="/agenda/nova">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo
              </Button>
            </Link>
          </div>

          <MiniCalendario dataSel={dataAtual} onSelectDay={goDay} />

          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => goDay(hojeISO())}>
            Hoje
          </Button>

          <Link href="/agenda/lista" className="block mt-2">
            <Button variant="outline" size="sm" className="w-full">
              <List className="h-3.5 w-3.5 mr-1.5" />
              Visualização Rápida
            </Button>
          </Link>
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
      <div className="flex-1 flex overflow-hidden">

        {/* ── Coluna da timeline ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header da data + navegação */}
          <div className="border-b bg-background px-6 py-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-semibold capitalize">{labelDia}</p>
                {dragItem && (
                  <p className="text-xs text-primary font-medium animate-pulse">
                    Arraste para um horário...
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(addDias(dataAtual, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(addDias(dataAtual, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ── Barra de estatísticas ── */}
            <div className="flex flex-wrap gap-2 mb-3">
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

            {/* ── Barra de ações rápidas ── */}
            <div className="flex flex-wrap gap-2">
              <Link href={`/agenda/nova?data=${dataAtual}`}>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Novo agendamento
                </Button>
              </Link>
              <Link href="/tele-entregas/nova">
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tele-entrega
                </Button>
              </Link>
              <Link href="/prevendas/nova">
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Pré-venda
                </Button>
              </Link>
            </div>
          </div>

          {/* ── Timeline absoluta ── */}
          <div
            ref={timelineRef}
            className="flex-1 overflow-y-auto bg-background select-none"
            onDragOver={(e) => { if (dragItem) { e.preventDefault(); trackDragPos(e); } }}
            onDrop={handleTimelineDrop}
            onDragLeave={() => setDragOverMins(null)}
          >
            <div
              className="relative"
              style={{ height: (HOUR_END - HOUR_START + 1) * PX_PER_HOUR + 24 }}
            >
              {/* Linhas de hora */}
              {HOURS.map((h, idx) => {
                const top = (h - HOUR_START) * PX_PER_HOUR + 12;
                const nextH = HOURS[idx + 1];
                // nextH is referenced to suppress unused warning but not used in rendering
                void nextH;
                return (
                  <div key={h}>
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-border/60 pointer-events-none"
                      style={{ top }}
                    >
                      <span className="absolute -top-3 left-2 text-[11px] font-mono text-muted-foreground/60 select-none">
                        {String(h).padStart(2, '0')}:00
                      </span>
                    </div>
                    {!dragItem && (
                      <HoraBotao
                        hora={`${String(h).padStart(2, '0')}:00`}
                        href={`/agenda/nova?data=${dataAtual}&hora=${String(h).padStart(2, '0')}:00`}
                        top={top}
                      />
                    )}
                  </div>
                );
              })}

              {/* ── Linha de hora atual ── */}
              {showNow && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: minsToTop(nowMins) + 12 }}
                >
                  <div className="relative flex items-center">
                    <span className="absolute left-2 -top-3 text-[11px] font-mono text-red-500 bg-background px-1 rounded font-semibold">
                      {formatHHMM(nowMins)}
                    </span>
                    <div className="absolute left-16 right-0 h-[2px] bg-red-500" />
                    <div className="absolute left-14 h-3 w-3 rounded-full bg-red-500 -top-1.5" />
                  </div>
                </div>
              )}

              {/* Indicador de drop em tempo real */}
              {dragOverMins !== null && dragItem && (
                <div
                  className="absolute left-16 right-2 h-0.5 bg-primary z-30 pointer-events-none"
                  style={{ top: minsToTop(dragOverMins) + 12 }}
                >
                  <span className="absolute -top-3 right-0 text-[11px] text-primary font-mono bg-background px-1 rounded">
                    {formatHHMM(dragOverMins)}
                  </span>
                </div>
              )}

              {/* Cards posicionados absolutamente */}
              {layoutedCards.map(({ item, startMins, endMins, col, totalCols }) => {
                const top    = minsToTop(startMins) + 12;
                const height = Math.max(minsToTop(endMins) - minsToTop(startMins), 40);
                return (
                  <div
                    key={item.id}
                    className="absolute z-10"
                    style={{
                      top,
                      height,
                      left:  `calc(64px + ${(col / totalCols) * 100}% - ${(col / totalCols) * 64}px)`,
                      width: `calc((100% - 68px) / ${totalCols} - 4px)`,
                    }}
                  >
                    <CardAgendamento
                      item={item}
                      corServico={corPorServicoId[item.servico_id]}
                      isDragging={dragItem?.id === item.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={setSelectedItem}
                      height={height}
                    />
                  </div>
                );
              })}

              {/* Estado vazio */}
              {filtrados.length === 0 && (
                <div className="absolute left-16 right-4 top-3 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0 opacity-40" />
                  {busca.trim()
                    ? `Nenhum resultado para "${busca}".`
                    : 'Nenhum agendamento com previsão para este dia. Clique em um horário para criar.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Painel de detalhes ── */}
        {selectedItem && (
          <DetailPanel
            item={selectedItem}
            corServico={corPorServicoId[selectedItem.servico_id]}
            profissionais={profissionais}
            servicos={servicos ?? []}
            vendedores={vendedores}
            onClose={() => setSelectedItem(null)}
            onItemUpdate={(updated) => setSelectedItem(updated)}
          />
        )}
      </div>

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
                </p>
              </div>

              <p className="text-sm text-center">
                Deseja alterar o horário para <strong>{fmtHora(pendente.novaHora)}</strong>?
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
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
      highlight ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border',
    )}>
      {icon}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-semibold', color)}>{value}</span>
    </div>
  );
}
