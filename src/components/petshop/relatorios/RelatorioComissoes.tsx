'use client';

import { useRouter } from 'next/navigation';
import { RelatorioComissaoResponse } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

interface Props {
  dados:   RelatorioComissaoResponse;
  dataIni: string;
  dataFim: string;
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

export default function RelatorioComissoes({ dados, dataIni, dataFim }: Props) {
  const router = useRouter();
  const [di, setDi] = useState(dataIni);
  const [df, setDf] = useState(dataFim);
  const [, startTransition] = useTransition();

  function gerar() {
    startTransition(() =>
      router.push(`/relatorios/comissoes?data_ini=${di}&data_fim=${df}`),
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Comissões
        </h1>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={di}
            className="w-36"
            onChange={(e) => setDi(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={df}
            className="w-36"
            onChange={(e) => setDf(e.target.value)}
          />
        </div>
        <Button onClick={gerar} size="sm">Gerar</Button>

        {dados.Count > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">
            {dados.Count} {dados.Count === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {/* Totais */}
      {dados.Count > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total de Vendas</p>
            <p className="text-lg font-semibold">{fmtMoeda(dados.total_venda)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Comissão</p>
            <p className="text-lg font-semibold text-primary">{fmtMoeda(dados.total_comissao)}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      {dados.Count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-white">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado para o período.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Animal</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="hidden lg:table-cell">Produto</TableHead>
                <TableHead className="text-right w-14">Qtd</TableHead>
                <TableHead className="text-right">Valor Liq.</TableHead>
                <TableHead className="text-right w-16">Com%</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.dados.map((r, i) => (
                <TableRow key={i} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-xs">{fmtData(r.data)}</TableCell>
                  <TableCell className="text-sm">{r.cliente}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.animal || '—'}</TableCell>
                  <TableCell className="text-sm">{r.tecnico || r.atendente || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[160px] truncate">{r.produto}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{r.qtd}</TableCell>
                  <TableCell className="text-right text-sm">{fmtMoeda(r.valorliq)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{r.comissao_perc}%</TableCell>
                  <TableCell className="text-right font-medium text-sm">{fmtMoeda(r.comissao_valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
