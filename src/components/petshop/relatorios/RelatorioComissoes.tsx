'use client';

import { useRouter } from 'next/navigation';
import { RelatorioComissaoResponse, Profissional, Vendedor } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
import { useEffect, useState, useTransition } from 'react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';

interface Props {
  dados:         RelatorioComissaoResponse;
  dataIni:       string;
  dataFim:       string;
  profissionais: Profissional[];
  vendedores:    Vendedor[];
  tecnicoId:     string;
  codvend:       string;
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

export default function RelatorioComissoes({
  dados, dataIni, dataFim, profissionais, vendedores, tecnicoId, codvend,
}: Props) {
  const router = useRouter();
  const [di, setDi] = useState(dataIni);
  const [df, setDf] = useState(dataFim);
  const [tecnico, setTecnico] = useState(tecnicoId || 'todos');
  const [vendedor, setVendedor] = useState(codvend || 'todos');
  const [, startTransition] = useTransition();

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    sp.set('data_ini', di);
    sp.set('data_fim', df);
    if (tecnico !== 'todos')  sp.set('tecnico_id', tecnico);
    if (vendedor !== 'todos') sp.set('codvend', vendedor);
    startTransition(() => router.push(`/relatorios/comissoes?${sp.toString()}`));
  }

  function exportar() {
    exportarCsv(
      `comissoes_${di}_a_${df}`,
      [
        { titulo: 'Data',      valor: (r) => fmtData(r.data) },
        { titulo: 'Agenda',    valor: (r) => r.id_orca },
        { titulo: 'Cliente',   valor: (r) => r.cliente },
        { titulo: 'Animal',    valor: (r) => r.animal || '' },
        { titulo: 'Técnico',   valor: (r) => r.tecnico || r.atendente || '' },
        { titulo: 'Produto',   valor: (r) => r.produto },
        { titulo: 'Qtd',       valor: (r) => r.qtd },
        { titulo: 'Valor Líq.',valor: (r) => r.valorliq.toFixed(2).replace('.', ',') },
        { titulo: 'Com%',      valor: (r) => r.comissao_perc },
        { titulo: 'Comissão',  valor: (r) => r.comissao_valor.toFixed(2).replace('.', ',') },
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
          <Users className="h-5 w-5 text-primary" />
          Comissões
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Relatório de Comissões
        </h1>
        <p className="text-xs">
          Período: {fmtData(di)} a {fmtData(df)}
          {tecnico !== 'todos' && ` · Técnico: ${profissionais.find((p) => String(p.id) === tecnico)?.nome ?? tecnico}`}
          {vendedor !== 'todos' && ` · Vendedor: ${vendedores.find((v) => String(v.id) === vendedor)?.nome ?? vendedor}`}
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
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

        <Select value={tecnico} onValueChange={(v) => setTecnico(v ?? 'todos')}
          items={[{ value: 'todos', label: 'Todos os técnicos' }, ...profissionais.map((p) => ({ value: String(p.id), label: p.nome }))]}>
          <SelectTrigger className="h-9 text-sm w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os técnicos</SelectItem>
            {profissionais.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={vendedor} onValueChange={(v) => setVendedor(v ?? 'todos')}
          items={[{ value: 'todos', label: 'Todos os vendedores' }, ...vendedores.map((v) => ({ value: String(v.id), label: v.nome }))]}>
          <SelectTrigger className="h-9 text-sm w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={gerar} size="sm">Gerar</Button>

        <div className="ml-auto flex items-center gap-3">
          {dados.Count > 0 && (
            <span className="text-sm text-muted-foreground">
              {dados.Count} {dados.Count === 1 ? 'registro' : 'registros'}
            </span>
          )}
          <AcoesRelatorio onExportar={exportar} />
        </div>
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
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado para o período.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Data</TableHead>
                <TableHead className="w-20">Agenda</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell print:table-cell">Animal</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="hidden lg:table-cell print:table-cell">Produto</TableHead>
                <TableHead className="text-right w-14">Qtd</TableHead>
                <TableHead className="text-right">Valor Liq.</TableHead>
                <TableHead className="text-right w-16">Com%</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dados.dados ?? []).map((r, i) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">{fmtData(r.data)}</TableCell>
                  <TableCell className="font-mono text-xs">#{r.id_orca}</TableCell>
                  <TableCell className="text-sm">{r.cliente}</TableCell>
                  <TableCell className="hidden md:table-cell print:table-cell text-sm text-muted-foreground">{r.animal || '—'}</TableCell>
                  <TableCell className="text-sm">{r.tecnico || r.atendente || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell print:table-cell text-sm text-muted-foreground max-w-[160px] truncate">{r.produto}</TableCell>
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
