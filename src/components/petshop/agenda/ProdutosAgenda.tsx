'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  buscarProdutos,
  adicionarItemAgenda,
  atualizarItemAgenda,
  excluirItemAgenda,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/[id]/actions';
import { AgendaItemServico } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Search, Loader2, Plus, Pencil, Trash2, X, PackageSearch, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseFlt(v: string | number): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  return parseFloat(String(v).replace(',', '.')) || 0;
}

function fmtMoeda(v: string | number): string {
  const n = parseFlt(v);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function calcTotal(valor: number, desconto: number, qtd: number): number {
  return Math.max(0, (valor - desconto) * qtd);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  agendaId:    number;
  filial:      number;
  itensInic:   AgendaItemServico[];
  podeEditar:  boolean;   // false quando status = Finalizado ou Cancelado
}

// ─── Dialog de adicionar produto ─────────────────────────────────────────────

interface AdicionarDialogProps {
  produto:   ProdutoResultado;
  agendaId:  number;
  filial:    number;
  onSalvo:   () => void;
  onClose:   () => void;
}

function AdicionarDialog({ produto, agendaId, filial, onSalvo, onClose }: AdicionarDialogProps) {
  const [qtd,      setQtd]      = useState('1');
  const [valor,    setValor]    = useState(String(produto.preco.toFixed(2)).replace('.', ','));
  const [desconto, setDesconto] = useState('0');
  const [error,    setError]    = useState('');
  const [isPending, startT]     = useTransition();

  const total = calcTotal(parseFlt(valor), parseFlt(desconto), parseFlt(qtd));

  function salvar() {
    setError('');
    // Regra: não é permitido inserir produto com preço R$ 0,00
    if (parseFlt(valor) <= 0) {
      setError('Não é permitido inserir produto com preço R$ 0,00. Informe o valor.');
      return;
    }
    startT(async () => {
      const res = await adicionarItemAgenda(
        agendaId, filial,
        produto.id_dadospro, produto.cod_filial,
        parseFlt(qtd), parseFlt(valor), parseFlt(desconto),
        produto.nome_produto,
        produto.preco, produto.cod_pro,
      );
      if (res.error) { setError(res.error); return; }
      onSalvo();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Adicionar Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <p className="font-semibold">{produto.nome_produto}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {produto.secao}{produto.grupo ? ` · ${produto.grupo}` : ''} · {produto.unidade}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Qtd</label>
              <Input
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                inputMode="decimal"
                className="text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Valor Unit. (R$)</label>
              <Input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Desconto (R$)</label>
              <Input
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="flex justify-between items-center rounded-md bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary">R$ {fmtMoeda(total)}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={salvar} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Adicionando...</> : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog de editar item ───────────────────────────────────────────────────

interface EditarItemDialogProps {
  item:      AgendaItemServico;
  agendaId:  number;
  filial:    number;
  onSalvo:   () => void;
  onClose:   () => void;
}

function EditarItemDialog({ item, agendaId, filial, onSalvo, onClose }: EditarItemDialogProps) {
  const [qtd,      setQtd]      = useState(String(item.qtd));
  const [valor,    setValor]    = useState(String(parseFlt(item.valor).toFixed(2)).replace('.', ','));
  const [desconto, setDesconto] = useState(String(parseFlt(item.desconto).toFixed(2)).replace('.', ','));
  const [descricao,setDescricao]= useState(item.descricao || item.produto || '');
  const [error,    setError]    = useState('');
  const [isPending, startT]     = useTransition();

  const total = calcTotal(parseFlt(valor), parseFlt(desconto), parseFlt(qtd));

  function salvar() {
    setError('');
    // Regra: não é permitido item com preço R$ 0,00
    if (parseFlt(valor) <= 0) {
      setError('Não é permitido salvar item com preço R$ 0,00. Informe o valor.');
      return;
    }
    startT(async () => {
      const res = await atualizarItemAgenda(
        agendaId, item.id_item, filial,
        parseFlt(qtd), parseFlt(valor), parseFlt(desconto), descricao,
      );
      if (res.error) { setError(res.error); return; }
      onSalvo();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Editar Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <label className="text-xs font-medium">Descrição</label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Qtd</label>
              <Input
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                inputMode="decimal"
                className="text-center"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Valor Unit. (R$)</label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Desconto (R$)</label>
              <Input value={desconto} onChange={(e) => setDesconto(e.target.value)} inputMode="decimal" />
            </div>
          </div>

          <div className="flex justify-between items-center rounded-md bg-primary/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary">R$ {fmtMoeda(total)}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={salvar} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Salvando...</> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProdutosAgenda({ agendaId, filial, itensInic, podeEditar }: Props) {
  const router = useRouter();

  // itens locais para atualização otimista
  const [itens, setItens] = useState<AgendaItemServico[]>(itensInic);

  // Sincroniza quando o servidor re-renderiza com dados novos (após router.refresh)
  useEffect(() => {
    setItens(itensInic);
  }, [itensInic]);

  // ── Busca de produto ──
  const [busca,         setBusca]         = useState('');
  const [resultados,    setResultados]    = useState<ProdutoResultado[]>([]);
  const [isBuscando,    setIsBuscando]    = useState(false);
  const [dropAberto,    setDropAberto]    = useState(false);
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef                          = useRef<HTMLInputElement>(null);
  const dropRef                           = useRef<HTMLDivElement>(null);

  // ── Dialogs ──
  const [produtoSel,    setProdutoSel]    = useState<ProdutoResultado | null>(null);
  const [itemEditando,  setItemEditando]  = useState<AgendaItemServico | null>(null);
  const [itemExcluindo, setItemExcluindo] = useState<AgendaItemServico | null>(null);

  // ── Exclusão ──
  const [isExcluindo, startExcluir] = useTransition();
  const [erroExcluir, setErroExcluir] = useState('');

  // fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        dropRef.current  && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setDropAberto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscarCallback = useCallback(async (texto: string) => {
    if (texto.trim().length < 3) { setResultados([]); setDropAberto(false); return; }
    setIsBuscando(true);
    try {
      const lista = await buscarProdutos(texto);
      setResultados(lista);
      setDropAberto(lista.length > 0);
    } finally {
      setIsBuscando(false);
    }
  }, []);

  function handleBuscaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setBusca(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarCallback(v), 300);
  }

  function selecionarProduto(p: ProdutoResultado) {
    setDropAberto(false);
    setBusca('');
    setResultados([]);
    setProdutoSel(p);
  }

  function recarregar() {
    router.refresh();
  }

  // totais
  const totalGeral = itens.reduce((acc, i) => acc + parseFlt(i.valor_liq) * parseFlt(i.qtd), 0);
  const totalDesc  = itens.reduce((acc, i) => acc + parseFlt(i.desconto)  * parseFlt(i.qtd), 0);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <PackageSearch className="h-3.5 w-3.5" />
          Produtos / Serviços
          {itens.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
              {itens.length}
            </span>
          )}
        </h2>
      </div>

      {/* Busca de produto */}
      {podeEditar && (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            {isBuscando
              ? <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
              : <Search className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <input
              ref={inputRef}
              value={busca}
              onChange={handleBuscaChange}
              onFocus={() => resultados.length > 0 && setDropAberto(true)}
              placeholder="Buscar por nome ou código... (mín. 3 caracteres)"
              className="flex-1 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
            {busca && (
              <button type="button" onClick={() => { setBusca(''); setResultados([]); setDropAberto(false); }}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {busca.length > 0 && busca.length < 3 && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">
              Digite mais {3 - busca.length} letra{3 - busca.length !== 1 ? 's' : ''}...
            </p>
          )}

          {dropAberto && resultados.length > 0 && (
            <div ref={dropRef} className="absolute z-50 w-full mt-1 rounded-md border bg-card shadow-lg overflow-hidden max-h-64 overflow-y-auto divide-y">
              {resultados.map((p) => (
                <button
                  key={p.id_dadospro}
                  type="button"
                  onClick={() => selecionarProduto(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.nome_produto}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.cod_pro && <span className="font-mono mr-1.5">{p.cod_pro}</span>}
                      {[p.secao, p.grupo, p.unidade].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-primary">
                      R$ {fmtMoeda(p.preco)}
                    </p>
                    <p className={cn(
                      'text-[11px] font-mono',
                      (p.estoque ?? 0) <= 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground',
                    )}>
                      Est: {(p.estoque ?? 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabela de itens */}
      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
          <PackageSearch className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhum produto adicionado.</p>
          {podeEditar && <p className="text-xs mt-1">Use a busca acima para adicionar.</p>}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto / Serviço</TableHead>
                <TableHead className="text-right w-16">Qtd</TableHead>
                <TableHead className="text-right w-28">Valor Unit.</TableHead>
                <TableHead className="text-right w-24">Desconto</TableHead>
                <TableHead className="text-right w-28 font-semibold">Total</TableHead>
                {podeEditar && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const vliq  = parseFlt(item.valor_liq);
                const val   = parseFlt(item.valor);
                const desc  = parseFlt(item.desconto);
                const qtd   = parseFlt(item.qtd);
                const total = vliq > 0 ? vliq * qtd : calcTotal(val, desc, qtd);
                return (
                  <TableRow key={item.id_item} className="hover:bg-muted/40">
                    <TableCell>
                      <p className="font-medium text-sm">{item.produto || item.descricao}</p>
                      {item.cod_pro && (
                        <p className="text-xs font-mono text-muted-foreground">{item.cod_pro}</p>
                      )}
                      {item.produto && item.descricao && item.produto !== item.descricao && (
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      )}
                      {item.unidade && (
                        <p className="text-xs text-muted-foreground">{item.unidade}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{qtd % 1 === 0 ? qtd.toFixed(0) : qtd.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">R$ {fmtMoeda(val)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {desc > 0 ? (
                        <span className="text-amber-600">R$ {fmtMoeda(desc)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      R$ {fmtMoeda(total)}
                    </TableCell>
                    {podeEditar && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setItemEditando(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => { setErroExcluir(''); setItemExcluindo(item); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Totais */}
          <div className="border-t bg-muted/30 px-4 py-3 flex items-center justify-end gap-8 text-sm">
            {totalDesc > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Desconto total</p>
                <p className="font-semibold text-amber-600">R$ {fmtMoeda(totalDesc)}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total geral</p>
              <p className="text-lg font-bold text-primary">R$ {fmtMoeda(totalGeral)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dialog — adicionar */}
      {produtoSel && (
        <AdicionarDialog
          produto={produtoSel}
          agendaId={agendaId}
          filial={filial}
          onSalvo={() => { setProdutoSel(null); recarregar(); }}
          onClose={() => setProdutoSel(null)}
        />
      )}

      {/* Dialog — editar */}
      {itemEditando && (
        <EditarItemDialog
          item={itemEditando}
          agendaId={agendaId}
          filial={filial}
          onSalvo={() => { setItemEditando(null); recarregar(); }}
          onClose={() => setItemEditando(null)}
        />
      )}

      {/* Dialog — confirmar exclusão */}
      {itemExcluindo && (
        <Dialog open onOpenChange={(v) => { if (!v && !isExcluindo) setItemExcluindo(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Excluir Item
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-1">
              Deseja remover <strong className="text-foreground">
                {itemExcluindo.produto || itemExcluindo.descricao}
              </strong> da agenda?
            </p>
            {erroExcluir && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{erroExcluir}
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" disabled={isExcluindo} onClick={() => setItemExcluindo(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={isExcluindo}
                onClick={() => {
                  setErroExcluir('');
                  startExcluir(async () => {
                    const res = await excluirItemAgenda(agendaId, itemExcluindo.id_item, filial);
                    if (res.error) { setErroExcluir(res.error); return; }
                    setItemExcluindo(null);
                    recarregar();
                  });
                }}
              >
                {isExcluindo ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Excluindo...</> : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
