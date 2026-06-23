'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Eye, CheckCircle, XCircle, Plus } from 'lucide-react';
import { PreVenda, confirmarPreVenda, cancelarPreVenda } from '@/app/(petshop)/prevendas/actions';

const LIMIT = 100;

const STATUS_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  2: { label: 'Confirmado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  4: { label: 'Cancelado',  cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(s: string) {
  if (!s) return '-';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split(/[T ]/)[0];
  const [y, m, day] = d.split('-');
  if (!day) return s;
  return `${day}/${m}/${y}`;
}

interface Props {
  dados: PreVenda[];
  total: number;
  skip: number;
  filtros: { status?: string; data_de?: string; data_ate?: string };
}

export default function PrevendasView({ dados, total, skip, filtros }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startT] = useTransition();

  const [status, setStatus] = useState(filtros.status ?? '');
  const [dataDe, setDataDe] = useState(filtros.data_de ?? '');
  const [dataAte, setDataAte] = useState(filtros.data_ate ?? '');

  // modal cancelamento
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [just, setJust] = useState('');
  const [erro, setErro] = useState('');

  function navParams(extra: Record<string, string | number>) {
    const p = new URLSearchParams();
    if (status)  p.set('status',   status);
    if (dataDe)  p.set('data_de',  dataDe);
    if (dataAte) p.set('data_ate', dataAte);
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return `${pathname}?${p.toString()}`;
  }

  function pesquisar() {
    router.push(navParams({ skip: 0 }));
  }

  async function handleConfirmar(id: number) {
    startT(async () => {
      const r = await confirmarPreVenda(id);
      if (r.CodStatus !== 1) alert(r.DescricaoStatus);
      router.refresh();
    });
  }

  async function handleCancelar() {
    if (!cancelId) return;
    if (!just.trim()) { setErro('Informe a justificativa.'); return; }
    startT(async () => {
      const r = await cancelarPreVenda(cancelId, just.trim());
      if (r.CodStatus !== 1) { setErro(r.DescricaoStatus); return; }
      setCancelId(null);
      setJust('');
      setErro('');
      router.refresh();
    });
  }

  const pagAnt = skip > 0 ? navParams({ skip: Math.max(0, skip - LIMIT) }) : null;
  const pagPro = total >= LIMIT ? navParams({ skip: skip + LIMIT }) : null;

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pré-vendas</h1>
        <Link
          href="/prevendas/nova"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova Pré-venda
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-lg border bg-card p-3">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Pendente + Confirmado</option>
          <option value="1">Pendente</option>
          <option value="2">Confirmado</option>
          <option value="4">Cancelado</option>
        </select>
        <input
          type="date"
          value={dataDe}
          onChange={e => setDataDe(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dataAte}
          onChange={e => setDataAte(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        <button
          onClick={pesquisar}
          disabled={pending}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Pesquisar
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Animal / Prof.</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Entrega</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {dados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhuma pré-venda encontrada.
                </td>
              </tr>
            )}
            {dados.map(pv => {
              const st = STATUS_LABEL[pv.status] ?? { label: String(pv.status), cls: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={pv.id} className={`hover:bg-muted/30${pv.pago === 'PAGO' ? ' bg-green-50 dark:bg-green-950/20' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{pv.id}</td>
                  <td className="px-3 py-2 font-medium">{pv.cliente}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {pv.animal || pv.profissional ? (
                      <span>{pv.animal}{pv.animal && pv.profissional ? ' / ' : ''}{pv.profissional}</span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">{fmtDate(pv.data)}</td>
                  <td className="px-3 py-2">{fmtDate(pv.data_entrega)}</td>
                  <td className="px-3 py-2 text-right font-medium">{fmt(pv.valor)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                      {pv.pago === 'PAGO' && (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          Pago
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/prevendas/${pv.id}`}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Ver / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {pv.status === 1 && (
                        <>
                          <button
                            onClick={() => handleConfirmar(pv.id)}
                            disabled={pending}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-40"
                            title="Confirmar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setCancelId(pv.id); setJust(''); setErro(''); }}
                            disabled={pending}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-40"
                            title="Cancelar"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {(pagAnt || pagPro) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{skip + 1}–{skip + dados.length} de {total} registros</span>
          <div className="flex gap-2">
            {pagAnt && <Link href={pagAnt} className="rounded border px-3 py-1 hover:bg-accent">← Anterior</Link>}
            {pagPro && <Link href={pagPro} className="rounded border px-3 py-1 hover:bg-accent">Próximo →</Link>}
          </div>
        </div>
      )}

      {/* Modal cancelamento */}
      {cancelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold">Cancelar Pré-venda #{cancelId}</h2>
            <label className="mb-1 block text-sm font-medium">Justificativa <span className="text-red-500">*</span></label>
            <textarea
              value={just}
              onChange={e => setJust(e.target.value)}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {erro && <p className="mt-1 text-xs text-red-500">{erro}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setCancelId(null); setJust(''); setErro(''); }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={pending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
