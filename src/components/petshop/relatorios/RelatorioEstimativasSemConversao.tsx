'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { EstimativasSemConversaoResponse, SituacaoEstimativaConversao, Vendedor, Cliente } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/agenda/nova/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Bell, Info, AlertCircle, X, CheckCircle2, Clock, XCircle } from 'lucide-react';
import AcoesRelatorio from '@/components/petshop/relatorios/AcoesRelatorio';
import { exportarCsv } from '@/lib/exportarCsv';
import { cn } from '@/lib/utils';

interface Filtros {
  dataIni: string; dataFim: string; diasConversao: string;
  clienteId: string; clienteNome: string;
  vendedorId: string; status: string;
  valorMin: string; valorMax: string;
}

interface Props {
  dados:      EstimativasSemConversaoResponse;
  vendedores: Vendedor[];
  filtros:    Filtros;
}

const DIAS_OPCOES = ['3', '7', '10', '15', '30'];

const SITUACAO_INFO: Record<SituacaoEstimativaConversao, { label: string; classe: string; Icon: typeof Clock }> = {
  aguardando:     { label: 'Aguardando conversão', classe: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', Icon: Clock },
  convertida:     { label: 'Convertida',            classe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', Icon: CheckCircle2 },
  sem_conversao:  { label: 'Sem conversão',         classe: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', Icon: XCircle },
};

function fmtData(s: string) {
  if (!s) return '—';
  const datePart = s.split('T')[0];
  const [y, m, d] = datePart.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RelatorioEstimativasSemConversao({ dados, vendedores, filtros }: Props) {
  const router = useRouter();
  const [dataIni, setDataIni] = useState(filtros.dataIni);
  const [dataFim, setDataFim] = useState(filtros.dataFim);
  const [dias, setDias]       = useState(filtros.diasConversao);
  const [vendedorId, setVendedorId] = useState(filtros.vendedorId || 'todos');
  const [status, setStatus]   = useState(filtros.status || 'todos');
  const [valorMin, setValorMin] = useState(filtros.valorMin);
  const [valorMax, setValorMax] = useState(filtros.valorMax);
  const [, startTransition]   = useTransition();

  // ── Cliente: busca com lupa (mesmo padrão do Espelho de Cupons) ──
  const [clienteQ, setClienteQ]     = useState(filtros.clienteNome);
  const [clienteId, setClienteId]   = useState(filtros.clienteId);
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

  const [impressoEm, setImpressoEm] = useState('');
  useEffect(() => { setImpressoEm(new Date().toLocaleString('pt-BR')); }, []);

  function gerar() {
    const sp = new URLSearchParams();
    sp.set('data_ini', dataIni);
    sp.set('data_fim', dataFim);
    sp.set('dias_conversao', dias);
    if (clienteId)              sp.set('cliente_id', clienteId);
    if (clienteQ)                sp.set('cliente_nome', clienteQ);
    if (vendedorId !== 'todos') sp.set('vendedor_id', vendedorId);
    if (status !== 'todos')     sp.set('status', status);
    if (valorMin)                sp.set('valor_min', valorMin);
    if (valorMax)                sp.set('valor_max', valorMax);
    startTransition(() => router.push(`/relatorios/estimativas-sem-conversao?${sp.toString()}`));
  }

  function exportar() {
    exportarCsv(
      `estimativas_sem_conversao_${dataIni}_a_${dataFim}`,
      [
        { titulo: 'Situação',    valor: (r) => SITUACAO_INFO[r.situacao].label },
        { titulo: 'Cliente',     valor: (r) => r.cliente },
        { titulo: 'Cód. Cliente', valor: (r) => r.cliente_id },
        { titulo: 'Animal',      valor: (r) => r.animal },
        { titulo: 'Produto/Serviço', valor: (r) => r.produto || r.tipo_servico },
        { titulo: 'Vendedor',    valor: (r) => r.vendedor },
        { titulo: 'Data estimativa', valor: (r) => fmtData(r.data_estimativa) },
        { titulo: 'Data envio/contato', valor: (r) => fmtData(r.data_envio) },
        { titulo: 'Data limite', valor: (r) => fmtData(r.data_limite) },
        { titulo: 'Dias desde contato', valor: (r) => r.dias_desde_contato },
        { titulo: 'Valor',       valor: (r) => r.valor.toFixed(2).replace('.', ',') },
        { titulo: 'Agenda relacionada', valor: (r) => r.tem_agenda ? 'Sim' : 'Não' },
        { titulo: 'Data da agenda', valor: (r) => r.agenda_data ? fmtData(r.agenda_data) : '' },
        { titulo: 'Mesmo produto/serviço', valor: (r) => r.tem_agenda ? (r.produto_incluido ? 'Sim' : 'Não') : '' },
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
          <Bell className="h-5 w-5 text-primary" />
          Estimativas Enviadas sem Conversão
        </h1>
      </div>

      {/* Cabeçalho de impressão */}
      <div className="hidden print:block space-y-1">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Bell className="h-5 w-5" /> Estimativas Enviadas sem Conversão
        </h1>
        <p className="text-xs">
          Período (data de contato): {fmtData(dataIni)} a {fmtData(dataFim)} · Prazo de conversão: {dias} dias
        </p>
        <p className="text-xs text-muted-foreground">Impresso em {impressoEm}</p>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1.5 print:hidden">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        Considera estimativas (lembretes de recompra/retorno) marcadas como &quot;Enviada&quot; no período — a
        conversão é qualquer agenda/venda nova do cliente dentro do prazo, com indicação separada de quando
        essa venda inclui o mesmo produto/serviço do lembrete.
      </p>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <Input type="date" value={dataIni} className="w-36" onChange={(e) => setDataIni(e.target.value)} />
          <span className="text-sm text-muted-foreground">até</span>
          <Input type="date" value={dataFim} className="w-36" onChange={(e) => setDataFim(e.target.value)} />
        </div>

        <Select value={dias} onValueChange={(v) => setDias(v ?? '7')}
          items={DIAS_OPCOES.map((d) => ({ value: d, label: `${d} dias` }))}>
          <SelectTrigger className="h-9 text-sm w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DIAS_OPCOES.map((d) => <SelectItem key={d} value={d}>{d} dias</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v ?? 'todos')}
          items={[
            { value: 'todos', label: 'Todas as situações' },
            { value: 'aguardando', label: 'Aguardando conversão' },
            { value: 'convertida', label: 'Convertida' },
            { value: 'sem_conversao', label: 'Sem conversão' },
          ]}>
          <SelectTrigger className="h-9 text-sm w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            <SelectItem value="aguardando">Aguardando conversão</SelectItem>
            <SelectItem value="convertida">Convertida</SelectItem>
            <SelectItem value="sem_conversao">Sem conversão</SelectItem>
          </SelectContent>
        </Select>

        <Select value={vendedorId} onValueChange={(v) => setVendedorId(v ?? 'todos')}
          items={[{ value: 'todos', label: 'Todos os vendedores' }, ...vendedores.map((v) => ({ value: String(v.id), label: v.nome }))]}>
          <SelectTrigger className="h-9 text-sm w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os vendedores</SelectItem>
            {vendedores.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative w-56">
          <Input
            value={clienteQ}
            onChange={(e) => { setClienteQ(e.target.value); setClienteId(''); }}
            placeholder="Buscar cliente..."
            className="h-9 text-sm pr-7"
          />
          {(clienteQ || clienteId) && (
            <button onClick={() => { setClienteQ(''); setClienteId(''); setClienteOpts([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {clienteOpts.length > 0 && !clienteId && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {clienteOpts.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => { setClienteId(String(c.id)); setClienteQ(c.nome); setClienteOpts([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0">
                  {c.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input type="number" inputMode="decimal" placeholder="Valor mín." value={valorMin}
            className="w-28 h-9 text-sm" onChange={(e) => setValorMin(e.target.value)} />
          <Input type="number" inputMode="decimal" placeholder="Valor máx." value={valorMax}
            className="w-28 h-9 text-sm" onChange={(e) => setValorMax(e.target.value)} />
        </div>

        <Button onClick={gerar} size="sm">Gerar</Button>

        <div className="ml-auto flex items-center gap-3">
          {dados.Count > 0 && (
            <span className="text-sm text-muted-foreground">{dados.Count} estimativas</span>
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
          <Bell className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma estimativa enviada no período com esses filtros.</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Aguardando
              </p>
              <p className="text-lg font-semibold">{dados.total_aguardando}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Convertidas
              </p>
              <p className="text-lg font-semibold">{dados.total_convertidas}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" /> Sem conversão
              </p>
              <p className="text-lg font-semibold">{dados.total_sem_conversao}</p>
            </div>
            <div className="rounded-lg border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Valor sem conversão</p>
              <p className="text-lg font-semibold">{fmtMoeda(dados.valor_total_sem_conversao)}</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Situação</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto/Serviço</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="w-24">Envio</TableHead>
                  <TableHead className="w-24">Limite</TableHead>
                  <TableHead className="text-right w-16">Dias</TableHead>
                  <TableHead className="text-right w-24">Valor</TableHead>
                  <TableHead>Agenda relacionada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.dados.map((item, i) => {
                  const info = SITUACAO_INFO[item.situacao];
                  const Icon = info.Icon;
                  return (
                    <TableRow key={i} className="hover:bg-muted/40">
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', info.classe)}>
                          <Icon className="h-3 w-3" /> {info.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span>{item.cliente || '—'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">#{item.cliente_id}</span>
                        {item.animal && <span className="block text-xs text-muted-foreground">{item.animal}</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.produto || item.tipo_servico || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.vendedor || '—'}</TableCell>
                      <TableCell className="text-sm">{fmtData(item.data_envio)}</TableCell>
                      <TableCell className="text-sm">{fmtData(item.data_limite)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{item.dias_desde_contato}</TableCell>
                      <TableCell className="text-right text-sm">{fmtMoeda(item.valor)}</TableCell>
                      <TableCell className="text-sm">
                        {item.tem_agenda ? (
                          <span className="flex items-center gap-1.5">
                            {fmtData(item.agenda_data)}
                            {item.produto_incluido ? (
                              <span className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium">
                                mesmo produto/serviço
                              </span>
                            ) : (
                              <span className="rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[10px] font-medium"
                                title="Encontrou uma venda nova do cliente no prazo, mas não desse produto/serviço específico">
                                outro motivo
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
