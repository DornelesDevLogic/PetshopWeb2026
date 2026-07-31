'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  confirmarPrevenda,
  cancelarPrevenda,
  buscarProdutos,
  addItem,
  deleteItem,
} from '@/app/(petshop)/vendas/[id]/actions';
import { PrevendaDetalhe, PrevendaItem, Produto, STATUS_PREVENDA } from '@/types/petshop';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Plus,
  ShoppingCart,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  venda: PrevendaDetalhe;
  itens: PrevendaItem[];
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtMoeda(v: number) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function VendaDetalheView({ venda, itens }: Props) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // ── Cancelamento ──
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  // ── Busca de produto ──
  const [buscaProd, setBuscaProd] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [isBuscandoProd, startBuscaProd] = useTransition();
  const [prodSel, setProdSel] = useState<Produto | null>(null);
  const [qtd, setQtd] = useState('1');
  const [preco, setPreco] = useState('');
  const [desconto, setDesconto] = useState('0');
  const [showAddForm, setShowAddForm] = useState(false);

  const statusInfo = STATUS_PREVENDA[venda.status] ?? { label: String(venda.status), color: 'bg-muted text-muted-foreground border-border' };
  const podeEditar = venda.status === 1;
  const podeConfirmar = venda.status === 1;
  const podeCancelar = venda.status === 1 || venda.status === 2;

  const totalItens = itens.reduce((s, i) => s + i.valorliq, 0);

  function act(fn: () => Promise<{ error?: string }>) {
    setErrorMsg('');
    startTransition(async () => {
      const r = await fn();
      if (r.error) setErrorMsg(r.error);
      else router.refresh();
    });
  }

  function handleBuscarProduto(e: React.FormEvent) {
    e.preventDefault();
    const termos = normalizarTermosBusca(buscaProd);
    if (termos.length === 0) return;
    startBuscaProd(async () => {
      const lista = await buscarProdutos(termoPrincipal(termos));
      setResultados(filtrarProdutosPorTermos(lista, termos, p => p.nome_produto));
    });
  }

  function selecionarProduto(p: Produto) {
    setProdSel(p);
    setPreco(String(p.preco));
    setResultados([]);
    setBuscaProd('');
  }

  function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prodSel) return;
    const q   = parseFloat(qtd.replace(',', '.'))  || 1;
    const v   = parseFloat(preco.replace(',', '.')) || 0;
    const d   = parseFloat(desconto.replace(',', '.')) || 0;
    act(() => addItem(venda.id, prodSel, q, v, d));
    setProdSel(null);
    setQtd('1');
    setPreco('');
    setDesconto('0');
    setShowAddForm(false);
  }

  function handleCancelar() {
    act(() => cancelarPrevenda(venda.id, justificativa));
    setShowCancelDialog(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendas">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vendas
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Pré-venda #{venda.id}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{fmtData(venda.data)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', statusInfo.color)}>
            {statusInfo.label}
          </span>

          {podeConfirmar && (
            <Button
              size="sm"
              onClick={() => act(() => confirmarPrevenda(venda.id))}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Confirmar
            </Button>
          )}

          {podeCancelar && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
              disabled={isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Dialog cancelamento */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cancelar Pré-venda</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCancelDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Justificativa</Label>
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder="Motivo do cancelamento..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancelar} disabled={isPending}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}
        </div>
      )}

      {/* Dados do cliente */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Cliente
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Cliente</p>
            <Link href={`/clientes/${venda.cliente_id}`} className="font-medium hover:underline text-primary">
              {venda.cliente}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-0.5">Forma de Pagamento</p>
            <p className="font-medium">{venda.formapgto || '—'}</p>
          </div>
          {venda.dados && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Observações</p>
              <p>{venda.dados}</p>
            </div>
          )}
          {venda.justificativa && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-xs mb-0.5">Justificativa de Cancelamento</p>
              <p className="text-red-600">{venda.justificativa}</p>
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Itens ({itens.length})
          </h2>
          {podeEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              {showAddForm ? 'Fechar' : 'Adicionar item'}
            </Button>
          )}
        </div>

        {/* Formulário add item */}
        {showAddForm && (
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            {!prodSel ? (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar produto por nome..."
                    value={buscaProd}
                    onChange={(e) => setBuscaProd(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscarProduto(e as unknown as React.FormEvent); } }}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleBuscarProduto} disabled={isBuscandoProd}>
                    {isBuscandoProd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {resultados.length > 0 && (
                  <div className="rounded-md border divide-y bg-card shadow-sm overflow-hidden max-h-60 overflow-y-auto">
                    {resultados.map((p) => (
                      <button
                        key={p.id_dadospro}
                        type="button"
                        onClick={() => selecionarProduto(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <p className="font-medium text-sm">{p.nome_produto}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.unidade} · {fmtMoeda(p.preco)}
                          {p.secao ? ` · ${p.secao}` : ''}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{prodSel.nome_produto}</p>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setProdSel(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Qtd</Label>
                    <Input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="space-y-1">
                    <Label>Preço Unit (R$)</Label>
                    <Input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" />
                  </div>
                  <div className="space-y-1">
                    <Label>Desconto (R$)</Label>
                    <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} inputMode="decimal" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setProdSel(null); setShowAddForm(false); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending || !preco}>
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tabela de itens */}
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-20 text-right">Qtd</TableHead>
                  <TableHead className="w-28 text-right">Preço</TableHead>
                  <TableHead className="w-28 text-right">Desconto</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  {podeEditar && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id_prodorca}>
                    <TableCell>
                      <p className="font-medium text-sm">{item.desc_pro || item.descpro}</p>
                      {item.unid_pro && (
                        <p className="text-xs text-muted-foreground">{item.unid_pro}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.qtd}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoeda(item.valor)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {item.desconto > 0 ? fmtMoeda(item.desconto) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{fmtMoeda(item.valorliq)}</TableCell>
                    {podeEditar && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => act(() => deleteItem(venda.id, item.id_prodorca))}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Totais */}
        <div className="border-t pt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex gap-8">
            <span className="text-muted-foreground">Subtotal (itens)</span>
            <span className="font-mono w-28 text-right">{fmtMoeda(totalItens)}</span>
          </div>
          {venda.desconto > 0 && (
            <div className="flex gap-8 text-red-600">
              <span>Desconto</span>
              <span className="font-mono w-28 text-right">– {fmtMoeda(venda.desconto)}</span>
            </div>
          )}
          {venda.valor_frete > 0 && (
            <div className="flex gap-8">
              <span className="text-muted-foreground">Frete</span>
              <span className="font-mono w-28 text-right">{fmtMoeda(venda.valor_frete)}</span>
            </div>
          )}
          <div className="flex gap-8 font-semibold text-base border-t pt-1 mt-1">
            <span>Total</span>
            <span className="font-mono w-28 text-right">{fmtMoeda(venda.sub_total || totalItens)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
