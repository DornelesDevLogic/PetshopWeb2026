'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Estimativa,
  type RegraEstimativa,
  type FiltroStatus,
  atualizarStatusEstimativa,
  criarRegra,
  atualizarRegra,
  excluirRegra,
} from '@/app/(petshop)/estimativas/actions';
import {
  buscarProdutos,
  type ProdutoResultado,
} from '@/app/(petshop)/agenda/nova/actions';
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
  BellRing, Search, Loader2, Plus, Pencil, Trash2, X,
  CheckCircle2, XCircle, RotateCcw, AlertCircle, Phone, Settings2,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizarTermosBusca, termoPrincipal, filtrarProdutosPorTermos } from '@/lib/buscaProdutos';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Monta o link wa.me com a mensagem de lembrete pronta */
function linkWhatsApp(e: Estimativa): string | null {
  const fone = (e.celular || e.telefone || '').replace(/\D/g, '');
  if (fone.length < 10) return null;
  const numero = fone.length <= 11 ? `55${fone}` : fone;
  const primeiroNome = (e.cliente_nome || '').trim().split(' ')[0];
  const nomeFmt = primeiroNome
    ? primeiroNome.charAt(0) + primeiroNome.slice(1).toLowerCase()
    : 'cliente';
  const msg =
    `Olá, ${nomeFmt}! Tudo bem? 🐾\n\n` +
    `Passando para lembrar que ${e.animal_nome ? `o(a) ${e.animal_nome}` : 'seu pet'} ` +
    `está com retorno previsto para *${fmtData(e.data_estimada)}*` +
    ` (${e.produto}).\n\n` +
    `Podemos agendar um horário? Aguardamos seu contato! 😊`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`;
}

/** Situação calculada (regra legada): Vencida = não enviada e data passou */
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

const FILTROS: { valor: FiltroStatus; label: string }[] = [
  { valor: 'lembrete',   label: 'No lembrete' },
  { valor: 'vencidas',   label: 'Vencidas' },
  { valor: 'pendentes',  label: 'Futuras' },
  { valor: 'enviadas',   label: 'Enviadas' },
  { valor: 'canceladas', label: 'Canceladas' },
  { valor: 'todas',      label: 'Todas' },
];

interface Props {
  estimativas: Estimativa[];
  regras:      RegraEstimativa[];
  statusAtual: FiltroStatus;
  buscaAtual:  string;
  abaAtual:    string;
}

// ─── Dialog de regra (criar/editar) ─────────────────────────────────────────

interface RegraDialogProps {
  regra:   RegraEstimativa | null;  // null = nova
  onSalvo: () => void;
  onClose: () => void;
}

function RegraDialog({ regra, onSalvo, onClose }: RegraDialogProps) {
  const [produtoSel, setProdutoSel] = useState<ProdutoResultado | null>(null);
  const [buscaProd,  setBuscaProd]  = useState('');
  const [resProd,    setResProd]    = useState<ProdutoResultado[]>([]);
  const [buscando,   setBuscando]   = useState(false);
  const [diasMin,    setDiasMin]    = useState(regra ? String(regra.dias_min) : '');
  const [diasMax,    setDiasMax]    = useState(regra ? String(regra.dias_max) : '');
  const [diasLemb,   setDiasLemb]   = useState(regra ? String(regra.dias_lembrete) : '30');
  const [error,      setError]      = useState('');
  const [isPending,  startT]        = useTransition();
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleBusca(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setBuscaProd(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      const termos = normalizarTermosBusca(v);
      if (!termos.some(t => t.length >= 3)) { setResProd([]); return; }
      setBuscando(true);
      try {
        const lista = await buscarProdutos(termoPrincipal(termos));
        setResProd(filtrarProdutosPorTermos(lista, termos, p => p.nome_produto + ' ' + p.cod_pro));
      } finally { setBuscando(false); }
    }, 300);
  }

  function salvar() {
    setError('');
    const min  = parseInt(diasMin)  || 0;
    const max  = parseInt(diasMax)  || 0;
    const lemb = parseInt(diasLemb) || 0;
    if (!regra && !produtoSel) { setError('Selecione um produto.'); return; }
    if (max <= 0)              { setError('Informe os dias máximos.'); return; }
    if (min > max)             { setError('Dias mínimos não podem ser maiores que os máximos.'); return; }

    startT(async () => {
      const res = regra
        ? await atualizarRegra(regra.id, { diasMin: min, diasMax: max, diasLembrete: lemb })
        : await criarRegra({
            dadosproId:   produtoSel!.id_dadospro,
            codProd:      produtoSel!.cod_pro,
            descPro:      produtoSel!.nome_produto,
            diasMin:      min,
            diasMax:      max,
            diasLembrete: lemb,
          });
      if (res.error) { setError(res.error); return; }
      onSalvo();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            {regra ? 'Editar Regra de Estimativa' : 'Nova Regra de Estimativa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {regra ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <p className="font-semibold">{regra.produto}</p>
              {regra.cod_prod && <p className="text-xs font-mono text-muted-foreground">{regra.cod_prod}</p>}
            </div>
          ) : produtoSel ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">{produtoSel.nome_produto}</p>
                <p className="text-xs text-muted-foreground">
                  {[produtoSel.secao, produtoSel.grupo].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" onClick={() => setProdutoSel(null)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Produto *</label>
              <div className="flex items-center gap-2 rounded-md border border-input px-3">
                {buscando
                  ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  : <Search className="h-4 w-4 text-muted-foreground" />}
                <input
                  value={buscaProd}
                  onChange={handleBusca}
                  placeholder="Buscar por nome ou código... (mín. 3 caracteres)"
                  className="flex-1 py-2 text-sm bg-transparent outline-none"
                  autoComplete="off"
                />
              </div>
              {resProd.length > 0 && (
                <div className="rounded-md border max-h-44 overflow-y-auto divide-y">
                  {resProd.map((p) => (
                    <button
                      key={p.id_dadospro}
                      type="button"
                      onClick={() => { setProdutoSel(p); setResProd([]); setBuscaProd(''); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      {p.nome_produto}
                      {p.cod_pro && (
                        <span className="ml-1.5 text-xs font-mono text-muted-foreground">{p.cod_pro}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Dias mínimos</label>
              <Input value={diasMin} onChange={(e) => setDiasMin(e.target.value)} inputMode="numeric" placeholder="15" className="text-center" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Dias máximos *</label>
              <Input value={diasMax} onChange={(e) => setDiasMax(e.target.value)} inputMode="numeric" placeholder="365" className="text-center" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Dias lembrete</label>
              <Input value={diasLemb} onChange={(e) => setDiasLemb(e.target.value)} inputMode="numeric" placeholder="30" className="text-center" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Ao vender este produto, o sistema perguntará se a estimativa usa o prazo mínimo
            ou máximo. O lembrete aparece N dias antes da data prevista.
          </p>

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

// ─── Componente principal ────────────────────────────────────────────────────

export default function EstimativasView({ estimativas, regras, statusAtual, buscaAtual, abaAtual }: Props) {
  const router = useRouter();
  const [busca, setBusca]   = useState(buscaAtual);
  const [isPending, startT] = useTransition();
  const [erro, setErro]     = useState('');

  // dialogs
  const [regraDialog,    setRegraDialog]    = useState<RegraEstimativa | null | 'nova'>(null);
  const [regraExcluindo, setRegraExcluindo] = useState<RegraEstimativa | null>(null);

  // debounce da busca
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debRef.current) clearTimeout(debRef.current); }, []);

  function navegar(params: { status?: string; busca?: string; aba?: string }) {
    const sp = new URLSearchParams();
    const st = params.status ?? statusAtual;
    const bu = params.busca ?? busca;
    const ab = params.aba ?? abaAtual;
    if (st) sp.set('status', st);
    if (bu) sp.set('busca', bu);
    if (ab !== 'lista') sp.set('aba', ab);
    router.push(`/estimativas?${sp.toString()}`);
  }

  function handleBuscaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setBusca(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => navegar({ busca: v }), 400);
  }

  function mudarStatus(e: Estimativa, novoStatus: number) {
    setErro('');
    startT(async () => {
      const res = await atualizarStatusEstimativa(e.id, novoStatus);
      if (res.error) { setErro(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Estimativas
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant={abaAtual === 'lista' ? 'default' : 'outline'}
            size="sm"
            onClick={() => navegar({ aba: 'lista' })}
          >
            Contatos
          </Button>
          <Button
            variant={abaAtual === 'regras' ? 'default' : 'outline'}
            size="sm"
            onClick={() => navegar({ aba: 'regras' })}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Regras
          </Button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{erro}
        </div>
      )}

      {abaAtual === 'lista' ? (
        <>
          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTROS.map((f) => (
                <button
                  key={f.valor}
                  onClick={() => navegar({ status: f.valor })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    statusAtual === f.valor
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-input px-3 ml-auto min-w-[220px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={handleBuscaChange}
                placeholder="Cliente, pet ou produto..."
                className="flex-1 py-1.5 text-sm bg-transparent outline-none"
              />
              {busca && (
                <button onClick={() => { setBusca(''); navegar({ busca: '' }); }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de estimativas */}
          {estimativas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <BellRing className="h-10 w-10 mb-2" />
              <p className="text-sm">Nenhuma estimativa encontrada para este filtro.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 px-2">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="px-2">Animal</TableHead>
                    <TableHead className="px-2">Produto</TableHead>
                    <TableHead className="text-center w-[88px] px-1">Compra</TableHead>
                    <TableHead className="text-center w-[88px] px-1">Prevista</TableHead>
                    <TableHead className="text-center w-[88px] px-1">Lembrete</TableHead>
                    <TableHead className="text-center w-14 px-1">Dias</TableHead>
                    <TableHead className="text-center w-24 px-1">Situação</TableHead>
                    <TableHead className="w-[104px] px-1" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimativas.map((e) => {
                    const sit = situacao(e);
                    return (
                      <TableRow key={e.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground px-2">{e.id}</TableCell>
                        <TableCell className="max-w-[160px] whitespace-normal">
                          <p className="font-medium text-sm break-words">{e.cliente_nome || '—'}</p>
                          {(e.celular || e.telefone) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />{e.celular || e.telefone}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm px-2 max-w-[100px] whitespace-normal break-words">{e.animal_nome || '—'}</TableCell>
                        <TableCell className="text-sm px-2 max-w-[220px] whitespace-normal break-words">
                          {e.produto}
                          {e.qtd > 1 && <span className="text-xs text-muted-foreground ml-1">×{e.qtd}</span>}
                        </TableCell>
                        <TableCell className="text-center text-xs font-mono px-1 whitespace-nowrap">{fmtData(e.data_compra)}</TableCell>
                        <TableCell className="text-center text-xs font-mono font-semibold px-1 whitespace-nowrap">{fmtData(e.data_estimada)}</TableCell>
                        <TableCell className="text-center text-xs font-mono px-1 whitespace-nowrap">{fmtData(e.data_lembrete)}</TableCell>
                        <TableCell className={cn(
                          'text-center text-xs font-mono font-semibold px-1',
                          e.dias_restantes < 0 ? 'text-red-600' : e.dias_restantes <= 7 ? 'text-amber-600' : '',
                        )}>
                          {e.dias_restantes}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', sit.cls)}>
                            {sit.label}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-1">
                          <div className="flex items-center justify-end gap-0.5 pr-1">
                            {(() => {
                              const wa = linkWhatsApp(e);
                              return wa ? (
                                <a
                                  href={wa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Enviar lembrete pelo WhatsApp"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              ) : null;
                            })()}
                            {e.status !== 1 && e.status !== 2 && (
                              <>
                                <Button
                                  variant="ghost" size="icon" title="Marcar como enviada/contatada"
                                  className="h-7 w-7 text-muted-foreground hover:text-green-600"
                                  disabled={isPending}
                                  onClick={() => mudarStatus(e, 1)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" title="Cancelar estimativa"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  disabled={isPending}
                                  onClick={() => mudarStatus(e, 2)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {(e.status === 1 || e.status === 2) && (
                              <Button
                                variant="ghost" size="icon" title="Reativar (voltar para pendente)"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                disabled={isPending}
                                onClick={() => mudarStatus(e, 0)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      ) : (
        <>
          {/* ── Aba Regras ── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Produtos com controle de estimativa (vacinas, vermífugos, antipulgas...).
            </p>
            <Button size="sm" onClick={() => setRegraDialog('nova')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nova Regra
            </Button>
          </div>

          {regras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <Settings2 className="h-10 w-10 mb-2" />
              <p className="text-sm">Nenhuma regra cadastrada.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center w-28">Dias mín.</TableHead>
                    <TableHead className="text-center w-28">Dias máx.</TableHead>
                    <TableHead className="text-center w-28">Lembrete</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell>
                        <p className="font-medium text-sm">{r.produto}</p>
                        {r.cod_prod && <p className="text-xs font-mono text-muted-foreground">{r.cod_prod}</p>}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">{r.dias_min || '—'}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{r.dias_max}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{r.dias_lembrete}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setRegraDialog(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setRegraExcluindo(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Dialog regra (criar/editar) */}
      {regraDialog !== null && (
        <RegraDialog
          regra={regraDialog === 'nova' ? null : regraDialog}
          onSalvo={() => { setRegraDialog(null); router.refresh(); }}
          onClose={() => setRegraDialog(null)}
        />
      )}

      {/* Dialog confirmar exclusão de regra */}
      {regraExcluindo && (
        <Dialog open onOpenChange={(v) => { if (!v && !isPending) setRegraExcluindo(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Excluir Regra
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-1">
              Remover a regra de estimativa de{' '}
              <strong className="text-foreground">{regraExcluindo.produto}</strong>?
              As estimativas já geradas não serão afetadas.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" disabled={isPending} onClick={() => setRegraExcluindo(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  setErro('');
                  startT(async () => {
                    const res = await excluirRegra(regraExcluindo.id);
                    if (res.error) { setErro(res.error); return; }
                    setRegraExcluindo(null);
                    router.refresh();
                  });
                }}
              >
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Excluindo...</> : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
