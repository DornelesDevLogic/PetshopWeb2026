'use client';

import { useEffect, useState } from 'react';
import { buscarEstimativas, type Estimativa } from '@/app/(petshop)/estimativas/actions';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  animalId:   number;
  animalNome: string;
  onClose:    () => void;
}

function situacao(e: Estimativa): { label: string; cls: string } {
  if (e.status === 1) return { label: 'Enviada',   cls: 'bg-green-100 text-green-700 border-green-200' };
  if (e.status === 2) return { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (e.dias_restantes < 0)
    return { label: 'Vencida', cls: 'bg-red-100 text-red-700 border-red-200' };
  const hoje = new Date().toISOString().split('T')[0];
  if (e.data_lembrete && hoje >= e.data_lembrete)
    return { label: 'Lembrete', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Pendente', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
}

function fmtData(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

/** Estimativas (lembretes de recompra — vacina, vermífugo, banho periódico
 * etc.) de um pet específico, pra consultar rapidinho durante o atendimento
 * sem sair da Visualização Rápida da Agenda. */
export default function EstimativasPetModal({ animalId, animalNome, onClose }: Props) {
  const [lista, setLista] = useState<Estimativa[] | null>(null);

  useEffect(() => {
    buscarEstimativas({ animalId, status: 'todas' }).then(setLista);
  }, [animalId]);

  const pendentes = (lista ?? []).filter((e) => situacao(e).label !== 'Cancelada' && situacao(e).label !== 'Enviada');
  const outras = (lista ?? []).filter((e) => situacao(e).label === 'Cancelada' || situacao(e).label === 'Enviada');

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" />
            Estimativas — {animalNome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {lista === null ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60">
              <PawPrint className="h-9 w-9 mb-2" />
              <p className="text-sm">Nenhuma estimativa cadastrada para este pet.</p>
            </div>
          ) : (
            <>
              {pendentes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pendentes / a vencer
                  </p>
                  {pendentes.map((e) => {
                    const sit = situacao(e);
                    return (
                      <div key={e.id} className="rounded-lg border px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{e.produto}</p>
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0', sit.cls)}>
                            {sit.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {e.tipo_servico && <span>{e.tipo_servico} · </span>}
                          Previsto para {fmtData(e.data_estimada)}
                          {' '}
                          <span className={cn(
                            'font-medium',
                            e.dias_restantes < 0 ? 'text-red-600' : e.dias_restantes <= 7 ? 'text-amber-600' : '',
                          )}>
                            ({e.dias_restantes < 0 ? `${Math.abs(e.dias_restantes)} dias atrasada` : `em ${e.dias_restantes} dias`})
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {outras.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Enviadas / canceladas
                  </p>
                  {outras.map((e) => {
                    const sit = situacao(e);
                    return (
                      <div key={e.id} className="rounded-lg border px-3 py-2.5 space-y-1 opacity-70">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{e.produto}</p>
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0', sit.cls)}>
                            {sit.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {e.tipo_servico && <span>{e.tipo_servico} · </span>}
                          Previsto para {fmtData(e.data_estimada)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
