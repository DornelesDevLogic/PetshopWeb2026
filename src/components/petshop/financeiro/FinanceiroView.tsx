'use client';

import { useRouter } from 'next/navigation';
import { ContaReceber, ContaReceberTotais } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';

interface Props {
  contas:      ContaReceber[];
  totais:      ContaReceberTotais;
  dataDe:      string;
  dataAte:     string;
  statusAtual: string;
  tipoData:    string;
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

const hoje = new Date().toISOString().split('T')[0];

function statusBaixaInfo(c: ContaReceber) {
  if (c.status_baixa === 2) return { label: 'Pago',    color: 'bg-green-100 text-green-700 border-green-200' };
  if (c.status_baixa === 3) return { label: 'Parcial', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  // aberto
  const venc = c.dt_vencimento.split('T')[0] || c.dt_vencimento;
  const vencida = venc < hoje;
  return {
    label: vencida ? 'Vencida' : 'Aberta',
    color: vencida
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200',
  };
}

export default function FinanceiroView({
  contas, totais, dataDe, dataAte, statusAtual, tipoData,
}: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [, startTransition] = useTransition();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data_de',   dataDe);
    sp.set('data_ate',  dataAte);
    sp.set('tipo_data', tipoData);
    if (statusAtual) sp.set('status', statusAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/financeiro?' + sp.toString()));
  }

  const filtrados = busca.trim()
    ? contas.filter((c) => c.cliente.toLowerCase().includes(busca.toLowerCase()))
    : contas;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Financeiro — Contas a Receber
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vencimento: {fmtData(dataDe)} — {fmtData(dataAte)}
            </p>
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

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Registros</p>
            <p className="text-lg font-semibold">{totais.total}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Original</p>
            <p className="text-lg font-semibold">{fmtMoeda(totais.total_valor)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Saldo a Receber</p>
            <p className="text-lg font-semibold text-primary">{fmtMoeda(totais.total_saldo)}</p>
          </div>
        </div>

        {/* Filtros */}
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
              <SelectItem value="A">Em aberto</SelectItem>
              <SelectItem value="P">Pagos</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={tipoData}
            onValueChange={(v) => { if (v) navigate({ tipo_data: v }); }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo de data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vencimento">Vencimento</SelectItem>
              <SelectItem value="emissao">Emissão</SelectItem>
              <SelectItem value="prorrogacao">Prorrogação</SelectItem>
            </SelectContent>
          </Select>

          <span className="ml-auto text-sm text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? 'conta' : 'contas'}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma conta no período.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Doc/Parc</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Histórico</TableHead>
                  <TableHead className="w-28">Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => {
                  const info = statusBaixaInfo(c);
                  return (
                    <TableRow key={`${c.nro_doc}-${c.parcela}-${c.filial}`} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {c.nro_doc}/{c.parcela}
                      </TableCell>
                      <TableCell className="font-medium">{c.cliente}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                        {c.historico || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{fmtData(c.dt_vencimento)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtMoeda(c.valor)}</TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell text-muted-foreground">
                        {c.val_pag > 0 ? fmtMoeda(c.val_pag) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmtMoeda(c.saldo)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', info.color)}>
                          {info.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
