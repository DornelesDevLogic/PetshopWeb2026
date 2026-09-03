'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { CurvaAbcResponse, CriterioCurvaAbc, Secao, ClasseCurvaAbc } from '@/types/petshop';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, TrendingUp, Info, AlertCircle } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';
import { cn } from '@/lib/utils';

interface Props {
  dados:    CurvaAbcResponse;
  dataDe:   string;
  dataAte:  string;
  criterio: CriterioCurvaAbc;
  secoes:   Secao[];
  secaoId:  string;
}

const CRITERIOS: { value: CriterioCurvaAbc; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'lucro',   label: 'Lucro' },
  { value: 'custo',   label: 'Custo' },
  { value: 'qtd',     label: 'Quantidade' },
];

const CLASSE_ESTILO: Record<ClasseCurvaAbc, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  C: 'bg-muted text-muted-foreground',
};

function fmtData(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQtd(v: number) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function fmtPct(v: number) {
  return `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export default function RelatorioCurvaAbc({ dados, dataDe, dataAte, criterio, secoes, secaoId }: Props) {
  const router = useRouter();
  const [de, setDe]         = useState(dataDe);
  const [ate, setAte]       = useState(dataAte);
  const [crit, setCrit]     = useState<CriterioCurvaAbc>(criterio);
  const [secao, setSecao]   = useState(secaoId || 'todas');
  const [, startTransition] = useTransition();

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    sp.set('data_de', de);
    sp.set('data_ate', ate);
    sp.set('criterio', crit);
    if (secao !== 'todas') sp.set('secao_id', secao);
    startTransition(() => router.push(`/relatorios/curva-abc?${sp.toString()}`));
  }

  function exportar() {
    exportarCsv(
      `curva_abc_${de}_a_${ate}`,
      [
        { titulo: 'Classe',      valor: (r) => r.classe },
        { titulo: 'Cód. Produto', valor: (r) => r.cod_prod },
        { titulo: 'Produto',     valor: (r) => r.descricao },
        { titulo: 'Seção',       valor: (r) => r.secao },
        { titulo: 'Qtd',         valor: (r) => fmtQtd(r.qtd) },
        { titulo: 'Receita',     valor: (r) => r.receita.toFixed(2).replace('.', ',') },
        { titulo: 'Custo',       valor: (r) => r.custo.toFixed(2).replace('.', ',') },
        { titulo: 'Lucro',       valor: (r) => r.lucro.toFixed(2).replace('.', ',') },
        { titulo: 'Margem %',    valor: (r) => r.margem_pct.toFixed(1).replace('.', ',') },
        { titulo: 'Participação %', valor: (r) => r.participacao_pct.toFixed(1).replace('.', ',') },
        { titulo: 'Acumulado %', valor: (r) => r.participacao_acumulada_pct.toFixed(1).replace('.', ',') },
      ],
      dados.dados ?? [],
    );
  }

  const criterioLabel = CRITERIOS.find((c) => c.value === crit)?.label ?? 'Receita';

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
          <TrendingUp className="h-5 w-5 text-primary" />
          Curva ABC de Produtos
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Curva ABC de Produtos
        </h1>
        <p className="text-xs">
          Período: {fmtData(de)} a {fmtData(ate)} · Critério: {criterioLabel}
          {secao !== 'todas' && ` · Seção: ${secoes.find((s) => String(s.id) === secao)?.descricao ?? secao}`}
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5 print:hidden">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Baseado nas notas fiscais de produto (NFC-e) realmente emitidas no caixa — reflete o desconto
        dado na hora da venda, diferente da agenda/orçamento. Vendas com nota de serviço (NFS-e) não
        entram aqui.
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Input type="date" value={de} className="w-36" onChange={(e) => setDe(e.target.value)} />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={ate} className="w-36" onChange={(e) => setAte(e.target.value)} />
        </div>

        <Select value={crit} onValueChange={(v) => setCrit((v as CriterioCurvaAbc) ?? 'receita')}
          items={CRITERIOS}>
          <SelectTrigger className="h-9 text-sm w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CRITERIOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={secao} onValueChange={(v) => setSecao(v ?? 'todas')}
          items={[{ value: 'todas', label: 'Todas as seções' }, ...secoes.map((s) => ({ value: String(s.id), label: s.descricao }))]}>
          <SelectTrigger className="h-9 text-sm w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as seções</SelectItem>
            {secoes.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.descricao}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button onClick={gerar} size="sm">Gerar</Button>

        <div className="ml-auto flex items-center gap-3">
          {dados.Count > 0 && (
            <span className="text-sm text-muted-foreground">{dados.Count} produtos</span>
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
          <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma venda de produto (NFC-e) no período.</p>
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
              <p className="text-xs text-muted-foreground">Lucro total</p>
              <p className="text-lg font-semibold">{fmtMoeda(dados.total_lucro)}</p>
            </div>
            {(['A', 'B', 'C'] as ClasseCurvaAbc[]).map((cl) => {
              const r = cl === 'A' ? dados.resumo_a : cl === 'B' ? dados.resumo_b : dados.resumo_c;
              return (
                <div key={cl} className="rounded-lg border bg-card px-4 py-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', CLASSE_ESTILO[cl])}>{cl}</span>
                    Classe {cl}
                  </p>
                  <p className="text-lg font-semibold">{r.produtos} <span className="text-xs font-normal text-muted-foreground">produtos</span></p>
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
                  <TableHead>Produto</TableHead>
                  <TableHead>Seção</TableHead>
                  <TableHead className="text-right w-24">Qtd</TableHead>
                  <TableHead className="text-right w-28">Receita</TableHead>
                  <TableHead className="text-right w-28">Custo</TableHead>
                  <TableHead className="text-right w-28">Lucro</TableHead>
                  <TableHead className="text-right w-20">Margem</TableHead>
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
                    <TableCell className="text-sm">
                      <span>{item.descricao}</span>
                      {item.cod_prod && (
                        <span className="ml-2 text-xs text-muted-foreground">#{item.cod_prod}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.secao || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtQtd(item.qtd)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoeda(item.receita)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{fmtMoeda(item.custo)}</TableCell>
                    <TableCell className={cn('text-right text-sm font-medium', item.lucro < 0 && 'text-destructive')}>
                      {fmtMoeda(item.lucro)}
                    </TableCell>
                    <TableCell className={cn('text-right text-sm', item.margem_pct < 0 && 'text-destructive')}>
                      {fmtPct(item.margem_pct)}
                    </TableCell>
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
