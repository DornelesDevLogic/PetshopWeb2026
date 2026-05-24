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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, CalendarDays, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Props {
  items: AgendaItem[];
  profissionais: Profissional[];
  dataAtual: string;       // YYYY-MM-DD
  profissionalIdAtual: string;
  statusAtual: string;
}

/** Formata YYYY-MM-DD para exibição DD/MM/YYYY */
function fmtData(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (d) return `${d}/${m}/${y}`;
  // Se vier no formato DD/MM/YYYY do backend, retorna direto
  return iso;
}

/** Adiciona ou subtrai N dias de uma data YYYY-MM-DD */
function addDias(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

/** Dia da semana em pt-BR */
function diaSemana(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function StatusBadge({ status }: { status: number }) {
  const info = STATUS_AGENDA[status] ?? { label: String(status), color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', info.color)}>
      {info.label}
    </span>
  );
}

export default function AgendaView({ items, profissionais, dataAtual, profissionalIdAtual, statusAtual }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [, startTransition] = useTransition();

  function navigate(params: Record<string, string | null | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data', dataAtual);
    if (profissionalIdAtual) sp.set('profissional_id', profissionalIdAtual);
    if (statusAtual) sp.set('status', statusAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/agenda?' + sp.toString()));
  }

  // Filtro client-side por nome de cliente/animal
  const filtrados = busca.trim()
    ? items.filter(
        (i) =>
          i.cliente.toLowerCase().includes(busca.toLowerCase()) ||
          i.animal.toLowerCase().includes(busca.toLowerCase())
      )
    : items;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Agenda
            </h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">
              {diaSemana(dataAtual)}, {fmtData(dataAtual)}
            </p>
          </div>

          {/* Navegação de data */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate({ data: addDias(dataAtual, -1) })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={dataAtual}
              className="w-40"
              onChange={(e) => navigate({ data: e.target.value })}
            />
            <Button variant="outline" size="icon" onClick={() => navigate({ data: addDias(dataAtual, 1) })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ data: new Date().toISOString().split('T')[0] })}
            >
              Hoje
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mt-4">
          <Input
            placeholder="Buscar cliente ou animal..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-xs"
          />

          <Select
            value={profissionalIdAtual || 'todos'}
            onValueChange={(v) => navigate({ profissional_id: v === 'todos' ? '' : v })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os profissionais</SelectItem>
              {profissionais.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusAtual || 'todos'}
            onValueChange={(v) => navigate({ status: v === 'todos' ? '' : v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="1">Agendado</SelectItem>
              <SelectItem value="2">Em atendimento</SelectItem>
              <SelectItem value="3">Finalizado</SelectItem>
              <SelectItem value="4">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-sm text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? 'agendamento' : 'agendamentos'}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum agendamento para este dia.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead className="hidden md:table-cell">Raça</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="hidden lg:table-cell">Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item) => (
                  <TableRow key={`${item.id}-${item.filial}`} className="hover:bg-gray-50 cursor-pointer">
                    <TableCell className="font-mono text-sm font-medium">
                      {item.hora?.slice(0, 5) ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium leading-tight">{item.cliente}</div>
                    </TableCell>
                    <TableCell>
                      <div className="leading-tight">{item.animal}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {item.raca || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{item.servico}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {item.profissional || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm">
                      {item.sub_total
                        ? `R$ ${Number(item.sub_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/agenda/${item.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
