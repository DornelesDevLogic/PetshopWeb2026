'use client';

import Link from 'next/link';
import { SaldoCliente } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  saldos: SaldoCliente[];
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function SaldosView({ saldos }: Props) {
  const [busca, setBusca] = useState('');

  const filtrados = (saldos ?? []).filter(
    (s) => !busca.trim() || s.cliente.toLowerCase().includes(busca.toLowerCase()),
  );

  const totalDevedor    = filtrados.reduce((acc, s) => acc + s.saldo_devedor, 0);
  const totalDisponivel = filtrados.reduce((acc, s) => acc + Math.max(s.saldo_disponivel, 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/financeiro">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Contas a Receber
            </Button>
          </Link>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Saldos de Crédito
          </h1>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Clientes</p>
            <p className="text-lg font-semibold">{filtrados.length}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Total Devedor
            </p>
            <p className="text-lg font-semibold text-red-700">{fmtMoeda(totalDevedor)}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Crédito Disponível
            </p>
            <p className="text-lg font-semibold text-green-700">{fmtMoeda(totalDisponivel)}</p>
          </div>
        </div>

        <Input
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-white">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum saldo encontrado.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right w-36">Limite de Crédito</TableHead>
                  <TableHead className="text-right w-36">Saldo Devedor</TableHead>
                  <TableHead className="text-right w-36">Disponível</TableHead>
                  <TableHead className="w-28">Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((s) => {
                  const disponivel   = s.saldo_disponivel;
                  const negativo     = disponivel < 0;
                  const semLimite    = s.limite_cred === 0;
                  return (
                    <TableRow key={`${s.cliente_id}-${s.filial}`} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <Link
                          href={`/clientes/${s.cliente_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {s.cliente}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {semLimite ? <span className="text-muted-foreground">—</span> : fmtMoeda(s.limite_cred)}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right text-sm font-mono',
                        s.saldo_devedor > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground',
                      )}>
                        {s.saldo_devedor > 0 ? fmtMoeda(s.saldo_devedor) : '—'}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right text-sm font-mono font-medium',
                        negativo ? 'text-red-600' : disponivel > 0 ? 'text-green-600' : 'text-muted-foreground',
                      )}>
                        {fmtMoeda(disponivel)}
                      </TableCell>
                      <TableCell>
                        {negativo ? (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border-red-200">
                            Negativo
                          </span>
                        ) : s.saldo_devedor > 0 ? (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 border-amber-200">
                            Com dívida
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 border-green-200">
                            Regular
                          </span>
                        )}
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
