'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CurvaAbcClienteResponse, CriterioCurvaAbcCliente, ClasseCurvaAbc } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users, Info, AlertCircle } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';
import { cn } from '@/lib/utils';

interface Props {
  dados:    CurvaAbcClienteResponse;
  dataIni:  string;
  dataFim:  string;
  criterio: CriterioCurvaAbcCliente;
}

const CRITERIOS: { value: CriterioCurvaAbcCliente; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'qtd',      label: 'Qtd. atendimentos' },
];

const CLASSE_ESTILO: Record<ClasseCurvaAbc, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  C: 'bg-muted text-muted-foreground',
};

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtDataHora(s: string) {
  if (!s) return '—';
  const [datePart] = s.split(' ');
  const [y, m, d] = (datePart ?? '').split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number) {
  return `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export default function RelatorioCurvaAbcClientes({ dados, dataIni, dataFim, criterio }: Props) {
  const router = useRouter();
  const [di, setDi]         = useState(dataIni);
  const [df, setDf]         = useState(dataFim);
  const [crit, setCrit]     = useState<CriterioCurvaAbcCliente>(criterio);
  const [, startTransition] = useTransition();

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    sp.set('data_ini', di);
    sp.set('data_fim', df);
    sp.set('criterio', crit);
    startTransition(() => router.push(`/relatorios/curva-abc-clientes?${sp.toString()}`));
  }

  function exportar() {
    exportarCsv(
      `curva_abc_clientes_${di}_a_${df}`,
      [
        { titulo: 'Classe',      valor: (r) => r.classe },
        { titulo: 'Cliente',     valor: (r) => r.cliente },
        { titulo: 'Telefone',    valor: (r) => r.telefone },
        { titulo: 'Atendimentos', valor: (r) => r.qtd_atendimentos },
        { titulo: 'Receita',     valor: (r) => r.receita.toFixed(2).replace('.', ',') },
        { titulo: 'Última visita', valor: (r) => fmtDataHora(r.ultima_visita) },
        { titulo: 'Participação %', valor: (r) => r.participacao_pct.toFixed(1).replace('.', ',') },
        { titulo: 'Acumulado %', valor: (r) => r.participacao_acumulada_pct.toFixed(1).replace('.', ',') },
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
          Curva ABC de Clientes
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Curva ABC de Clientes
        </h1>
        <p className="text-xs">
          Período: {fmtData(di)} a {fmtData(df)} · Critério: {crit === 'qtd' ? 'Qtd. atendimentos' : 'Receita'}
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5 print:hidden">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Baseado em agenda, tele-entrega e pré-venda (orçamentos válidos) no período — cobre serviço além
        de produto, com pequena imprecisão de desconto de PDV que não afeta o ranking.
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Input type="date" value={di} className="w-36" onChange={(e) => setDi(e.target.value)} />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={df} className="w-36" onChange={(e) => setDf(e.target.value)} />
        </div>

        <Select value={crit} onValueChange={(v) => setCrit((v as CriterioCurvaAbcCliente) ?? 'receita')}
          items={CRITERIOS}>
          <SelectTrigger className="h-9 text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CRITERIOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={gerar} size="sm">Gerar</Button>

        <div className="ml-auto flex items-center gap-3">
          {dados.Count > 0 && (
            <span className="text-sm text-muted-foreground">{dados.Count} clientes</span>
          )}
          <AcoesRelatorio onExportar={exportar} />
        </div>
      </div>

      {dados.CodStatus !== 1 ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {dados.DescricaoStatus || 'Erro ao carregar o relatório.'}
        </div>
      ) : dados.Count === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum atendimento no período.</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Receita total</p>
              <p className="text-lg font-semibold">{fmtMoeda(dados.total_receita)}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Atendimentos</p>
              <p className="text-lg font-semibold">{dados.total_atendimentos}</p>
            </div>
            {(['A', 'B', 'C'] as ClasseCurvaAbc[]).map((cl) => {
              const r = cl === 'A' ? dados.resumo_a : cl === 'B' ? dados.resumo_b : dados.resumo_c;
              return (
                <div key={cl} className="rounded-lg border bg-card px-4 py-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', CLASSE_ESTILO[cl])}>{cl}</span>
                    Classe {cl}
                  </p>
                  <p className="text-lg font-semibold">{r.clientes} <span className="text-xs font-normal text-muted-foreground">clientes</span></p>
                  <p className="text-xs text-muted-foreground">{fmtMoeda(r.receita)} de receita</p>
                </div>
              );
            })}
          </div>

          {/* Tabela */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Classe</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right w-28">Atendim.</TableHead>
                  <TableHead className="text-right w-28">Receita</TableHead>
                  <TableHead className="w-28">Última visita</TableHead>
                  <TableHead className="text-right w-24">Particip.</TableHead>
                  <TableHead className="text-right w-24">Acumul.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.dados.map((item, i) => (
                  <TableRow key={i} className="hover:bg-muted/40">
                    <TableCell>
                      <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-bold', CLASSE_ESTILO[item.classe])}>
                        {item.classe}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{item.cliente || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.telefone || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.qtd_atendimentos}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtMoeda(item.receita)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDataHora(item.ultima_visita)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{fmtPct(item.participacao_pct)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{fmtPct(item.participacao_acumulada_pct)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
