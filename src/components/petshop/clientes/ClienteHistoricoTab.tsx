'use client';

import { useEffect, useState } from 'react';
import { buscarHistoricoCliente, type HistoricoCliente } from '@/app/(petshop)/clientes/historico-actions';
import {
  CalendarDays, ShoppingBag, Truck, ClipboardList, Stethoscope,
  Loader2, TrendingUp, Clock, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Props {
  clienteId: number;
  filial:    number;
}

type SubTab = 'compras' | 'agendas' | 'prevendas' | 'teleentregas' | 'consultas';

function fmtData(s: string) {
  if (!s) return '—';
  const clean = s.slice(0, 10);
  const [y, m, d] = clean.split('-');
  if (y && m && d) return `${d}/${m}/${y}`;
  return clean;
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtMoedaStr(s: string) {
  const v = parseFloat(String(s).replace(',', '.')) || 0;
  return fmtMoeda(v);
}

const statusAgenda: Record<number, { label: string; cls: string }> = {
  1: { label: 'Agendado',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  2: { label: 'Confirmado', cls: 'bg-green-100 text-green-700 border-green-200' },
  3: { label: 'Realizado',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  4: { label: 'Cancelado',  cls: 'bg-red-100 text-red-700 border-red-200' },
};

const statusPrevenda: Record<number, { label: string; cls: string }> = {
  1: { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  2: { label: 'Confirmado', cls: 'bg-green-100 text-green-700 border-green-200' },
  4: { label: 'Cancelado',  cls: 'bg-red-100 text-red-700 border-red-200' },
};

const statusTele: Record<number, { label: string; cls: string }> = {
  1: { label: 'Aberta',    cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  3: { label: 'Entregue',  cls: 'bg-green-100 text-green-700 border-green-200' },
  4: { label: 'Cancelada', cls: 'bg-red-100 text-red-700 border-red-200' },
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', cls)}>
      {label}
    </span>
  );
}

const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'compras',      label: 'Compras',       icon: ShoppingBag  },
  { id: 'agendas',      label: 'Agendas',        icon: CalendarDays },
  { id: 'prevendas',    label: 'Pré-Vendas',     icon: ClipboardList},
  { id: 'teleentregas', label: 'Tele-Entregas',  icon: Truck        },
  { id: 'consultas',    label: 'Consultas',      icon: Stethoscope  },
];

export default function ClienteHistoricoTab({ clienteId, filial }: Props) {
  const [dados,      setDados]      = useState<HistoricoCliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sub,        setSub]        = useState<SubTab>('compras');

  useEffect(() => {
    buscarHistoricoCliente(clienteId, filial)
      .then(setDados)
      .finally(() => setCarregando(false));
  }, [clienteId, filial]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Carregando histórico...
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="text-center h-48 flex items-center justify-center text-sm text-muted-foreground">
        Não foi possível carregar o histórico.
      </div>
    );
  }

  const totalCompras     = dados.compras.length;
  const totalAgendas     = dados.agendas.length;
  const totalPrevendas   = dados.prevendas.length;
  const totalTele        = dados.teleentregas.length;
  const totalConsultas   = dados.consultas.length;

  const counts: Record<SubTab, number> = {
    compras:      totalCompras,
    agendas:      totalAgendas,
    prevendas:    totalPrevendas,
    teleentregas: totalTele,
    consultas:    totalConsultas,
  };

  return (
    <div className="space-y-4">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Total gasto</span>
          </div>
          <p className="text-lg font-bold text-primary">{fmtMoeda(dados.totalGasto)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span className="text-xs">Itens comprados</span>
          </div>
          <p className="text-lg font-bold">{totalCompras}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Atendimentos</span>
          </div>
          <p className="text-lg font-bold">{totalAgendas + totalConsultas}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Última compra</span>
          </div>
          <p className="text-sm font-bold">{dados.ultimaCompra ? fmtData(dados.ultimaCompra) : '—'}</p>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSub(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              sub === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {counts[id] > 0 && (
              <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5">{counts[id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da sub-aba */}
      <div className="rounded-xl border bg-card overflow-hidden">

        {/* ── Compras ── */}
        {sub === 'compras' && (
          dados.compras.length === 0 ? (
            <Empty icon={ShoppingBag} texto="Nenhuma compra em nota fiscal registrada." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Data</th>
                  <th className="text-left px-4 py-2.5">Produto</th>
                  <th className="text-right px-4 py-2.5 w-16">Qtd</th>
                  <th className="text-right px-4 py-2.5 w-28">Valor Unit.</th>
                  <th className="text-right px-4 py-2.5 w-20 hidden md:table-cell">NF</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.compras.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs">{fmtData(c.data)}</td>
                    <td className="px-4 py-2.5">
                      <p>{c.produto}</p>
                      <p className="text-xs text-muted-foreground">{c.unidade}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">{c.qtd}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{fmtMoedaStr(c.valor_unit)}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      {c.num_nf || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* ── Agendas ── */}
        {sub === 'agendas' && (
          dados.agendas.length === 0 ? (
            <Empty icon={CalendarDays} texto="Nenhuma agenda encontrada para este cliente." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Data/Hora</th>
                  <th className="text-left px-4 py-2.5">Serviço</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Animal</th>
                  <th className="text-left px-4 py-2.5 hidden lg:table-cell">Profissional</th>
                  <th className="text-center px-4 py-2.5 w-28">Status</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.agendas.map((a) => {
                  const st = statusAgenda[a.status] ?? { label: `#${a.status}`, cls: 'bg-muted text-muted-foreground border-border' };
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                        {fmtData(a.data)}{a.hora ? ` ${a.hora}` : ''}
                      </td>
                      <td className="px-4 py-2.5">{a.servico || '—'}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{a.animal || '—'}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{a.profissional || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><Badge {...st} /></td>
                      <td className="px-4 py-2.5">
                        <Link href={`/agenda/${a.id}`} className="text-xs text-primary hover:underline">Ver</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* ── Pré-Vendas ── */}
        {sub === 'prevendas' && (
          dados.prevendas.length === 0 ? (
            <Empty icon={ClipboardList} texto="Nenhuma pré-venda encontrada para este cliente." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Data</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Animal</th>
                  <th className="text-right px-4 py-2.5 w-28">Valor</th>
                  <th className="text-center px-4 py-2.5 w-28">Status</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.prevendas.map((p) => {
                  const st = statusPrevenda[p.status] ?? { label: `#${p.status}`, cls: 'bg-muted text-muted-foreground border-border' };
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{fmtData(p.data)}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{p.animal || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtMoeda(p.valor)}</td>
                      <td className="px-4 py-2.5 text-center"><Badge {...st} /></td>
                      <td className="px-4 py-2.5">
                        <Link href={`/prevendas/${p.id}`} className="text-xs text-primary hover:underline">Ver</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* ── Tele-Entregas ── */}
        {sub === 'teleentregas' && (
          dados.teleentregas.length === 0 ? (
            <Empty icon={Truck} texto="Nenhuma tele-entrega encontrada para este cliente." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Data</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Entrega</th>
                  <th className="text-right px-4 py-2.5 w-28">Valor</th>
                  <th className="text-center px-4 py-2.5 w-28">Status</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.teleentregas.map((t) => {
                  const st = statusTele[t.status] ?? { label: `#${t.status}`, cls: 'bg-muted text-muted-foreground border-border' };
                  return (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs">{fmtData(t.data)}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{fmtData(t.data_entrega)}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmtMoeda(t.valor)}</td>
                      <td className="px-4 py-2.5 text-center"><Badge {...st} /></td>
                      <td className="px-4 py-2.5">
                        <Link href={`/tele-entregas/${t.id}`} className="text-xs text-primary hover:underline">Ver</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* ── Consultas ── */}
        {sub === 'consultas' && (
          dados.consultas.length === 0 ? (
            <Empty icon={Stethoscope} texto="Nenhuma consulta encontrada para este cliente." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Data</th>
                  <th className="text-left px-4 py-2.5">Animal</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Motivo</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dados.consultas.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-xs">{fmtData(c.data)}</td>
                    <td className="px-4 py-2.5">{c.animal || '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{c.motivo || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/consultas/${c.id}`} className="text-xs text-primary hover:underline">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, texto }: { icon: React.ElementType; texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
      <Icon className="h-8 w-8 opacity-30" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}
