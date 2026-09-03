'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgendaDetalhe, AgendaItemServico, STATUS_AGENDA } from '@/types/petshop';
import { atualizarStatus, buscarDadosEmpresa, reagendarHorario } from '@/app/(petshop)/agenda/[id]/actions';
import { buscarClienteCompleto } from '@/app/(petshop)/clientes/actions';
import { buscarObsComanda } from '@/app/(petshop)/configuracoes/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CalendarDays,
  User,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Loader2,
  Printer,
  History,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { printWindow } from '@/lib/printWindow';
import { gerarCupomAgenda } from '@/components/petshop/print/cupomAgenda';
import ProdutosAgenda from './ProdutosAgenda';
import HistoricoEdicoesModal from './HistoricoEdicoesModal';
import { cn } from '@/lib/utils';

interface Props {
  detalhe:          AgendaDetalhe;
  itens:            AgendaItemServico[] | undefined;
  avisosProdutos?:  boolean;
  ehSupervisor?:    boolean;  // libera o botão "Histórico de Edições" (SENHA.TIPO='S')
}

function StatusBadge({ status }: { status: number }) {
  const s = STATUS_AGENDA[status] ?? { label: String(status), color: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.color)}>
      {s.label}
    </span>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('font-medium text-right', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

/** "DD/MM/YYYY" (ou "DD/MM/YYYY HH:MM:SS") -> "YYYY-MM-DD". Já em ISO, devolve como está. */
function brParaIso(data?: string): string {
  if (!data) return '';
  const dataParte = data.split(' ')[0];
  if (dataParte.includes('-')) return dataParte;
  const [d1, m1, y1] = dataParte.split('/');
  return d1 && m1 && y1 ? `${y1}-${m1}-${d1}` : '';
}

function fmtMoeda(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  if (isNaN(n)) return '—';
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─────────────── Ações disponíveis por status ─────────────── */
interface Acao {
  label:   string;
  status:  string;    // valor enviado ao backend
  variant: 'default' | 'outline' | 'destructive';
  icon:    React.ReactNode;
  confirm: boolean;   // precisa de confirmação?
}

const ACOES: Record<number, Acao[]> = {
  1: [
    { label: 'Confirmar Chegada',   status: 'CHEGOU',         variant: 'outline',     icon: <CheckCircle2 className="h-4 w-4" />, confirm: false },
    { label: 'Iniciar Atendimento', status: 'EM_ATENDIMENTO', variant: 'default',     icon: <PlayCircle   className="h-4 w-4" />, confirm: false },
    { label: 'Cancelar',            status: 'CANCELADO',      variant: 'destructive', icon: <XCircle      className="h-4 w-4" />, confirm: true  },
  ],
  2: [
    { label: 'Cancelar',            status: 'CANCELADO',      variant: 'destructive', icon: <XCircle      className="h-4 w-4" />, confirm: true  },
  ],
};

export default function AgendaDetalheView({ detalhe: d, itens, avisosProdutos, ehSupervisor }: Props) {
  const router = useRouter();
  const [isPending, startTransition]     = useTransition();
  const [errorMsg, setErrorMsg]          = useState('');
  const [confirmAcao, setConfirmAcao]    = useState<Acao | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [obsCanc, setObsCanc]            = useState('');

  const acoes = ACOES[d.status] ?? [];

  const [imprimindo, setImprimindo] = useState(false);

  /* ──── edição inline do horário de Término ──── */
  const [editandoTermino, setEditandoTermino] = useState(false);
  const [novoTermino, setNovoTermino]         = useState('');
  const [salvandoTermino, setSalvandoTermino] = useState(false);
  const [erroTermino, setErroTermino]         = useState('');

  function iniciarEdicaoTermino() {
    setNovoTermino(d.data_entrega?.split(' ')[1]?.slice(0, 5) || '');
    setErroTermino('');
    setEditandoTermino(true);
  }

  async function salvarTermino() {
    if (!novoTermino) { setErroTermino('Informe o horário.'); return; }
    setSalvandoTermino(true);
    setErroTermino('');
    const dataBase = brParaIso(d.data_entrega) || brParaIso(d.data);
    const result = await reagendarHorario(
      d.id,
      d.filial,
      brParaIso(d.data),
      '',
      undefined,
      `${dataBase}T${novoTermino}`,
      'Horário de término alterado manualmente',
    );
    setSalvandoTermino(false);
    if (result.error) { setErroTermino(result.error); return; }
    setEditandoTermino(false);
    router.refresh();
  }

  async function handlePrint() {
    setImprimindo(true);
    const [empresa, cliente, dadosAdicionais] = await Promise.all([
      buscarDadosEmpresa(d.filial).catch(() => null),
      buscarClienteCompleto(d.cliente_id).catch(() => null),
      buscarObsComanda().catch(() => ''),
    ]);
    setImprimindo(false);

    const html = gerarCupomAgenda({
      id:            d.id,
      cliente_id:    d.cliente_id,
      cliente:       d.cliente,
      telefone:      cliente?.telefone || d.telefone,
      celular:       cliente?.celular  || d.celular,
      endereco:      cliente?.endereco,
      numero:        cliente?.numero,
      bairro:        cliente?.bairro,
      cidade:        cliente?.cidade,
      data:          d.data,
      hora:          d.hora,
      data_previsao: d.data_previsao,
      data_entrega:  d.data_entrega,
      profissional:  d.profissional,
      vendedor:      d.vend_nome,
      servico:       d.servico,
      animal:        d.animal,
      raca:          d.raca,
      obs:           d.obs,
      valor:         d.sub_total || d.valor,
      itens:         itens,
      empresa,
      dadosAdicionais,
    });
    printWindow(html);
  }

  function executarAcao(acao: Acao, obs?: string) {
    setErrorMsg('');
    startTransition(async () => {
      const result = await atualizarStatus(d.id, acao.status, obs);
      if (result.error) { setErrorMsg(result.error); return; }
      setConfirmAcao(null);
      router.refresh();
    });
  }

  function handleAcaoClick(acao: Acao) {
    if (acao.confirm) {
      setObsCanc('');
      setConfirmAcao(acao);
    } else {
      executarAcao(acao);
    }
  }

  /* ──── extras de serviço com valor ──── */
  const extras = [
    { label: 'Banho Normal',  val: d.banho_normal },
    { label: 'Tosa Alta',     val: d.tosa_alta    },
    { label: 'Tosa Baixa',    val: d.tosa_baixa   },
    { label: 'Antipulga',     val: d.antipulga    },
    { label: 'Hidratação',    val: d.hidra        },
    { label: 'Medicação',     val: d.medic        },
  ].filter((e) => e.val && e.val !== '0' && e.val.trim() !== '');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">

      {/* ── Aviso de produtos com erro ── */}
      {avisosProdutos && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Agenda criada, mas alguns produtos não foram salvos. Adicione-os novamente na seção de produtos abaixo.
        </div>
      )}

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
          onClick={() => {
            // Volta pra onde o usuário realmente veio (ex: Visualização Rápida
            // com os filtros aplicados) em vez de sempre cair na grade do
            // calendário — só cai em /agenda se não há histórico pra voltar
            // (ex: link direto/nova aba).
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.push('/agenda');
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Agenda
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={d.status} />
          {acoes.map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant={a.variant}
              disabled={isPending}
              onClick={() => handleAcaoClick(a)}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : a.icon}
              <span className="ml-1.5">{a.label}</span>
            </Button>
          ))}
          <Button size="sm" onClick={handlePrint} disabled={imprimindo} className="gap-1.5 bg-blue-700 hover:bg-blue-800">
            {imprimindo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Imprimir
          </Button>
          {ehSupervisor && (
            <Button size="sm" variant="outline" onClick={() => setHistoricoAberto(true)} className="gap-1.5">
              <History className="h-4 w-4" />
              Histórico de Edições
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* ── Cards principais ── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Data / Hora / Profissional / Serviço */}
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Agendamento #{d.id}
          </h2>
          <InfoRow label="Data"         value={d.data} />
          <InfoRow label="Hora"         value={d.hora} />
          <div className="flex justify-between items-center gap-4 py-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">Término</span>
            {editandoTermino ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={novoTermino}
                  onChange={(e) => setNovoTermino(e.target.value)}
                  disabled={salvandoTermino}
                  autoFocus
                  className="h-7 rounded border px-1.5 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={salvarTermino}
                  disabled={salvandoTermino}
                  title="Salvar"
                  className="p-1 rounded hover:bg-muted text-green-600 disabled:opacity-50"
                >
                  {salvandoTermino ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoTermino(false)}
                  disabled={salvandoTermino}
                  title="Cancelar"
                  className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-right">{d.data_entrega?.split(' ')[1]?.slice(0, 5) || '—'}</span>
                {d.pode_editar && (
                  <button
                    type="button"
                    onClick={iniciarEdicaoTermino}
                    title="Editar horário de término"
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          {erroTermino && <p className="text-xs text-red-600 text-right -mt-1">{erroTermino}</p>}
          <InfoRow label="Profissional" value={d.profissional} />
          <InfoRow label="Serviço"      value={d.servico} />
          {d.obs && <InfoRow label="Obs"  value={d.obs} />}
          {d.data_canc && (
            <InfoRow label="Cancelado em" value={d.data_canc} />
          )}
          {d.justificativa && (
            <InfoRow label="Justificativa" value={d.justificativa} />
          )}
        </div>

        {/* Cliente / Animal */}
        <div className="rounded-xl border bg-card p-5 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente e Animal
          </h2>
          <InfoRow label="Cliente" value={d.cliente} />
          <InfoRow label="Animal"  value={d.animal} />
          {d.raca && <InfoRow label="Raça" value={d.raca} />}

          <Separator className="my-3" />

          <div className="flex gap-3 pt-1">
            <Link href={`/clientes/${d.cliente_id}`}>
              <Button size="sm" variant="outline">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Ver Cliente
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Financeiro ── */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Scissors className="h-3.5 w-3.5" />
          Financeiro
        </h2>
        <div className="grid sm:grid-cols-3 gap-x-8 divide-y sm:divide-y-0 sm:divide-x">
          <div className="py-2 sm:py-0 sm:pr-8">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-xl font-bold mt-0.5">{fmtMoeda(d.valor)}</p>
          </div>
          <div className="py-2 sm:py-0 sm:px-8">
            <p className="text-xs text-muted-foreground">Desconto</p>
            <p className="text-xl font-bold mt-0.5 text-amber-600">{fmtMoeda(d.desconto)}</p>
          </div>
          <div className="py-2 sm:py-0 sm:pl-8">
            <p className="text-xs text-muted-foreground">Sub-Total</p>
            <p className="text-xl font-bold mt-0.5 text-green-600">{fmtMoeda(d.sub_total)}</p>
          </div>
        </div>
        {d.pago && d.pago !== '0' && (
          <p className="mt-3 text-xs text-green-600 font-medium">✓ Pago</p>
        )}
        {extras.length > 0 && (
          <>
            <Separator className="my-4" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Adicionais
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {extras.map((e) => (
                <div key={e.label} className="rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">{e.label}: </span>
                  <span className="font-medium">{fmtMoeda(e.val)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Produtos / Itens (interativo) ── */}
      <ProdutosAgenda
        agendaId={d.id}
        filial={d.filial}
        itensInic={itens ?? []}
        podeEditar={d.status === 1 || d.status === 2}
      />

      {/* ── Dialog de confirmação (cancelar) ── */}
      {confirmAcao && (
        <Dialog open onOpenChange={(v) => { if (!v) setConfirmAcao(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar: {confirmAcao.label}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja <strong>{confirmAcao.label.toLowerCase()}</strong> este agendamento?
              Esta ação não pode ser desfeita.
            </p>
            <div className="space-y-1.5 mt-1">
              <label className="text-sm font-medium">Observação</label>
              <textarea
                rows={2}
                value={obsCanc}
                onChange={(e) => setObsCanc(e.target.value)}
                placeholder="Motivo (opcional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setConfirmAcao(null)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => executarAcao(confirmAcao, obsCanc)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmAcao.label}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {ehSupervisor && (
        <HistoricoEdicoesModal
          open={historicoAberto}
          onOpenChange={setHistoricoAberto}
          agendaId={d.id}
          filial={d.filial}
        />
      )}

    </div>
  );
}
