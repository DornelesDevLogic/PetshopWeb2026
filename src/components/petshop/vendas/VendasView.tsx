'use client';

import { useRouter } from 'next/navigation';
import { Prevenda, STATUS_PREVENDA } from '@/types/petshop';
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
import { ShoppingCart, Plus, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Props {
  items:      Prevenda[];
  dataDe:     string;
  dataAte:    string;
  statusAtual:string;
}

function StatusBadge({ status }: { status: number }) {
  const info = STATUS_PREVENDA[status] ?? { label: String(status), color: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', info.color)}>
      {info.label}
    </span>
  );
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return v > 0 ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
}

export default function VendasView({ items, dataDe, dataAte, statusAtual }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [, startTransition] = useTransition();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data_de',  dataDe);
    sp.set('data_ate', dataAte);
    if (statusAtual) sp.set('status', statusAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/vendas?' + sp.toString()));
  }

  const filtrados = (items ?? []).filter(
    (i) => !busca.trim() || i.cliente.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Vendas / Pré-vendas
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {fmtData(dataDe)} — {fmtData(dataAte)}
              </p>
            </div>
            <Link href="/vendas/nova">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova
              </Button>
            </Link>
          </div>

          {/* Filtro período */}
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

        <div className="flex items-center gap-3 mt-4">
          <Input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="max-w-xs"
          />

          <Select
            value={statusAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ status: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="1">Em aberto</SelectItem>
              <SelectItem value="2">Confirmado</SelectItem>
              <SelectItem value="3">Finalizado</SelectItem>
              <SelectItem value="4">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-sm text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? 'venda' : 'vendas'}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma venda no período.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Forma Pgto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((item) => (
                  <TableRow key={`${item.id}-${item.filial}`} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                    <TableCell className="font-mono text-sm">{fmtData(item.data)}</TableCell>
                    <TableCell className="font-medium">{item.cliente}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {item.formapgto || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {fmtMoeda(item.sub_total || item.valor)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/vendas/${item.id}`}>
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
