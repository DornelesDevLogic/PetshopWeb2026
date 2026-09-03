'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cliente } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/agenda/nova/actions';
import { type Vale, type StatusVale } from '@/app/(petshop)/relatorios/vales/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Ticket, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';

interface Filtros {
  clienteId:     string;
  clienteFilial: string;
  clienteNome:   string;
  busca:         string;
  status:        StatusVale;
  dataIni:       string;
  dataAte:       string;
}

interface Props {
  vales:   Vale[];
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

const SITUACAO_COR: Record<string, string> = {
  N: 'bg-blue-100 text-blue-700 border-blue-200',
  P: 'bg-amber-100 text-amber-700 border-amber-200',
  S: 'bg-muted text-muted-foreground border-border',
  C: 'bg-red-100 text-red-700 border-red-200',
};

export default function RelatorioVales({ vales, filtros }: Props) {
  const router = useRouter();

  const [status, setStatus]   = useState<StatusVale>(filtros.status);
  const [dataIni, setDataIni] = useState(filtros.dataIni);
  const [dataAte, setDataAte] = useState(filtros.dataAte);

  // ── Cliente: busca com lupa (mesmo padrão do Espelho de Cupons) ──
  const [clienteQ, setClienteQ]       = useState(filtros.clienteNome || filtros.busca);
  const [clienteId, setClienteId]     = useState(filtros.clienteId);
  const [clienteFilial, setClienteFilial] = useState(filtros.clienteFilial);
  const [clienteOpts, setClienteOpts] = useState<Cliente[]>([]);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (clienteId) return;
    if (debRef.current) clearTimeout(debRef.current);
    if (clienteQ.trim().length < 3) { setClienteOpts([]); return; }
    debRef.current = setTimeout(async () => {
      setClienteOpts(await buscarClientes(clienteQ.trim()));
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [clienteQ, clienteId]);

  function selecionarCliente(c: Cliente) {
    setClienteId(String(c.id));
    setClienteFilial(String(c.filial));
    setClienteQ(c.nome);
    setClienteOpts([]);
  }

  function limparCliente() {
    setClienteId('');
    setClienteFilial('');
    setClienteQ('');
    setClienteOpts([]);
  }

  function pesquisar() {
    const sp = new URLSearchParams();
    if (clienteId) {
      sp.set('cliente_id', clienteId);
      sp.set('cliente_filial', clienteFilial);
      sp.set('cliente_nome', clienteQ);
    } else if (clienteQ.trim()) {
      sp.set('busca', clienteQ.trim());
    }
    sp.set('status', status);
    if (dataIni) sp.set('data_ini', dataIni);
    if (dataAte) sp.set('data_ate', dataAte);
    router.push(`/relatorios/vales?${sp.toString()}`);
  }

  const totalSaldo = vales.reduce((acc, v) => acc + (v.valor_saldo || 0), 0);

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function exportar() {
    exportarCsv(
      'vales_de_clientes',
      [
        { titulo: 'Nº',        valor: (v) => v.id_vale },
        { titulo: 'Data',      valor: (v) => fmtData(v.data) },
        { titulo: 'Cliente',   valor: (v) => v.cliente_nome || '' },
        { titulo: 'Tipo',      valor: (v) => v.tipo },
        { titulo: 'Valor',     valor: (v) => v.total.toFixed(2).replace('.', ',') },
        { titulo: 'Utilizado', valor: (v) => v.valor_util.toFixed(2).replace('.', ',') },
        { titulo: 'Saldo',     valor: (v) => v.valor_saldo.toFixed(2).replace('.', ',') },
        { titulo: 'Situação',  valor: (v) => v.situacao },
      ],
      vales,
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/relatorios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </Link>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Vales de Clientes
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Ticket className="h-5 w-5" /> Vales de Clientes
        </h1>
        <p className="text-xs">
          Status: {status} {(dataIni || dataAte) && `· Período: ${fmtData(dataIni)} a ${fmtData(dataAte)}`}
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      <p className="text-xs text-muted-foreground -mt-2 print:hidden">
        Consulta de crédito/vale-troca gerado por devolução. Somente leitura — emissão e baixa continuam pela Retaguarda.
      </p>

      {/* Filtros */}
      <div className="rounded-xl border bg-card p-4 space-y-3 print:hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar cliente por nome..."
              value={clienteQ}
              onChange={(e) => { setClienteQ(e.target.value); setClienteId(''); }}
              className="pl-9 pr-8"
              autoComplete="off"
            />
            {clienteQ && (
              <button type="button" onClick={limparCliente} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            {clienteOpts.length > 0 && !clienteId && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {clienteOpts.map((c) => (
                  <button
                    key={`${c.filial}-${c.id}`}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Select value={status} onValueChange={(v) => setStatus(v as StatusVale)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Em aberto</SelectItem>
              <SelectItem value="usado">Utilizados</SelectItem>
              <SelectItem value="cancelado">Cancelados</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={pesquisar}>
            <Search className="h-4 w-4 mr-1.5" /> Pesquisar
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data inicial</label>
            <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data final</label>
            <Input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="flex items-center justify-end print:hidden">
        <AcoesRelatorio onExportar={exportar} />
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {vales.length} vale{vales.length === 1 ? '' : 's'} encontrado{vales.length === 1 ? '' : 's'}
          </span>
          {status === 'aberto' && (
            <span className="text-sm font-semibold">
              Saldo total: {fmtMoeda(totalSaldo)}
            </span>
          )}
        </div>

        {vales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhum vale encontrado para esses filtros.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Utilizado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vales.map((v) => (
                <TableRow key={`${v.filial}-${v.id_vale}`}>
                  <TableCell className="font-mono text-xs">{v.id_vale}</TableCell>
                  <TableCell>{fmtData(v.data)}</TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {v.cliente_nome || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.tipo}</TableCell>
                  <TableCell className="text-right">{fmtMoeda(v.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtMoeda(v.valor_util)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtMoeda(v.valor_saldo)}</TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', SITUACAO_COR[v.utilizado] ?? 'bg-muted text-muted-foreground border-border')}>
                      {v.situacao}
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
