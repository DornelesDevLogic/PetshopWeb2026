'use client';

import { useRouter } from 'next/navigation';
import { Consulta, Profissional } from '@/types/petshop';
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
import { Stethoscope, Plus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Props {
  items:        Consulta[];
  profissionais:Profissional[];
  dataDe:       string;
  dataAte:      string;
  statusAtual:  string;
  profIdAtual:  string;
}

const STATUS_COLOR: Record<string, string> = {
  ABERTO:  'bg-blue-100 text-blue-700 border-blue-200',
  FECHADO: 'bg-green-100 text-green-700 border-green-200',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = status === 'ABERTO' ? 'Aberto' : status === 'FECHADO' ? 'Fechado' : status;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', color)}>
      {label}
    </span>
  );
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

export default function ConsultasView({
  items, profissionais, dataDe, dataAte, statusAtual, profIdAtual,
}: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [, startTransition] = useTransition();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data_de',  dataDe);
    sp.set('data_ate', dataAte);
    if (statusAtual) sp.set('status',   statusAtual);
    if (profIdAtual) sp.set('prof_id',  profIdAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/consultas?' + sp.toString()));
  }

  const filtrados = (items ?? []).filter(
    (i) =>
      !busca.trim() ||
      i.animal.toLowerCase().includes(busca.toLowerCase()) ||
      i.proprietario.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Consultas
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {fmtData(dataDe)} — {fmtData(dataAte)}
              </p>
            </div>
            <Link href="/consultas/nova">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova
              </Button>
            </Link>
          </div>

          {/* Filtro de período */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dataDe}
              className="w-36"
              onChange={(e) => navigate({ data_de: e.target.value })}
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={dataAte}
              className="w-36"
              onChange={(e) => navigate({ data_ate: e.target.value })}
            />
          </div>
        </div>

        {/* Filtros linha 2 */}
        <div className="flex items-center gap-3 mt-4">
          <Input
            placeholder="Buscar animal ou proprietário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-xs"
          />

          <Select
            value={profIdAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ prof_id: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Veterinário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os veterinários</SelectItem>
              {(profissionais ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ status: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ABERTO">Aberto</SelectItem>
              <SelectItem value="FECHADO">Fechado</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-sm text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? 'consulta' : 'consultas'}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma consulta no período.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead className="hidden md:table-cell">Veterinário</TableHead>
                  <TableHead className="hidden lg:table-cell">Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item) => (
                  <TableRow key={`${item.id}-${item.filial}`} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{fmtData(item.data)}</TableCell>
                    <TableCell className="font-medium">{item.animal}</TableCell>
                    <TableCell>{item.proprietario}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {item.veterinario || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {item.motivo || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <Link href={`/consultas/${item.id}`}>
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
