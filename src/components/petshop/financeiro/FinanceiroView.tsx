'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContaReceber, ContaReceberTotais } from '@/types/petshop';
import { baixarConta } from '@/app/(petshop)/financeiro/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wallet, CreditCard, AlertCircle, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useTransition } from 'react';

interface Props {
  contas:      ContaReceber[];
  totais:      ContaReceberTotais;
  dataDe:      string;
  dataAte:     string;
  statusAtual: string;
  tipoData:    string;
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const hoje = new Date().toISOString().split('T')[0];

function statusBaixaInfo(c: ContaReceber) {
  if (c.status_baixa === 2) return { label: 'Pago',    color: 'bg-green-100 text-green-700 border-green-200' };
  if (c.status_baixa === 3) return { label: 'Parcial', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  const venc = c.dt_vencimento.split('T')[0] || c.dt_vencimento;
  const vencida = venc < hoje;
  return {
    label: vencida ? 'Vencida' : 'Aberta',
    color: vencida
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200',
  };
}

export default function FinanceiroView({
  contas, totais, dataDe, dataAte, statusAtual, tipoData,
}: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [isPending, startTransition] = useTransition();

  // Baixa dialog
  const [baixaConta, setBaixaConta] = useState<ContaReceber | null>(null);
  const [valorPago, setValorPago]   = useState('');
  const [baixaError, setBaixaError] = useState('');

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    sp.set('data_de',   dataDe);
    sp.set('data_ate',  dataAte);
    sp.set('tipo_data', tipoData);
    if (statusAtual) sp.set('status', statusAtual);
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    startTransition(() => router.push('/financeiro?' + sp.toString()));
  }

  function openBaixa(c: ContaReceber) {
    setBaixaConta(c);
    setValorPago(c.saldo.toFixed(2).replace('.', ','));
    setBaixaError('');
  }

  function handleBaixar() {
    if (!baixaConta) return;
    const val = parseFloat(valorPago.replace(',', '.'));
    if (isNaN(val) || val <= 0) { setBaixaError('Informe um valor válido.'); return; }
    setBaixaError('');
    startTransition(async () => {
      const r = await baixarConta(baixaConta.nro_doc, baixaConta.parcela, val);
      if (r.error) { setBaixaError(r.error); return; }
      setBaixaConta(null);
      router.refresh();
    });
  }

  const filtrados = (contas ?? []).filter((c) =>
    !busca.trim() || c.cliente.toLowerCase().includes(busca.toLowerCase()),
  );

  const podesBaixar = (c: ContaReceber) => c.status_baixa !== 2; // não baixar contas já pagas

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Financeiro — Contas a Receber
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Vencimento: {fmtData(dataDe)} — {fmtData(dataAte)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Link para saldos */}
            <Link href="/financeiro/saldos">
              <Button variant="outline" size="sm">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Saldos
              </Button>
            </Link>
            {/* Filtro período */}
            <Input
              type="date"
              value={dataDe}
              className="w-full sm:w-36"
              onChange={(e) => navigate({ data_de: e.target.value })}
            />
            <span className="text-sm text-muted-foreground hidden sm:inline">até</span>
            <Input
              type="date"
              value={dataAte}
              className="w-full sm:w-36"
              onChange={(e) => navigate({ data_ate: e.target.value })}
            />
          </div>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Registros</p>
            <p className="text-lg font-semibold">{totais.total}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Original</p>
            <p className="text-lg font-semibold">{fmtMoeda(totais.total_valor)}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">Saldo a Receber</p>
            <p className="text-lg font-semibold text-primary">{fmtMoeda(totais.total_saldo)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full sm:max-w-xs"
          />

          <Select
            value={statusAtual || 'todos'}
            onValueChange={(v) => { if (v) navigate({ status: v === 'todos' ? undefined : v }); }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="A">Em aberto</SelectItem>
              <SelectItem value="P">Pagos</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={tipoData}
            onValueChange={(v) => { if (v) navigate({ tipo_data: v }); }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo de data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vencimento">Vencimento</SelectItem>
              <SelectItem value="emissao">Emissão</SelectItem>
              <SelectItem value="prorrogacao">Prorrogação</SelectItem>
            </SelectContent>
          </Select>

          <span className="sm:ml-auto text-sm text-muted-foreground">
            {filtrados.length} {filtrados.length === 1 ? 'conta' : 'contas'}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma conta no período.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 hidden sm:table-cell">Doc/Parc</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Histórico</TableHead>
                  <TableHead className="w-24 hidden sm:table-cell">Vencimento</TableHead>
                  <TableHead className="text-right w-24">Valor</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Pago</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((c) => {
                  const info = statusBaixaInfo(c);
                  return (
                    <TableRow key={`${c.nro_doc}-${c.parcela}-${c.filial}`} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {c.nro_doc}/{c.parcela}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {c.cliente}
                        <p className="sm:hidden text-xs text-muted-foreground font-mono">{fmtData(c.dt_vencimento)}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[180px] truncate">
                        {c.historico || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">{fmtData(c.dt_vencimento)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{fmtMoeda(c.valor)}</TableCell>
                      <TableCell className="text-right text-sm hidden lg:table-cell text-muted-foreground">
                        {c.val_pag > 0 ? fmtMoeda(c.val_pag) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm hidden sm:table-cell">{fmtMoeda(c.saldo)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', info.color)}>
                          {info.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {podesBaixar(c) && c.saldo > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            onClick={() => openBaixa(c)}
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Baixar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Dialog Baixa ── */}
      <Dialog open={!!baixaConta} onOpenChange={(o) => { if (!o) setBaixaConta(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Registrar Pagamento
            </DialogTitle>
          </DialogHeader>

          {baixaConta && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Cliente:</span> <strong>{baixaConta.cliente}</strong></p>
                <p><span className="text-muted-foreground">Doc/Parcela:</span> {baixaConta.nro_doc}/{baixaConta.parcela}</p>
                <p><span className="text-muted-foreground">Vencimento:</span> {fmtData(baixaConta.dt_vencimento)}</p>
                <p><span className="text-muted-foreground">Saldo:</span> <strong>{fmtMoeda(baixaConta.saldo)}</strong></p>
              </div>

              <div className="space-y-1">
                <Label>Valor Pago (R$)</Label>
                <Input
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  placeholder="0,00"
                  className="text-right font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Preencha com o saldo para quitação total, ou valor parcial.
                </p>
              </div>

              {baixaError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />{baixaError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBaixaConta(null)}>Cancelar</Button>
                <Button onClick={handleBaixar} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
