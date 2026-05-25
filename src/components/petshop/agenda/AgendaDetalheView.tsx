'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgendaDetalhe, AgendaItemServico, STATUS_AGENDA } from '@/types/petshop';
import { atualizarStatus } from '@/app/(petshop)/agenda/[id]/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  User,
  PawPrint,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Loader2,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  detalhe: AgendaDetalhe;
  itens:   AgendaItemServico[] | undefined;
}

function StatusBadge({ status }: { status: number }) {
  const s = STATUS_AGENDA[status] ?? { label: String(status), color: 'bg-gray-100 text-gray-600' };
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

function fmtMoeda(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  if (isNaN(n)) return '—';
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
    { label: 'Finalizar',           status: 'FINALIZADO',     variant: 'default',     icon: <CheckCircle2 className="h-4 w-4" />, confirm: false },
    { label: 'Cancelar',            status: 'CANCELADO',      variant: 'destructive', icon: <XCircle      className="h-4 w-4" />, confirm: true  },
  ],
};

export default function AgendaDetalheView({ detalhe: d, itens }: Props) {
  const router = useRouter();
  const [isPending, startTransition]     = useTransition();
  const [errorMsg, setErrorMsg]          = useState('');
  const [confirmAcao, setConfirmAcao]    = useState<Acao | null>(null);
  const [obsCanc, setObsCanc]            = useState('');

  const acoes = ACOES[d.status] ?? [];

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
    <div className="max-w-4xl mx-auto p-6 space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/agenda">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Agenda
          </Button>
        </Link>

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
        <div className="rounded-xl border bg-white p-5 space-y-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Agendamento #{d.id}
          </h2>
          <InfoRow label="Data"         value={d.data} />
          <InfoRow label="Hora"         value={d.hora} />
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
        <div className="rounded-xl border bg-white p-5 space-y-1">
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
      <div className="rounded-xl border bg-white p-5">
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

      {/* ── Itens / Serviços (PRODORCA) ── */}
      {(itens ?? []).length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Itens do Atendimento
          </h2>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto / Serviço</TableHead>
                  <TableHead className="text-right w-16">Qtd</TableHead>
                  <TableHead className="text-right w-28">Valor Unit.</TableHead>
                  <TableHead className="text-right w-28">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(itens ?? []).map((item) => (
                  <TableRow key={item.id_item}>
                    <TableCell>
                      <p className="font-medium">{item.produto || item.descricao}</p>
                      {item.produto && item.descricao && item.produto !== item.descricao && (
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.qtd}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtMoeda(item.valor)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">{fmtMoeda(item.valor_liq)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

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

    </div>
  );
}
