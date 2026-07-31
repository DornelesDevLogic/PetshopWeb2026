'use client';

import { useState, useEffect } from 'react';
import {
  X, Loader2, PawPrint, Phone, Smartphone, Scale, CalendarClock,
  Stethoscope, ClipboardList, FlaskConical, BellRing, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_AGENDA } from '@/types/petshop';
import {
  buscarHistoricoAnimal,
  type HistoricoAnimal,
} from '@/app/(petshop)/agenda/historico-animal-actions';

// ---------- helpers ----------

function fmtMoeda(v: string | number) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtData(s: string) {
  if (!s) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split(' ')[0].split('T')[0];
  const [y, m, dd] = d.split('-');
  if (!dd) return s || '—';
  return `${dd}/${m}/${y}`;
}

const TABS = [
  { key: 'agendas',     label: 'Agendas',     icon: CalendarClock },
  { key: 'consultas',   label: 'Consultas',   icon: Stethoscope },
  { key: 'prontuarios', label: 'Prontuário',  icon: ClipboardList },
  { key: 'exames',      label: 'Exames',      icon: FlaskConical },
  { key: 'estimativas', label: 'Estimativas', icon: BellRing },
] as const;

type TabKey = typeof TABS[number]['key'];

const ESTIMATIVA_STATUS: Record<number, { label: string; cls: string }> = {
  0: { label: 'Pendente',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  1: { label: 'Enviada',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  2: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
};

function Vazio({ texto }: { texto: string }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{texto}</p>;
}

// ---------- modal principal ----------

interface Props {
  animalId:    number;
  animalNome:  string;
  clienteId:   number;
  clienteNome: string;
  filial?:     number;
  onClose:     () => void;
}

export default function HistoricoAnimalModal({ animalId, animalNome, clienteId, clienteNome, filial, onClose }: Props) {
  const [dados, setDados] = useState<HistoricoAnimal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState<TabKey>('agendas');

  useEffect(() => {
    buscarHistoricoAnimal(animalId, clienteId, filial)
      .then(setDados)
      .finally(() => setCarregando(false));
  }, [animalId, clienteId, filial]);

  // fechar com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const counts: Record<TabKey, number> = {
    agendas:     dados?.agendas.length     ?? 0,
    consultas:   dados?.consultas.length   ?? 0,
    prontuarios: dados?.prontuarios.length ?? 0,
    exames:      dados?.exames.length      ?? 0,
    estimativas: dados?.estimativas.length ?? 0,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* cabeçalho */}
        <div className="flex items-start gap-3 px-5 py-4 border-b shrink-0">
          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="font-semibold text-base leading-tight flex items-center gap-1.5">
              <History className="h-4 w-4 text-primary shrink-0" />
              Histórico do Animal
            </h2>
            <p className="text-sm text-muted-foreground truncate">{clienteNome}</p>
            {!carregando && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <PawPrint className="h-3 w-3" />
                  {animalNome}{dados?.animal?.raca ? ` · ${dados.animal.raca}` : ''}
                </span>
                {dados?.animal?.peso && Number(dados.animal.peso) > 0 && (
                  <span className="flex items-center gap-1">
                    <Scale className="h-3 w-3" /> {Number(dados.animal.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg
                  </span>
                )}
                {dados?.cliente?.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {dados.cliente.telefone}
                  </span>
                )}
                {dados?.cliente?.celular && (
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> {dados.cliente.celular}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {carregando ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          </div>
        ) : (
          <>
            {/* abas */}
            <div className="flex gap-1 px-5 pt-3 border-b overflow-x-auto shrink-0">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md whitespace-nowrap transition-colors -mb-px border-b-2',
                    tab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className={cn(
                    'ml-0.5 rounded-full px-1.5 text-[10px] font-mono',
                    tab === key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* conteúdo da aba */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

              {tab === 'agendas' && (
                counts.agendas === 0 ? <Vazio texto="Nenhuma agenda encontrada para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.agendas.map((a) => {
                      const st = STATUS_AGENDA[a.status] ?? { label: String(a.status), color: 'bg-muted text-muted-foreground' };
                      return (
                        <div key={a.id} className="rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              #{a.id} · {a.servico || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {fmtData(a.data)}{a.hora ? ` às ${a.hora.slice(0, 5)}` : ''}
                              {a.profissional ? ` · ${a.profissional}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono text-primary">R$ {fmtMoeda(a.sub_total || a.valor)}</span>
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', st.color)}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {tab === 'consultas' && (
                counts.consultas === 0 ? <Vazio texto="Nenhuma consulta encontrada para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.consultas.map((c) => (
                      <div key={c.id} className="rounded-lg border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">#{c.id} · {c.veterinario || '—'}</p>
                          <span className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            c.status === 'FECHADO'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200',
                          )}>
                            {c.status === 'FECHADO' ? 'Fechada' : 'Aberta'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtData(c.data)}</p>
                        {c.motivo && <p className="text-xs mt-1">{c.motivo}</p>}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'prontuarios' && (
                counts.prontuarios === 0 ? <Vazio texto="Nenhum registro de prontuário para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.prontuarios.map((p) => (
                      <div key={p.id} className="rounded-lg border px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">
                          {fmtData(p.data)}{p.hora ? ` às ${p.hora.slice(0, 5)}` : ''}{p.box ? ` · Box ${p.box}` : ''}
                        </p>
                        {p.obs && <p className="text-sm mt-1">{p.obs}</p>}
                        {p.medicacao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Medicação: {p.medicacao}{p.dose ? ` · ${p.dose}` : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'exames' && (
                counts.exames === 0 ? <Vazio texto="Nenhum exame encontrado para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.exames.map((e) => (
                      <div key={e.id} className="rounded-lg border px-3 py-2.5 flex items-center justify-between">
                        <p className="text-sm">Exame #{e.id}{e.consulta_id ? ` · Consulta #${e.consulta_id}` : ''}</p>
                        {e.data && <p className="text-xs text-muted-foreground">{fmtData(e.data)}</p>}
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'estimativas' && (
                counts.estimativas === 0 ? <Vazio texto="Nenhuma estimativa encontrada para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.estimativas.map((e) => {
                      const st = ESTIMATIVA_STATUS[e.status] ?? { label: String(e.status), cls: 'bg-muted text-muted-foreground' };
                      return (
                        <div key={e.id} className="rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{e.produto}</p>
                            <p className="text-xs text-muted-foreground">
                              Comprado em {fmtData(e.data_compra)} · previsto para {fmtData(e.data_estimada)}
                            </p>
                          </div>
                          <span className={cn('shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', st.cls)}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
