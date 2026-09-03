'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { type ProdutoCustoMaiorPreco } from '@/app/(petshop)/relatorios/produtos/custo-maior-preco/actions';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, TrendingDown, AlertTriangle } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';

interface Props {
  produtos: ProdutoCustoMaiorPreco[];
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RelatorioProdutosCustoMaiorPreco({ produtos }: Props) {
  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function exportar() {
    exportarCsv(
      'produtos_custo_maior_preco',
      [
        { titulo: 'Código',     valor: (p) => p.cod_pro },
        { titulo: 'Descrição',  valor: (p) => p.descricao },
        { titulo: 'Espécie',    valor: (p) => p.especie },
        { titulo: 'Fabricante', valor: (p) => p.fabricante },
        { titulo: 'Custo',      valor: (p) => p.custo.toFixed(2).replace('.', ',') },
        { titulo: 'Preço',      valor: (p) => p.preco.toFixed(2).replace('.', ',') },
        { titulo: 'Diferença',  valor: (p) => p.diferenca.toFixed(2).replace('.', ',') },
      ],
      produtos,
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/relatorios/produtos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatório de Produtos
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          Custo maior que preço de venda
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TrendingDown className="h-5 w-5" /> Produtos — Custo maior que preço de venda
        </h1>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      <p className="text-xs text-muted-foreground -mt-2 print:hidden">
        Produtos com preço de custo cadastrado acima do preço de venda na filial atual — provável erro de precificação ou reajuste esquecido. Somente leitura.
      </p>

      <div className="flex items-center justify-end print:hidden">
        <AcoesRelatorio onExportar={exportar} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {produtos.length} produto{produtos.length === 1 ? '' : 's'} encontrado{produtos.length === 1 ? '' : 's'}
          </span>
        </div>

        {produtos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum produto com custo acima do preço de venda nesta filial.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Espécie</TableHead>
                <TableHead>Fabricante</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={`${p.cod_filial}-${p.id_pro}`}>
                  <TableCell className="font-mono text-xs">{p.cod_pro || '—'}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{p.descricao}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.especie || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.fabricante || '—'}</TableCell>
                  <TableCell className="text-right">{fmtMoeda(p.custo)}</TableCell>
                  <TableCell className="text-right">{fmtMoeda(p.preco)}</TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    <span className="inline-flex items-center gap-1 justify-end">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {fmtMoeda(p.diferenca)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
