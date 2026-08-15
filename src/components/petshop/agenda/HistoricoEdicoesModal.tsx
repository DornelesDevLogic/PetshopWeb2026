'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { History, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { buscarHistoricoEdicoes } from '@/app/(petshop)/agenda/[id]/actions';
import { AgendaHistoricoItem } from '@/types/petshop';

interface Props {
  open:     boolean;
  onOpenChange: (v: boolean) => void;
  agendaId: number;
  filial:   number;
}

interface Grupo {
  chave:         string;
  usuarioNome:   string;
  dataHora:      string;
  operacao:      string;
  itens:         AgendaHistoricoItem[];
}

function agrupar(itens: AgendaHistoricoItem[]): Grupo[] {
  const mapa = new Map<string, Grupo>();
  for (const it of itens) {
    // Mesma "edição" = mesmo usuário + mesmo minuto — várias linhas (campos)
    // de uma UPDATE caem juntas mesmo que a query em si tenha rodado em
    // milissegundos diferentes.
    const chave = `${it.usuario_codigo}|${it.data_hora.slice(0, 16)}`;
    let g = mapa.get(chave);
    if (!g) {
      g = { chave, usuarioNome: it.usuario_nome || 'Usuário desconhecido', dataHora: it.data_hora, operacao: it.operacao, itens: [] };
      mapa.set(chave, g);
    }
    g.itens.push(it);
  }
  return Array.from(mapa.values());
}

function fmtDataHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const OPERACAO_LABEL: Record<string, string> = {
  INSERT: 'Criação',
  UPDATE: 'Edição',
  CANCELADO: 'Cancelamento',
  STATUS: 'Mudança de status',
  REAGENDADO: 'Reagendamento',
};

export default function HistoricoEdicoesModal({ open, onOpenChange, agendaId, filial }: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    setErro('');
    buscarHistoricoEdicoes(agendaId, filial).then((r) => {
      if (r.erro) setErro(r.erro);
      else setGrupos(agrupar(r.itens));
      setCarregando(false);
    });
  }, [open, agendaId, filial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4.5 w-4.5" />
            Histórico de Edições
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {carregando ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : erro ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          ) : grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhuma alteração registrada para esta agenda ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {grupos.map((g) => (
                <div key={g.chave} className="rounded-lg border bg-card overflow-hidden">
                  <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-2 border-b">
                    <span className="text-sm font-semibold">{g.usuarioNome}</span>
                    <span className="text-xs text-muted-foreground">
                      {OPERACAO_LABEL[g.operacao] ?? g.operacao} · {fmtDataHora(g.dataHora)}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 space-y-1.5">
                    {g.itens.map((it) => (
                      <div key={it.id_historico} className="text-sm flex items-start gap-1.5 flex-wrap">
                        <span className="font-medium shrink-0">{it.campo}:</span>
                        {it.operacao === 'INSERT' ? (
                          <span className="text-muted-foreground">{it.valor_novo}</span>
                        ) : (
                          <span className="flex items-center gap-1.5 flex-wrap text-muted-foreground">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{it.valor_anterior}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{it.valor_novo}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
