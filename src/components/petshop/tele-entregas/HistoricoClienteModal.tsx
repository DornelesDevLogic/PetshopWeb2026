'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronDown, ChevronUp, Package, ShoppingBag, TrendingUp, Clock, MapPin, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buscarHistoricoClienteTele,
  buscarItensTeleEntrega,
  type TeleEntrega,
  type ItemEntrega,
} from '@/app/(petshop)/tele-entregas/actions';

// ---------- helpers ----------

function fmtMoeda(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function fmtData(s: string) {
  if (!s) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
  const d = s.split(' ')[0];
  const [y, m, dd] = d.split('-');
  if (!dd) return s;
  return `${dd}/${m}/${y}`;
}

const STATUS_LABEL: Record<number, string> = { 1: 'Aberta', 3: 'Entregue', 4: 'Cancelada' };
const STATUS_CLS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  3: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  4: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// ---------- sub-componentes ----------

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-base font-semibold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ItensRow({ orcaId }: { orcaId: number }) {
  const [itens, setItens] = useState<ItemEntrega[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarItensTeleEntrega(orcaId)
      .then(r => setItens(r.dados ?? []))
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, [orcaId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 px-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando itens...
      </div>
    );
  }

  if (!itens || itens.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 px-4">Nenhum item encontrado.</p>;
  }

  return (
    <div className="px-4 pb-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-1.5 pr-2 font-medium">Produto</th>
            <th className="text-center py-1.5 w-12 font-medium">Qtd</th>
            <th className="text-right py-1.5 w-20 font-medium">Unit.</th>
            <th className="text-right py-1.5 w-20 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id_item} className="border-b border-dashed last:border-0">
              <td className="py-1.5 pr-2">
                <p className="font-medium text-foreground">{item.produto}</p>
                <p className="text-muted-foreground">{item.unidade}</p>
              </td>
              <td className="py-1.5 text-center font-mono">{item.qtd}</td>
              <td className="py-1.5 text-right font-mono">R$ {fmtMoeda(item.valor)}</td>
              <td className="py-1.5 text-right font-mono font-semibold text-primary">
                R$ {fmtMoeda(item.qtd * item.valor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- item de pedido ----------

function PedidoCard({ entrega }: { entrega: TeleEntrega }) {
  const [expandido, setExpandido] = useState(false);

  const enderecoParts = [
    entrega.endereco,
    entrega.nro_endereco,
    entrega.bairro,
    entrega.cep,
  ].filter(Boolean);
  const enderecoStr = enderecoParts.join(', ');

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* cabeçalho clicável */}
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        {/* número + status */}
        <div className="flex flex-col items-start gap-1 shrink-0 w-20">
          <span className="text-sm font-semibold text-primary">#{entrega.id}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_CLS[entrega.status] ?? 'bg-muted text-muted-foreground')}>
            {STATUS_LABEL[entrega.status] ?? `Status ${entrega.status}`}
          </span>
        </div>

        {/* data + resumo */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{fmtData(entrega.data)}{entrega.hora ? ` às ${entrega.hora.slice(0, 5)}` : ''}</span>
            {entrega.animal && (
              <span className="ml-1 text-muted-foreground/70">· {entrega.animal}</span>
            )}
          </div>
          {entrega.profissional && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" /> {entrega.profissional}
            </div>
          )}
          {entrega.formapgto && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CreditCard className="h-3 w-3" /> {entrega.formapgto}
              {entrega.condpgto ? ` · ${entrega.condpgto}` : ''}
            </div>
          )}
        </div>

        {/* valor + toggle */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-sm font-semibold text-primary font-mono">
            R$ {fmtMoeda(entrega.valor)}
          </span>
          {expandido
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {/* conteúdo expandido */}
      {expandido && (
        <div className="border-t bg-muted/10">
          {/* endereço de entrega */}
          {enderecoStr && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground px-4 pt-2.5 pb-1">
              <MapPin className="h-3 w-3 mt-px shrink-0" />
              <span>{enderecoStr}</span>
            </div>
          )}

          {/* data de entrega se diferente */}
          {entrega.data_entrega && (
            <p className="text-xs text-muted-foreground px-4 pb-1">
              Entrega prevista: <span className="font-medium text-foreground">{fmtData(entrega.data_entrega)}</span>
              {entrega.hora_entrega ? ` às ${entrega.hora_entrega.slice(0, 5)}` : ''}
            </p>
          )}

          {/* itens do pedido */}
          <div className="border-t mt-1">
            <p className="text-[10px] font-semibold text-muted-foreground px-4 pt-2 uppercase tracking-wide">
              Produtos
            </p>
            <ItensRow orcaId={entrega.id} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- modal principal ----------

interface Props {
  clienteId:   number;
  clienteNome: string;
  onClose:     () => void;
}

export default function HistoricoClienteModal({ clienteId, clienteNome, onClose }: Props) {
  const [entregas,  setEntregas]  = useState<TeleEntrega[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    buscarHistoricoClienteTele(clienteId)
      .then(data => setEntregas(data))
      .catch(() => setEntregas([]))
      .finally(() => setCarregando(false));
  }, [clienteId]);

  // estatísticas
  const entregasEntregues = entregas.filter(e => e.status !== 4);
  const totalPedidos   = entregasEntregues.length;
  const totalGasto     = entregasEntregues.reduce((s, e) => s + (e.valor || 0), 0);
  const ticketMedio    = totalPedidos > 0 ? totalGasto / totalPedidos : 0;
  const ultimaCompra   = entregasEntregues
    .map(e => e.data)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  // filtro por busca
  const buscaLower = busca.toLowerCase();
  const entregasFiltradas = entregas.filter(e => {
    if (!buscaLower) return true;
    return (
      String(e.id).includes(buscaLower) ||
      fmtData(e.data).includes(buscaLower) ||
      (e.animal?.toLowerCase().includes(buscaLower)) ||
      (e.profissional?.toLowerCase().includes(buscaLower)) ||
      (STATUS_LABEL[e.status] ?? '').toLowerCase().includes(buscaLower)
    );
  });

  // fechar com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* cabeçalho */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base leading-tight">Histórico do Cliente</h2>
            <p className="text-sm text-muted-foreground truncate">{clienteNome}</p>
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
            {/* estatísticas */}
            <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
              <StatCard
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                label="Total de pedidos"
                value={String(totalPedidos)}
              />
              <StatCard
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Total comprado"
                value={`R$ ${fmtMoeda(totalGasto)}`}
              />
              <StatCard
                icon={<Package className="h-3.5 w-3.5" />}
                label="Ticket médio"
                value={`R$ ${fmtMoeda(ticketMedio)}`}
              />
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Última compra"
                value={ultimaCompra ? fmtData(ultimaCompra) : '—'}
              />
            </div>

            {/* busca rápida */}
            <div className="px-5 pb-3 shrink-0">
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Pesquisar por nº, data, animal, entregador..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 ring-primary"
              />
            </div>

            {/* lista de pedidos (scrollável) */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 min-h-0">
              {entregasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <ShoppingBag className="h-8 w-8 opacity-40" />
                  <p className="text-sm">
                    {busca ? 'Nenhum resultado para a pesquisa.' : 'Nenhuma tele-entrega encontrada para este cliente.'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium pb-1">
                    {entregasFiltradas.length} pedido{entregasFiltradas.length !== 1 ? 's' : ''}
                    {busca ? ' encontrado' : ''}{entregasFiltradas.length !== 1 && busca ? 's' : ''}
                    {' '}· do mais recente ao mais antigo
                  </p>
                  {entregasFiltradas.map(e => (
                    <PedidoCard key={e.id} entrega={e} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
