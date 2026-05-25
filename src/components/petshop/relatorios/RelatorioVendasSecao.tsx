'use client';

import { useRouter } from 'next/navigation';
import { RelatorioVendasSecaoResponse, RelatorioVendasSecaoItem } from '@/types/petshop';
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
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

interface Props {
  dados:   RelatorioVendasSecaoResponse;
  dataIni: string;
  dataFim: string;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function fmtQtd(v: number) {
  return v % 1 === 0 ? String(v) : v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/** Agrupa itens por seção para exibição em blocos */
function agruparPorSecao(itens: RelatorioVendasSecaoItem[]) {
  const grupos: Record<string, { secao: string; itens: RelatorioVendasSecaoItem[]; totalSecao: number }> = {};
  for (const item of itens ?? []) {
    const key = item.secao || '(Sem seção)';
    if (!grupos[key]) grupos[key] = { secao: key, itens: [], totalSecao: 0 };
    grupos[key].itens.push(item);
    grupos[key].totalSecao += item.total;
  }
  return Object.values(grupos);
}

export default function RelatorioVendasSecao({ dados, dataIni, dataFim }: Props) {
  const router = useRouter();
  const [di, setDi] = useState(dataIni);
  const [df, setDf] = useState(dataFim);
  const [, startTransition] = useTransition();

  function gerar() {
    startTransition(() =>
      router.push(`/relatorios/vendas-secao?data_ini=${di}&data_fim=${df}`),
    );
  }

  const grupos = agruparPorSecao(dados.dados);

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
          <ShoppingBag className="h-5 w-5 text-primary" />
          Vendas por Seção
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
            {dados.Count} {dados.Count === 1 ? 'item' : 'itens'} · {grupos.length} seções
          </span>
        )}
      </div>

      {/* Total Geral */}
      {dados.Count > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 inline-block">
          <p className="text-xs text-muted-foreground">Total Geral</p>
          <p className="text-xl font-semibold text-primary">{fmtMoeda(dados.total_geral)}</p>
        </div>
      )}

      {/* Tabela por seção */}
      {dados.Count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-white">
          <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado para o período.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.secao} className="rounded-xl border bg-white overflow-hidden">
              {/* Cabeçalho da seção */}
              <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between border-b">
                <h3 className="font-semibold text-sm">{g.secao}</h3>
                <span className="text-sm font-medium text-primary">{fmtMoeda(g.totalSecao)}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right w-24">Qtd</TableHead>
                    <TableHead className="text-right w-28">Preço Unit.</TableHead>
                    <TableHead className="text-right w-28">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.itens.map((item, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell className="text-sm">
                        <span>{item.produto}</span>
                        {item.cod_prod && (
                          <span className="ml-2 text-xs text-muted-foreground">#{item.cod_prod}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtQtd(item.qtd_total)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{fmtMoeda(item.valorliq)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmtMoeda(item.total)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Subtotal da seção */}
                  <TableRow className="bg-muted/20 border-t">
                    <TableCell colSpan={3} className="text-right text-sm font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{fmtMoeda(g.totalSecao)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}

          {/* Total Geral ao final */}
          <div className="flex justify-end">
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-3 text-right">
              <p className="text-xs text-muted-foreground">Total Geral do Período</p>
              <p className="text-xl font-semibold text-primary">{fmtMoeda(dados.total_geral)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
