'use client';

import { useState, useEffect } from 'react';
import {
  X, Loader2, PawPrint, Phone, Smartphone, Scale, CalendarClock,
  Stethoscope, ClipboardList, FlaskConical, BellRing, History, Eye, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_AGENDA, ConsultaDetalhe, AgendaItemServico } from '@/types/petshop';
import {
  buscarHistoricoAnimal,
  type HistoricoAnimal,
} from '@/app/(petshop)/agenda/historico-animal-actions';

// ---------- expansão inline (Agendas/Consultas) ----------

/** Campos de anamnese que valem a pena mostrar num resumo rápido, sem abrir
 * a tela inteira da consulta. */
const CAMPOS_RESUMO_CONSULTA: { key: keyof ConsultaDetalhe; label: string }[] = [
  { key: 'obs_gerais',      label: 'Observações Gerais' },
  { key: 'texto',           label: 'Resumo Anamnese' },
  { key: 'diagnostico_def', label: 'Diagnóstico' },
  { key: 'prognostico',     label: 'Prognóstico' },
  { key: 'prescricao',      label: 'Prescrição' },
];

// ---------- helpers ----------

function fmtMoeda(v: string | number) {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  { key: 'agendas',     label: 'Agendas',     icon: CalendarClock,  cor: 'blue'   },
  { key: 'consultas',   label: 'Consultas',   icon: Stethoscope,    cor: 'violet' },
  { key: 'prontuarios', label: 'Prontuário',  icon: ClipboardList,  cor: 'teal'   },
  { key: 'exames',      label: 'Exames',      icon: FlaskConical,   cor: 'amber'  },
  { key: 'estimativas', label: 'Estimativas', icon: BellRing,       cor: 'rose'   },
] as const;

/** Classes tailwind por cor de aba — geradas explicitamente (não montadas
 * com template string) porque o Tailwind escaneia o código em busca de
 * classes literais; `border-${cor}-500` não seria detectado no build.
 * Efeito "divisória de fichário": toda aba já nasce colorida (pastel);
 * a ativa fica com a cor cheia/sólida e "sobe" na frente das outras. */
const TAB_CORES: Record<string, {
  ativoBg: string; ativoTexto: string; ativoBadge: string;
  inativoBg: string; inativoTexto: string; inativoBadge: string;
}> = {
  blue: {
    ativoBg: 'bg-blue-500 dark:bg-blue-600', ativoTexto: 'text-white', ativoBadge: 'bg-white/25 text-white',
    inativoBg: 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950',
    inativoTexto: 'text-blue-700 dark:text-blue-300', inativoBadge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  },
  violet: {
    ativoBg: 'bg-violet-500 dark:bg-violet-600', ativoTexto: 'text-white', ativoBadge: 'bg-white/25 text-white',
    inativoBg: 'bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-950',
    inativoTexto: 'text-violet-700 dark:text-violet-300', inativoBadge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  teal: {
    ativoBg: 'bg-teal-500 dark:bg-teal-600', ativoTexto: 'text-white', ativoBadge: 'bg-white/25 text-white',
    inativoBg: 'bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-950',
    inativoTexto: 'text-teal-700 dark:text-teal-300', inativoBadge: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  amber: {
    ativoBg: 'bg-amber-500 dark:bg-amber-600', ativoTexto: 'text-white', ativoBadge: 'bg-white/25 text-white',
    inativoBg: 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-950',
    inativoTexto: 'text-amber-700 dark:text-amber-300', inativoBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  rose: {
    ativoBg: 'bg-rose-500 dark:bg-rose-600', ativoTexto: 'text-white', ativoBadge: 'bg-white/25 text-white',
    inativoBg: 'bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950',
    inativoTexto: 'text-rose-700 dark:text-rose-300', inativoBadge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
};

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

  // ── Expansão inline: agenda aberta mostra os itens/produtos, consulta
  // aberta mostra o resumo clínico — sem sair do modal/card. ──
  const [agendaAberta, setAgendaAberta] = useState<number | null>(null);
  const [itensPorAgenda, setItensPorAgenda] = useState<Record<number, AgendaItemServico[]>>({});
  const [carregandoAgenda, setCarregandoAgenda] = useState<number | null>(null);

  const [consultaAberta, setConsultaAberta] = useState<number | null>(null);
  const [detalhePorConsulta, setDetalhePorConsulta] = useState<Record<number, ConsultaDetalhe>>({});
  const [carregandoConsulta, setCarregandoConsulta] = useState<number | null>(null);

  async function toggleAgenda(a: HistoricoAnimal['agendas'][number]) {
    if (agendaAberta === a.id) { setAgendaAberta(null); return; }
    setAgendaAberta(a.id);
    if (itensPorAgenda[a.id]) return;
    setCarregandoAgenda(a.id);
    try {
      const r = await fetch(`/api/petshop/agenda/itens?id=${a.id}&filial=${a.filial ?? filial ?? ''}`);
      const d = await r.json();
      setItensPorAgenda((prev) => ({ ...prev, [a.id]: d.dados ?? [] }));
    } finally {
      setCarregandoAgenda(null);
    }
  }

  async function toggleConsulta(c: HistoricoAnimal['consultas'][number]) {
    if (consultaAberta === c.id) { setConsultaAberta(null); return; }
    setConsultaAberta(c.id);
    if (detalhePorConsulta[c.id]) return;
    setCarregandoConsulta(c.id);
    try {
      const r = await fetch(`/api/petshop/consultas/detalhe?id=${c.id}&filial=${c.filial ?? filial ?? ''}`);
      const d = await r.json();
      setDetalhePorConsulta((prev) => ({ ...prev, [c.id]: d }));
    } finally {
      setCarregandoConsulta(null);
    }
  }

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
                    <Scale className="h-3 w-3" /> {Number(dados.animal.peso).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
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
            {/* abas — divisórias de fichário: cada uma já nasce colorida,
                a ativa fica solida e "sobe" na frente das outras */}
            <div className="flex gap-1.5 px-5 pt-3 border-b overflow-x-auto shrink-0">
              {TABS.map(({ key, label, icon: Icon, cor }) => {
                const cores = TAB_CORES[cor];
                const ativa = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-all -mb-px',
                      ativa
                        ? cn(cores.ativoBg, cores.ativoTexto, 'shadow-md scale-105 relative z-10')
                        : cn(cores.inativoBg, cores.inativoTexto, 'opacity-90 hover:opacity-100'),
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className={cn(
                      'ml-0.5 rounded-full px-1.5 text-[10px] font-mono',
                      ativa ? cores.ativoBadge : cores.inativoBadge,
                    )}>
                      {counts[key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* conteúdo da aba */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

              {tab === 'agendas' && (
                counts.agendas === 0 ? <Vazio texto="Nenhuma agenda encontrada para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.agendas.map((a) => {
                      const st = STATUS_AGENDA[a.status] ?? { label: String(a.status), color: 'bg-muted text-muted-foreground' };
                      const aberta = agendaAberta === a.id;
                      const itens = itensPorAgenda[a.id] ?? [];
                      return (
                        <div key={a.id} className="rounded-lg border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleAgenda(a)}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                          >
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
                              {aberta ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
                          </button>

                          {aberta && (
                            <div className="border-t px-3 py-2.5 bg-muted/20">
                              {carregandoAgenda === a.id ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />Carregando itens...
                                </p>
                              ) : itens.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">Nenhum produto/serviço lançado nessa agenda.</p>
                              ) : (
                                <div className="space-y-1">
                                  {itens.map((it) => (
                                    <div key={it.id_item} className="flex items-center justify-between gap-3 text-xs py-1">
                                      <span className="min-w-0 truncate">{it.descricao || it.produto}</span>
                                      <span className="shrink-0 text-muted-foreground font-mono">
                                        {it.qtd}x R$ {fmtMoeda(it.valor_liq || it.valor)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {tab === 'consultas' && (
                counts.consultas === 0 ? <Vazio texto="Nenhuma consulta encontrada para este pet." /> : (
                  <div className="space-y-2">
                    {dados!.consultas.map((c) => {
                      const aberta = consultaAberta === c.id;
                      const detalhe = detalhePorConsulta[c.id];
                      return (
                        <div key={c.id} className="rounded-lg border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleConsulta(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">#{c.id} · {c.veterinario || '—'}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                  c.status === 'FECHADO'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-blue-100 text-blue-700 border-blue-200',
                                )}>
                                  {c.status === 'FECHADO' ? 'Fechada' : 'Aberta'}
                                </span>
                                {aberta ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{fmtData(c.data)}</p>
                            {c.motivo && <p className="text-xs mt-1">{c.motivo}</p>}
                          </button>

                          {aberta && (
                            <div className="border-t px-3 py-2.5 bg-muted/20 space-y-2">
                              {carregandoConsulta === c.id ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />Carregando detalhes...
                                </p>
                              ) : !detalhe ? (
                                <p className="text-xs text-muted-foreground py-2">Não foi possível carregar os detalhes.</p>
                              ) : (
                                (() => {
                                  const campos = CAMPOS_RESUMO_CONSULTA
                                    .map((f) => ({ label: f.label, valor: String(detalhe[f.key] ?? '').trim() }))
                                    .filter((f) => f.valor !== '');
                                  return campos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">Nenhuma informação clínica registrada nessa consulta.</p>
                                  ) : (
                                    campos.map((f) => (
                                      <div key={f.label}>
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{f.label}</p>
                                        <p className="text-sm whitespace-pre-wrap">{f.valor}</p>
                                      </div>
                                    ))
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
