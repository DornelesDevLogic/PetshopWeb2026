'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { VendasCmvResponse } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Calculator } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';

interface Filtros {
  dataDe:         string;
  dataAte:        string;
  filial:         string;
  caixa:          string;
  semFp:          boolean;
  somenteFrente:  boolean;
}

interface Props {
  dados:   VendasCmvResponse;
  filtros: Filtros;
}

function fmtData(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number) {
  return `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export default function RelatorioVendasCmv({ dados, filtros }: Props) {
  const router = useRouter();
  const [dataDe, setDataDe]   = useState(filtros.dataDe);
  const [dataAte, setDataAte] = useState(filtros.dataAte);
  const [filial, setFilial]   = useState(filtros.filial);
  const [caixa, setCaixa]     = useState(filtros.caixa);
  const [semFp, setSemFp]             = useState(filtros.semFp);
  const [somenteFrente, setSomenteFrente] = useState(filtros.somenteFrente);
  const [, startTransition] = useTransition();

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    sp.set('data_de', dataDe);
    sp.set('data_ate', dataAte);
    if (filial) sp.set('filial', filial);
    if (caixa.trim()) sp.set('caixa', caixa.trim());
    if (semFp) sp.set('sem_fp', '1');
    if (somenteFrente) sp.set('somente_frente', '1');
    startTransition(() => router.push(`/relatorios/vendas-cmv?${sp.toString()}`));
  }

  function exportar() {
    exportarCsv(
      `vendas_cmv_${dataDe}_a_${dataAte}`,
      [
        { titulo: 'Seção',       valor: (r) => r.secao },
        { titulo: 'Qtd Itens',   valor: (r) => String(r.nro_itens) },
        { titulo: 'Venda Bruta', valor: (r) => r.total.toFixed(2).replace('.', ',') },
        { titulo: 'CMV',         valor: (r) => r.custo.toFixed(2).replace('.', ',') },
        { titulo: 'Lucro R$',    valor: (r) => r.lucro.toFixed(2).replace('.', ',') },
        { titulo: '% Receita',   valor: (r) => r.porc_receita.toFixed(2).replace('.', ',') },
        { titulo: '% Lucro',     valor: (r) => r.porc_lucro.toFixed(2).replace('.', ',') },
        { titulo: '% Margem',    valor: (r) => r.margem.toFixed(2).replace('.', ',') },
        { titulo: '% Markup',    valor: (r) => r.markup.toFixed(2).replace('.', ',') },
        { titulo: 'Desconto R$', valor: (r) => r.tot_desconto.toFixed(2).replace('.', ',') },
        { titulo: 'Acréscimo R$',valor: (r) => r.tot_acrescimo.toFixed(2).replace('.', ',') },
      ],
      dados.dados ?? [],
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Geral de Vendas — Detalhamento CMV
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5" /> Geral de Vendas — Detalhamento CMV
        </h1>
        <p className="text-xs">Período: {fmtData(dataDe)} a {fmtData(dataAte)}</p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      {/* Filtros */}
      <div className="flex items-end gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Input type="date" value={dataDe} className="w-36" onChange={(e) => setDataDe(e.target.value)} />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={dataAte} className="w-36" onChange={(e) => setDataAte(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Filial (0 = todas)</label>
          <Input value={filial} onChange={(e) => setFilial(e.target.value)} className="h-9 text-sm w-24" inputMode="numeric" />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground block">Caixa (opcional)</label>
          <Input value={caixa} onChange={(e) => setCaixa(e.target.value)} placeholder="Ex: 101" className="h-9 text-sm w-24" inputMode="numeric" />
        </div>

        <label className="flex items-center gap-1.5 text-sm h-9">
          <input type="checkbox" checked={semFp} onChange={(e) => setSemFp(e.target.checked)} />
          Incluir notas sem forma de pagamento
        </label>

        <label className="flex items-center gap-1.5 text-sm h-9">
          <input type="checkbox" checked={somenteFrente} onChange={(e) => setSomenteFrente(e.target.checked)} />
          Somente frente de caixa
        </label>

        <Button onClick={gerar} size="sm">Gerar</Button>

        <div className="ml-auto">
          <AcoesRelatorio onExportar={exportar} />
        </div>
      </div>

      {/* Totais gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Nº Vendas', valor: String(dados.numero_vendas) },
          { label: 'Ticket Médio', valor: fmtMoeda(dados.ticket_medio) },
          { label: 'Venda Bruta', valor: fmtMoeda(dados.venda_bruta) },
          { label: 'CMV', valor: fmtMoeda(dados.cmv) },
          { label: 'Lucro Bruto', valor: fmtMoeda(dados.lucro_bruto) },
          { label: 'Margem', valor: fmtPct(dados.margem) },
          { label: 'Markup', valor: fmtPct(dados.markup) },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border bg-card px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-sm font-semibold">{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela por seção */}
      {dados.Count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <Calculator className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado para o período.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seção</TableHead>
                <TableHead className="text-right">Venda Bruta</TableHead>
                <TableHead className="text-right">CMV</TableHead>
                <TableHead className="text-right">Lucro R$</TableHead>
                <TableHead className="text-right">% Rec</TableHead>
                <TableHead className="text-right">% Luc.</TableHead>
                <TableHead className="text-right">%Margem</TableHead>
                <TableHead className="text-right">%Markup</TableHead>
                <TableHead className="text-right">Desc R$</TableHead>
                <TableHead className="text-right">Acré R$</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.dados.map((s, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="text-sm font-medium">{s.secao}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmtMoeda(s.total)}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-muted-foreground">{fmtMoeda(s.custo)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmtMoeda(s.lucro)}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-muted-foreground">{fmtPct(s.porc_receita)}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-muted-foreground">{fmtPct(s.porc_lucro)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmtPct(s.margem)}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{fmtPct(s.markup)}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-muted-foreground">{fmtMoeda(s.tot_desconto)}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-muted-foreground">{fmtMoeda(s.tot_acrescimo)}</TableCell>
                </TableRow>
              ))}
              {/* Totais */}
              <TableRow className="bg-muted/30 border-t-2 font-semibold">
                <TableCell className="text-sm">Totais</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtMoeda(dados.venda_bruta)}</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtMoeda(dados.cmv)}</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtMoeda(dados.lucro_bruto)}</TableCell>
                <TableCell className="text-right text-sm font-mono">—</TableCell>
                <TableCell className="text-right text-sm font-mono">—</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtPct(dados.margem)}</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtPct(dados.markup)}</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtMoeda(dados.desconto)}</TableCell>
                <TableCell className="text-right text-sm font-mono">{fmtMoeda(dados.acrescimo)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
