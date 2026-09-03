'use client';

import { Receipt, Printer, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CupomEspelho } from '@/components/petshop/relatorios/RelatorioEspelhoCupons';
import type { ItemCupomEspelho, PagamentoCupom } from '@/app/(petshop)/relatorios/espelho-cupons/actions';

interface Props {
  cupom:                CupomEspelho;
  itens:                ItemCupomEspelho[];
  pagamentos:           PagamentoCupom[];
  carregandoItens:      boolean;
  carregandoPagamentos: boolean;
  onClose:              () => void;
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

/** Recibo de um cupom individual — mesmo padrão do preview do Retaguarda, usado no Espelho de Cupons e na Visualização Rápida de Agendas. */
export default function CupomPreviewModal({
  cupom, itens, pagamentos, carregandoItens, carregandoPagamentos, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-card shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Cupom #{cupom.numero_cupom}
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => window.print()} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Imprimir">
              <Printer className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4 font-mono text-xs space-y-3">
          <div className="text-center space-y-0.5">
            <p className="font-semibold text-sm">Filial {cupom.filial}</p>
            <p>{fmtData(cupom.data)} {cupom.hora?.slice(0, 5)} · Caixa <strong>{cupom.caixa}</strong></p>
            <p>{cupom.modelo === '65' ? 'NFC-e' : cupom.modelo === '55' ? 'NF-e' : cupom.modelo}</p>
            {cupom.cancelado && <p className="text-red-600 font-semibold">*** CANCELADO ***</p>}
          </div>

          <div className="border-t border-dashed" />

          <p>Cliente: {cupom.cliente || 'Consumidor'}</p>
          <p>Vendedor: {cupom.vendedor || '—'}</p>

          <div className="border-t border-dashed" />

          {carregandoItens ? (
            <p className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Carregando itens...</p>
          ) : (
            itens.map((it, i) => (
              <div key={i} className={cn('flex justify-between gap-2', it.cancelado && 'opacity-50 line-through')}>
                <span className="truncate">{it.qtd}x {it.descricao}</span>
                <span className="shrink-0">{fmtMoeda(it.total)}</span>
              </div>
            ))
          )}

          <div className="border-t border-dashed" />

          <div className="flex justify-between"><span>Total bruto</span><span>{fmtMoeda(cupom.valor_total)}</span></div>
          <div className="flex justify-between"><span>Desconto</span><span>-{fmtMoeda(cupom.desconto)}</span></div>
          <div className="flex justify-between"><span>Acréscimo</span><span>+{fmtMoeda(cupom.acrescimo)}</span></div>
          <div className="flex justify-between font-semibold text-sm"><span>TOTAL</span><span>{fmtMoeda(cupom.valor_liquido)}</span></div>

          <div className="border-t border-dashed" />

          <p className="font-semibold">Formas de pagamento</p>
          {carregandoPagamentos ? (
            <p className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Carregando...</p>
          ) : pagamentos.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma forma registrada.</p>
          ) : (
            pagamentos.map((p, i) => (
              <div key={i} className="flex justify-between"><span>{p.descricao}</span><span>{fmtMoeda(p.valor)}</span></div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
