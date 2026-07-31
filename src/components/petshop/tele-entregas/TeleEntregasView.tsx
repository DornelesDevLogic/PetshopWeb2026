'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck, Search, X, Plus, CheckCircle, XCircle, Pencil,
  MapPin, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { type TeleEntrega } from '@/app/(petshop)/tele-entregas/actions';
import { confirmarTeleEntrega, cancelarTeleEntrega } from '@/app/(petshop)/tele-entregas/actions';

// ---------- helpers ----------

function fmtMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtData(s: string) {
  if (!s) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split(' ')[0];
  const [y, m, dd] = d.split('-');
  if (!dd) return s;
  return `${dd}/${m}/${y}`;
}

const STATUS_LABEL: Record<number, string> = { 1: 'Aberta', 3: 'Entregue', 4: 'Cancelada' };
const STATUS_CLS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  3: 'bg-green-100 text-green-700',
  4: 'bg-red-100 text-red-700',
};

// ---------- component ----------

interface Filtros { busca: string; status: string; data_de: string; data_ate: string; skip: number; }

interface Props {
  entregas: TeleEntrega[];
  total:    number;
  filtros:  Filtros;
}

export default function TeleEntregasView({ entregas, total, filtros }: Props) {
  const router = useRouter();
  const [busca,    setBusca]    = useState(filtros.busca);
  const [status,   setStatus]   = useState(filtros.status);
  const [dataDe,   setDataDe]   = useState(filtros.data_de);
  const [dataAte,  setDataAte]  = useState(filtros.data_ate);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  // modal de cancelamento
  const [cancelando, setCancelando] = useState<TeleEntrega | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => () => { if (debRef.current) clearTimeout(debRef.current); }, []);

  function navegar(extra?: Partial<Filtros>) {
    const f = { busca, status, data_de: dataDe, data_ate: dataAte, skip: 0, ...extra };
    const sp = new URLSearchParams();
    if (f.busca)    sp.set('busca', f.busca);
    if (f.status)   sp.set('status', f.status);
    if (f.data_de)  sp.set('data_de', f.data_de);
    if (f.data_ate) sp.set('data_ate', f.data_ate);
    if (f.skip > 0) sp.set('skip', String(f.skip));
    startTransition(() => router.push(`/tele-entregas?${sp}`));
  }

  function navegarDebounced(extra?: Partial<Filtros>) {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => navegar(extra), 450);
  }

  async function handleConfirmar(e: TeleEntrega) {
    if (!confirm(`Confirmar entrega #${e.id} para ${e.cliente}?`)) return;
    const res = await confirmarTeleEntrega(e.id);
    if (res.CodStatus === 1) router.refresh();
    else alert(res.DescricaoStatus);
  }

  async function handleCancelar() {
    if (!cancelando) return;
    if (!justificativa.trim()) { setErro('Informe a justificativa'); return; }
    setSalvando(true);
    const res = await cancelarTeleEntrega(cancelando.id, justificativa);
    setSalvando(false);
    if (res.CodStatus === 1) { setCancelando(null); setJustificativa(''); router.refresh(); }
    else setErro(res.DescricaoStatus);
  }

  const PAGE = 100;
  const skip = filtros.skip;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">

      {/* cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Tele-entregas
        </h1>
        <Link href="/tele-entregas/nova">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Entrega
          </Button>
        </Link>
      </div>

      {/* filtros */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* busca */}
          <div className="space-y-1 col-span-2 lg:col-span-1">
            <label className="text-xs text-muted-foreground">Cliente / Animal / Endereço</label>
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-9">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={busca}
                onChange={(e) => { setBusca(e.target.value); navegarDebounced({ busca: e.target.value }); }}
                placeholder="Buscar..."
                className="flex-1 min-w-0 text-sm bg-transparent outline-none"
                autoFocus
              />
              {busca && (
                <button onClick={() => { setBusca(''); navegar({ busca: '' }); }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* status */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); navegar({ status: e.target.value }); }}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Aberta + Entregue</option>
              <option value="1">Aberta</option>
              <option value="3">Entregue</option>
              <option value="4">Cancelada</option>
              <option value="99">Todas</option>
            </select>
          </div>

          {/* data de */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data início</label>
            <Input
              type="date"
              value={dataDe}
              onChange={(e) => { setDataDe(e.target.value); navegar({ data_de: e.target.value }); }}
              className="h-9 text-sm"
            />
          </div>

          {/* data ate */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Input
              type="date"
              value={dataAte}
              onChange={(e) => { setDataAte(e.target.value); navegar({ data_ate: e.target.value }); }}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} entrega{total === 1 ? '' : 's'} encontrada{total === 1 ? '' : 's'}
      </p>

      {/* grade */}
      {entregas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
          <Truck className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhuma tele-entrega encontrada.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 px-2">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Endereço</TableHead>
                <TableHead className="w-24 px-2">Data</TableHead>
                <TableHead className="w-24 px-2 hidden sm:table-cell">Entrega</TableHead>
                <TableHead className="text-right w-24 px-2">Valor</TableHead>
                <TableHead className="w-24 px-2 text-center">Status</TableHead>
                <TableHead className="w-28 px-1 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((e) => (
                <TableRow key={e.id} className={cn('hover:bg-muted/40', e.pago === 'PAGO' && 'bg-green-50 dark:bg-green-950/20')}>
                  <TableCell className="font-mono text-xs text-muted-foreground px-2">
                    {e.id}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <Link href={`/tele-entregas/${e.id}`} className="hover:underline">
                      {e.cliente}
                    </Link>
                    {e.animal && (
                      <p className="text-xs text-muted-foreground">{e.animal}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{[e.endereco, e.nro_endereco, e.bairro].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs px-2">{fmtData(e.data)}</TableCell>
                  <TableCell className="text-xs px-2 hidden sm:table-cell">
                    {e.data_entrega ? fmtData(e.data_entrega) : '—'}
                    {e.hora_entrega && <span className="text-muted-foreground ml-1">{e.hora_entrega.slice(0,5)}</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono font-semibold text-primary px-2">
                    R$ {fmtMoeda(e.valor)}
                  </TableCell>
                  <TableCell className="px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_CLS[e.status] ?? 'bg-muted text-muted-foreground')}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </span>
                      {e.pago === 'PAGO' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Pago
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/tele-entregas/${e.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {e.status === 1 && (
                        <>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            title="Confirmar entrega"
                            onClick={() => handleConfirmar(e)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            title="Cancelar"
                            onClick={() => { setCancelando(e); setJustificativa(''); setErro(''); }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* paginação */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline" size="sm"
          disabled={skip === 0}
          onClick={() => navegar({ skip: Math.max(0, skip - PAGE) })}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          {skip + 1}–{skip + entregas.length}
        </span>
        <Button
          variant="outline" size="sm"
          disabled={entregas.length < PAGE}
          onClick={() => navegar({ skip: skip + PAGE })}
        >
          Próxima <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* modal cancelar */}
      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold">Cancelar entrega #{cancelando.id}</h2>
            <p className="text-sm text-muted-foreground">{cancelando.cliente}</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Justificativa *</label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2 text-sm resize-none h-20 outline-none focus:ring-2 ring-primary"
                placeholder="Motivo do cancelamento..."
              />
              {erro && <p className="text-xs text-destructive">{erro}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelando(null)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={salvando}>
                {salvando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
