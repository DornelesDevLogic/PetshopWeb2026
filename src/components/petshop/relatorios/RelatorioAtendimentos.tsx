'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Profissional, Servico, Vendedor, Cliente } from '@/types/petshop';
import { buscarClientes } from '@/app/(petshop)/agenda/nova/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, CalendarClock, ChevronDown, ChevronUp, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ItemRelatorioAgenda {
  id_orca: number; filial: number; situacao: string; tipo_servico: string;
  data: string; hora: string; valor_agenda: number; sub_total: number; status: number;
  profissional: string; codvend: number; nome_vend: string;
  cliente_id: number; cliente_filial: number; cliente: string;
  fone1: string; fone2: string; celular: string; email: string;
  animal: string;
  id_prodorca: number; cod_prod: string; desc_pro: string;
  preco_tabela: number; desconto: number; qtd: number; valorliq: number; total_item: number;
  cod_secao: string; desc_secao: string; cod_grupo: string; desc_grupo: string;
}

export interface FiltrosRelatorioAgenda {
  dataDe: string; dataFim: string;
  atendenteId: string; situacao: string;
  clienteId: string; clienteNome: string;
  tipoServico: string; somenteBaixadas: boolean;
  secao: string; grupo: string; produto: string; vetId: string;
}

interface Props {
  itens:          ItemRelatorioAgenda[];
  profissionais:  Profissional[];
  vendedores:     Vendedor[];
  servicos:       Servico[];
  filtros:        FiltrosRelatorioAgenda;
}

// Mesma lista fixa do combo "Situação" do sistema legado (Urelat_agenda.dfm)
const SITUACOES = [
  'ABERTA', 'APLICADO', 'CANCELADA', 'CONFIRMACAO', 'ENCERRADA',
  'ENTREGUE', 'FINALIZADA', 'PEDIDO', 'RECEBIDO', 'RECONSULTA', 'VISUALIZADA',
];

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}
function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function RelatorioAtendimentos({ itens, profissionais, vendedores, servicos, filtros }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [dataDe, setDataDe]   = useState(filtros.dataDe);
  const [dataFim, setDataFim] = useState(filtros.dataFim);
  const [atendenteId, setAtendenteId] = useState(filtros.atendenteId || 'todos');
  const [situacao, setSituacao]       = useState(filtros.situacao || 'todas');
  const [tipoServico, setTipoServico] = useState(filtros.tipoServico || 'todos');
  const [somenteBaixadas, setSomenteBaixadas] = useState(filtros.somenteBaixadas);
  const [secao, setSecao]     = useState(filtros.secao);
  const [grupo, setGrupo]     = useState(filtros.grupo);
  const [produto, setProduto] = useState(filtros.produto);
  const [vetId, setVetId]     = useState(filtros.vetId || 'todos');

  // ── Cliente: busca com lupa (igual ao legado) ──
  const [clienteQ, setClienteQ] = useState(filtros.clienteNome);
  const [clienteId, setClienteId] = useState(filtros.clienteId);
  const [clienteOpts, setClienteOpts] = useState<Cliente[]>([]);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (clienteId) return; // já selecionado — não busca de novo
    if (debRef.current) clearTimeout(debRef.current);
    if (clienteQ.trim().length < 3) { setClienteOpts([]); return; }
    debRef.current = setTimeout(async () => {
      setClienteOpts(await buscarClientes(clienteQ.trim()));
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [clienteQ, clienteId]);

  const [detalhado, setDetalhado] = useState(false);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  function toggleAberto(id: number) {
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }

  function pesquisar() {
    const sp = new URLSearchParams();
    sp.set('data_de', dataDe);
    sp.set('data_fim', dataFim);
    if (atendenteId !== 'todos') sp.set('atendente_id', atendenteId);
    if (situacao !== 'todas')    sp.set('situacao', situacao);
    if (clienteId)               sp.set('cliente_id', clienteId);
    if (clienteQ)                sp.set('cliente_nome', clienteQ);
    if (tipoServico !== 'todos') sp.set('tipo_servico', tipoServico);
    if (somenteBaixadas)         sp.set('somente_baixadas', '1');
    if (secao)                   sp.set('secao', secao);
    if (grupo)                   sp.set('grupo', grupo);
    if (produto)                  sp.set('produto', produto);
    if (vetId !== 'todos')       sp.set('vet_id', vetId);
    startTransition(() => router.push(`/relatorios/atendimentos?${sp.toString()}`));
  }

  // Agrupa item a item por agenda (1 agenda pode ter vários produtos/serviços)
  const agendasAgrupadas = useMemo(() => {
    const mapa = new Map<number, ItemRelatorioAgenda[]>();
    for (const it of itens) {
      if (!mapa.has(it.id_orca)) mapa.set(it.id_orca, []);
      mapa.get(it.id_orca)!.push(it);
    }
    return Array.from(mapa.entries()).map(([id, linhas]) => ({ id, linhas, cab: linhas[0] }));
  }, [itens]);

  const totalGeral = useMemo(() => itens.reduce((s, i) => s + i.total_item, 0), [itens]);

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
          <CalendarClock className="h-5 w-5 text-primary" />
          Relatório de Agendas
        </h1>
      </div>

      {/* Filtros — mesmos do sistema legado */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Entre datas</label>
            <Input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Por atendente</label>
            <Select value={atendenteId} onValueChange={(v) => setAtendenteId(v ?? 'todos')}
              items={[{ value: 'todos', label: 'Todos' }, ...vendedores.map((v) => ({ value: String(v.id), label: v.nome }))]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {vendedores.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Situação</label>
            <Select value={situacao} onValueChange={(v) => setSituacao(v ?? 'todas')}
              items={[{ value: 'todas', label: 'Todas' }, ...SITUACOES.map((s) => ({ value: s, label: s }))]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {SITUACOES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-2 relative">
            <label className="text-xs text-muted-foreground">Cliente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={clienteQ}
                onChange={(e) => { setClienteQ(e.target.value); setClienteId(''); }}
                placeholder="Buscar cliente..."
                className="h-9 text-sm pl-8 pr-7"
              />
              {(clienteQ || clienteId) && (
                <button onClick={() => { setClienteQ(''); setClienteId(''); setClienteOpts([]); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
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

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Tipo de Serviço</label>
            <Select value={tipoServico} onValueChange={(v) => setTipoServico(v ?? 'todos')}
              items={[{ value: 'todos', label: 'Todos' }, ...servicos.map((s) => ({ value: s.descricao, label: s.descricao }))]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {servicos.map((s) => <SelectItem key={s.id} value={s.descricao}>{s.descricao}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vet. / Tec.</label>
            <Select value={vetId} onValueChange={(v) => setVetId(v ?? 'todos')}
              items={[{ value: 'todos', label: 'Todos' }, ...profissionais.map((p) => ({ value: String(p.id), label: p.nome }))]}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profissionais.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Por Seção (código)</label>
            <Input value={secao} onChange={(e) => setSecao(e.target.value)} className="h-9 text-sm" placeholder="Cód. seção" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Por Grupo (código)</label>
            <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} className="h-9 text-sm" placeholder="Cód. grupo" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Por Produto (código)</label>
            <Input value={produto} onChange={(e) => setProduto(e.target.value)} className="h-9 text-sm" placeholder="Cód. produto" />
          </div>
          <label className="flex items-center gap-2 h-9 text-sm">
            <input type="checkbox" checked={somenteBaixadas} onChange={(e) => setSomenteBaixadas(e.target.checked)} className="h-4 w-4 rounded border-input" />
            Somente baixadas
          </label>
        </div>

        <div className="flex justify-end">
          <Button onClick={pesquisar} size="sm">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Pesquisar
          </Button>
        </div>
      </div>

      {/* Totais + toggle detalhes */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">
          {agendasAgrupadas.length} agenda{agendasAgrupadas.length === 1 ? '' : 's'} · {itens.length} item{itens.length === 1 ? '' : 's'} · Total: <strong className="text-primary">{fmtMoeda(totalGeral)}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={() => setDetalhado((v) => !v)}>
          {detalhado ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
          {detalhado ? '- Detalhes' : '+ Detalhes'}
        </Button>
      </div>

      {/* Resultado */}
      {agendasAgrupadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground rounded-xl border bg-card">
          <CalendarClock className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado para os filtros informados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agendasAgrupadas.map(({ id, linhas, cab }) => {
            const aberto = abertos.has(id);
            const totalAgenda = linhas.reduce((s, l) => s + l.total_item, 0);
            return (
              <div key={id} className="rounded-lg border bg-card overflow-hidden">
                <button type="button" onClick={() => toggleAberto(id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left text-sm">
                  {aberto ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">#{id}</span>
                  <span className="w-24 shrink-0 text-xs">{fmtData(cab.data)} {cab.hora?.slice(0, 5)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border shrink-0">{cab.situacao || '—'}</span>
                  <span className="flex-1 min-w-0 truncate font-medium">{cab.cliente}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{cab.animal}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{linhas.length} item{linhas.length === 1 ? '' : 's'}</span>
                  <span className="font-semibold text-primary shrink-0 w-24 text-right">{fmtMoeda(totalAgenda)}</span>
                </button>

                {aberto && (
                  <div className="border-t overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto/Serviço</TableHead>
                          <TableHead className="w-20 text-right">Qtd</TableHead>
                          <TableHead className="w-28 text-right">Preço Unit.</TableHead>
                          <TableHead className="w-20 text-right">Desc.</TableHead>
                          <TableHead className="w-28 text-right">Preço Líq.</TableHead>
                          <TableHead className="w-28 text-right">Total</TableHead>
                          {detalhado && <TableHead>Seção / Grupo</TableHead>}
                          {detalhado && <TableHead>Profissional / Vendedor</TableHead>}
                          {detalhado && <TableHead>Contato</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linhas.map((l) => (
                          <TableRow key={l.id_prodorca}>
                            <TableCell className="text-sm">
                              <span className="font-medium">{l.desc_pro}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{l.cod_prod}</span>
                            </TableCell>
                            <TableCell className="text-right text-sm">{l.qtd}</TableCell>
                            <TableCell className="text-right text-sm">{fmtMoeda(l.preco_tabela)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{l.desconto}%</TableCell>
                            <TableCell className="text-right text-sm">{fmtMoeda(l.valorliq)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmtMoeda(l.total_item)}</TableCell>
                            {detalhado && (
                              <TableCell className="text-xs text-muted-foreground">
                                {[l.desc_secao, l.desc_grupo].filter(Boolean).join(' / ') || '—'}
                              </TableCell>
                            )}
                            {detalhado && (
                              <TableCell className="text-xs text-muted-foreground">
                                {[l.profissional, l.nome_vend].filter(Boolean).join(' / ') || '—'}
                              </TableCell>
                            )}
                            {detalhado && (
                              <TableCell className="text-xs text-muted-foreground">
                                {[l.fone1, l.fone2, l.celular].filter(Boolean).join(' · ') || '—'}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
