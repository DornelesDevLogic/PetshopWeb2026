'use client';

import { useRouter } from 'next/navigation';
import { AgendaItem, Profissional, STATUS_AGENDA } from '@/types/petshop';
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
  ChevronLeft, ChevronRight, CalendarDays, Eye, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Props {
  items:                AgendaItem[];
  profissionais:        Profissional[];
  dataAtual:            string;       // YYYY-MM-DD
  profissionalIdAtual:  string;
  statusAtual:          string;
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

/** Calcula os dias do grid mensal (incluindo dias do mês anterior/seguinte para completar semanas) */
function diasDoGrid(year: number, month: number): { iso: string; outroMes: boolean }[] {
  const primeiro = new Date(year, month, 1).getDay(); // 0=Dom
  const ultimo   = new Date(year, month + 1, 0).getDate();
  const days: { iso: string; outroMes: boolean }[] = [];

  // dias do mês anterior
  const mesAnterior = month === 0 ? 11 : month - 1;
  const anoAnterior = month === 0 ? year - 1 : year;
  const ultimoAnterior = new Date(anoAnterior, mesAnterior + 1, 0).getDate();
  for (let i = primeiro - 1; i >= 0; i--) {
    days.push({ iso: isoFromYMD(anoAnterior, mesAnterior, ultimoAnterior - i), outroMes: true });
  }

  // dias do mês atual
  for (let d = 1; d <= ultimo; d++) {
    days.push({ iso: isoFromYMD(year, month, d), outroMes: false });
  }

  // completar até 42 células (6 semanas)
  const proximo      = month === 11 ? 0  : month + 1;
  const anoProximo   = month === 11 ? year + 1 : year;
  let nextDay = 1;
  while (days.length < 42) {
    days.push({ iso: isoFromYMD(anoProximo, proximo, nextDay++), outroMes: true });
  }
  return days;
}

// ── Mini Calendário ───────────────────────────────────────────────────────────

function MiniCalendario({
  dataSel, onSelectDay,
}: {
  dataSel: string;
  onSelectDay: (iso: string) => void;
}) {
  const [y0, m0] = dataSel.split('-').map(Number);
  const [viewYear,  setViewYear]  = useState(y0);
  const [viewMonth, setViewMonth] = useState(m0 - 1); // 0-indexed

  function prevMes() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMes() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const hoje  = hojeISO();
  const grid  = diasDoGrid(viewYear, viewMonth);

  return (
    <div className="select-none">
      {/* cabeçalho do mês */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMes} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {MESES_PT[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMes} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* cabeçalho dos dias */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA_ABREV.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* células */}
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

// ── Timeline de horas ─────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07 – 21

function horaParaInt(hora: string): number {
  return parseInt(hora?.split(':')[0] ?? '0', 10);
}

function CardAgendamento({ item }: { item: AgendaItem }) {
  const info = STATUS_AGENDA[item.status] ?? { label: String(item.status), color: '' };
  const corDot: Record<number, string> = {
    1: 'bg-blue-500', 2: 'bg-amber-500', 3: 'bg-green-500', 4: 'bg-red-500',
  };
  return (
    <Link href={`/agenda/${item.id}`} className="block">
      <div className={cn(
        'rounded-lg border px-3 py-2 text-xs hover:shadow-md transition-shadow cursor-pointer bg-white',
        item.status === 1 && 'border-blue-200  bg-blue-50',
        item.status === 2 && 'border-amber-200 bg-amber-50',
        item.status === 3 && 'border-green-200 bg-green-50',
        item.status === 4 && 'border-red-200   bg-red-50   opacity-60',
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn('h-2 w-2 rounded-full shrink-0', corDot[item.status] ?? 'bg-gray-400')} />
          <span className="font-semibold truncate">{item.hora?.slice(0, 5)}</span>
          <span className={cn(
            'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold border',
            info.color,
          )}>
            {info.label}
          </span>
        </div>
        <p className="font-medium truncate">{item.animal}</p>
        <p className="text-muted-foreground truncate">{item.cliente}</p>
        <p className="text-muted-foreground truncate">{item.servico}</p>
        {item.profissional && (
          <p className="text-muted-foreground/80 truncate mt-0.5">👤 {item.profissional}</p>
        )}
      </div>
    </Link>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AgendaView({
  items, profissionais, dataAtual, profissionalIdAtual, statusAtual,
}: Props) {
  const router = useRouter();
  const [busca, setBusca]         = useState('');
  const [, startTransition]       = useTransition();

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

  // Agrupar por hora
  const porHora: Record<number, AgendaItem[]> = {};
  for (const item of filtrados) {
    const h = horaParaInt(item.hora);
    if (!porHora[h]) porHora[h] = [];
    porHora[h].push(item);
  }

  // label do dia selecionado
  const dataSel    = new Date(dataAtual + 'T00:00:00');
  const labelDia   = dataSel.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar esquerda ── */}
      <aside className="w-72 shrink-0 border-r bg-white flex flex-col overflow-y-auto">
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

          {/* Mini calendário */}
          <MiniCalendario dataSel={dataAtual} onSelectDay={goDay} />

          {/* Botão Hoje */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => goDay(hojeISO())}
          >
            Hoje
          </Button>
        </div>

        {/* Filtros */}
        <div className="p-4 space-y-3 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros</p>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Profissional</label>
            <Select
              value={profissionalIdAtual || 'todos'}
              onValueChange={(v) => navigate({ profissional_id: v === 'todos' ? '' : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(profissionais ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={statusAtual || 'todos'}
              onValueChange={(v) => navigate({ status: v === 'todos' ? '' : v })}
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
        </div>
      </aside>

      {/* ── Área principal: timeline ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header do dia */}
        <div className="border-b bg-white px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-base font-semibold capitalize">{labelDia}</p>
            <p className="text-xs text-muted-foreground">
              {filtrados.length} {filtrados.length === 1 ? 'agendamento' : 'agendamentos'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => goDay(addDias(dataAtual, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => goDay(addDias(dataAtual, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CalendarDays className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Nenhum agendamento para este dia.</p>
              <p className="text-xs mt-1">Selecione outro dia ou clique em + Novo.</p>
            </div>
          ) : (
            <div className="p-4 space-y-0">
              {HOURS.map((h) => {
                const appts = porHora[h] ?? [];
                const hasAppts = appts.length > 0;
                return (
                  <div key={h} className="flex gap-3 min-h-[64px]">
                    {/* Coluna de hora */}
                    <div className="w-14 shrink-0 pt-2 text-right">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(h).padStart(2, '0')}:00
                      </span>
                    </div>

                    {/* Linha separadora + conteúdo */}
                    <div className="flex-1 border-t border-dashed border-gray-200 pt-2 pb-2">
                      {hasAppts ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {appts.map((item) => (
                            <CardAgendamento key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-full" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Slots fora do range 07-21 */}
              {Object.entries(porHora)
                .filter(([h]) => Number(h) < 7 || Number(h) > 21)
                .flatMap(([, appts]) => appts)
                .length > 0 && (
                <div className="flex gap-3">
                  <div className="w-14 shrink-0 pt-2 text-right">
                    <span className="text-xs text-muted-foreground">outros</span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-gray-200 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(porHora)
                        .filter(([h]) => Number(h) < 7 || Number(h) > 21)
                        .flatMap(([, appts]) => appts)
                        .map((item) => <CardAgendamento key={item.id} item={item} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
