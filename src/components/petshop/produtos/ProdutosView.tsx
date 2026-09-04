'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package, Search, X, ImageIcon, Factory, Store, Loader2, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstoqueFilial } from '@/app/api/produto-estoque-filiais/route';
import ScannerCodigoBarras from './ScannerCodigoBarras';
import HistoricoProdutoModal from './HistoricoProdutoModal';

export interface ProdutoPesquisa {
  id_pro:      number;
  cod_filial:  number;
  id_dadospro: number;
  cod_pro:     string;
  descricao:   string;
  fabricante:  string;
  especie:     string;
  unidade:     string;
  preco:       number;
  estoque:     number;
  peso?:       number;   // volume/medida (SRQPRO.PESO_PRO) — para preço por kg
  tem_imagem:  number;
}

interface Filtros {
  busca:      string;
  fabricante: string;
  precoMin:   string;
  precoMax:   string;
}

interface Props {
  produtos: ProdutoPesquisa[];
  filtros:  Filtros;
  /** false = página aberta sem filtros (não houve consulta ao backend) */
  pesquisou: boolean;
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProdutosView({ produtos, filtros, pesquisou }: Props) {
  const router = useRouter();
  const [busca,      setBusca]      = useState(filtros.busca);
  const [fabricante, setFabricante] = useState(filtros.fabricante);
  const [precoMin,   setPrecoMin]   = useState(filtros.precoMin);
  const [precoMax,   setPrecoMax]   = useState(filtros.precoMax);
  const [imgAmpliada, setImgAmpliada] = useState<ProdutoPesquisa | null>(null);
  const [estoqueLojas, setEstoqueLojas] = useState<ProdutoPesquisa | null>(null);
  const [linhasEstoque, setLinhasEstoque] = useState<EstoqueFilial[] | null>(null);
  const [historicoProduto, setHistoricoProduto] = useState<ProdutoPesquisa | null>(null);
  const [erroEstoque, setErroEstoque] = useState('');
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debRef.current) clearTimeout(debRef.current); }, []);

  async function abrirEstoqueLojas(p: ProdutoPesquisa) {
    setEstoqueLojas(p);
    setLinhasEstoque(null);
    setErroEstoque('');
    try {
      const sp = new URLSearchParams({
        id_pro:     String(p.id_pro),
        cod_filial: String(p.cod_filial),
        busca:      p.cod_pro || p.descricao,
      });
      const res = await fetch(`/api/produto-estoque-filiais?${sp.toString()}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json() as { dados?: EstoqueFilial[] };
      setLinhasEstoque(json.dados ?? []);
    } catch {
      setErroEstoque('Não foi possível consultar o estoque das lojas.');
    }
  }

  function navegar(extra?: Partial<Filtros>) {
    const f = { busca, fabricante, precoMin, precoMax, ...extra };
    const sp = new URLSearchParams();
    if (f.busca)      sp.set('busca', f.busca);
    if (f.fabricante) sp.set('fabricante', f.fabricante);
    if (f.precoMin)   sp.set('preco_min', f.precoMin);
    if (f.precoMax)   sp.set('preco_max', f.precoMax);
    router.push(`/produtos?${sp.toString()}`);
  }

  function navegarDebounced(extra?: Partial<Filtros>) {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => navegar(extra), 450);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">

      {/* ── Cabeçalho ── */}
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Produtos
      </h1>

      {/* ── Filtros ── */}
      <div className="rounded-xl border bg-card p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1 col-span-2 lg:col-span-1">
            <label className="text-xs text-muted-foreground">Nome / Código / Espécie</label>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-1.5 rounded-md border border-input px-2 h-9 min-w-0">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); navegarDebounced({ busca: e.target.value }); }}
                  placeholder="Buscar produto..."
                  className="flex-1 min-w-0 text-sm bg-transparent outline-none"
                  autoFocus
                />
                {busca && (
                  <button onClick={() => { setBusca(''); navegar({ busca: '' }); }}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <ScannerCodigoBarras onScan={(codigo) => { setBusca(codigo); navegar({ busca: codigo }); }} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fabricante</label>
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-9">
              <Factory className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={fabricante}
                onChange={(e) => { setFabricante(e.target.value); navegarDebounced({ fabricante: e.target.value }); }}
                placeholder="Ex: ROYAL CANIN"
                className="flex-1 min-w-0 text-sm bg-transparent outline-none"
              />
              {fabricante && (
                <button onClick={() => { setFabricante(''); navegar({ fabricante: '' }); }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Preço mínimo (R$)</label>
            <Input
              value={precoMin}
              onChange={(e) => { setPrecoMin(e.target.value); navegarDebounced({ precoMin: e.target.value }); }}
              inputMode="decimal"
              placeholder="0,00"
              className="h-9 text-sm text-right font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Preço máximo (R$)</label>
            <Input
              value={precoMax}
              onChange={(e) => { setPrecoMax(e.target.value); navegarDebounced({ precoMax: e.target.value }); }}
              inputMode="decimal"
              placeholder="0,00"
              className="h-9 text-sm text-right font-mono"
            />
          </div>
        </div>
      </div>

      {pesquisou && (
        <p className="text-xs text-muted-foreground">
          {produtos.length} produto{produtos.length === 1 ? '' : 's'} encontrado{produtos.length === 1 ? '' : 's'}
          {produtos.length === 200 && ' (mostrando os 200 primeiros — refine a busca)'}
        </p>
      )}

      {/* ── Grid ── */}
      {!pesquisou ? (
        /* Tela recém-aberta: nada foi consultado ainda — convite à pesquisa */
        <div className="flex flex-col items-center justify-center py-20 sm:py-28 text-center select-none">
          <div className="relative mb-6">
            <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent shadow-sm">
              <Package className="h-9 w-9 text-primary/50" />
              <span className="absolute -bottom-2.5 -right-2.5 flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-md">
                <Search className="h-4 w-4 text-muted-foreground animate-pulse" />
              </span>
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground/80">
            Encontre um produto usando os filtros acima
          </p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground/50">
            Pesquise por nome, código de barras, espécie ou fabricante —
            os resultados aparecem aqui.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/40">Ex.:</span>
            {/* termo sem acento: o banco grava as descrições sem acentuação */}
            {[
              { rotulo: 'Ração',      termo: 'RACAO' },
              { rotulo: 'Shampoo',    termo: 'SHAMPOO' },
              { rotulo: 'Antipulgas', termo: 'ANTIPULGAS' },
            ].map(({ rotulo, termo }) => (
              <button
                key={termo}
                type="button"
                onClick={() => { setBusca(termo); navegar({ busca: termo }); }}
                className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground/60 transition-colors hover:border-primary/50 hover:text-primary"
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      ) : produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
          <Package className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhum produto encontrado para os filtros.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* No celular somem Fabricante/Espécie/Unid. e o código migra
                    para baixo da descrição: Preço e Estoque ficam sempre visíveis */}
                <TableHead className="w-14 px-2">Foto</TableHead>
                <TableHead className="w-32 px-2 hidden md:table-cell">Código</TableHead>
                <TableHead className="min-w-[7rem]">Descrição</TableHead>
                <TableHead className="px-2 hidden md:table-cell">Fabricante</TableHead>
                <TableHead className="px-2 w-24 hidden md:table-cell">Espécie</TableHead>
                <TableHead className="text-center w-16 px-1 hidden md:table-cell">Unid.</TableHead>
                <TableHead className="text-right w-24 px-2">Preço</TableHead>
                <TableHead className="text-right w-24 px-2">Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((p) => (
                <TableRow key={p.id_dadospro} className="hover:bg-muted/40">
                  <TableCell className="px-2 py-1.5">
                    {p.tem_imagem === 1 ? (
                      <button
                        type="button"
                        onClick={() => setImgAmpliada(p)}
                        className="block h-10 w-10 rounded-md border overflow-hidden bg-white hover:ring-2 hover:ring-primary transition-all"
                        title="Clique para ampliar"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/produto-imagem?id_pro=${p.id_pro}&filial=${p.cod_filial}`}
                          alt={p.descricao}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ) : (
                      <div className="h-10 w-10 rounded-md border bg-muted/30 flex items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground px-2 hidden md:table-cell">{p.cod_pro || '—'}</TableCell>
                  <TableCell className="text-sm font-medium !whitespace-normal [overflow-wrap:anywhere]">
                    {p.descricao}
                    <span className="block md:hidden font-mono text-[11px] font-normal text-muted-foreground">
                      {p.cod_pro || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm px-2 hidden md:table-cell">{p.fabricante || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground px-2 hidden md:table-cell">{p.especie || '—'}</TableCell>
                  <TableCell className="text-center text-xs px-1 hidden md:table-cell">{p.unidade || '—'}</TableCell>
                  <TableCell className="text-right px-2 whitespace-nowrap">
                    <span className="text-sm font-mono font-semibold text-primary">R$ {fmtMoeda(p.preco)}</span>
                    {(p.peso ?? 0) > 0 && (
                      <span className="block text-[11px] text-muted-foreground font-mono" title="Preço por kg (preço ÷ volume)">
                        R$ {fmtMoeda(p.preco / (p.peso ?? 1))}/kg
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right text-sm font-mono px-2',
                    p.estoque <= 0 ? 'text-red-500 font-semibold' : '',
                  )}>
                    <span className="inline-flex items-center gap-1.5">
                      {p.estoque.toLocaleString('pt-BR')}
                      <button
                        type="button"
                        onClick={() => abrirEstoqueLojas(p)}
                        className="rounded-md border p-1 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                        title="Ver estoque das lojas"
                      >
                        <Store className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoricoProduto(p)}
                        className="rounded-md border p-1 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                        title="Histórico do produto"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Imagem ampliada ── */}
      {imgAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setImgAmpliada(null)}
        >
          <div
            className="bg-card rounded-xl shadow-xl p-4 max-w-lg w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{imgAmpliada.descricao}</p>
                <p className="text-xs text-muted-foreground font-mono">{imgAmpliada.cod_pro}</p>
              </div>
              <button type="button" onClick={() => setImgAmpliada(null)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="rounded-lg border bg-white flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/produto-imagem?id_pro=${imgAmpliada.id_pro}&filial=${imgAmpliada.cod_filial}`}
                alt={imgAmpliada.descricao}
                className="max-h-[60vh] object-contain"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{imgAmpliada.fabricante}</span>
              <span className="font-mono font-bold text-primary">R$ {fmtMoeda(imgAmpliada.preco)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Estoque das lojas ── */}
      {estoqueLojas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setEstoqueLojas(null)}
        >
          <div
            className="bg-card rounded-xl shadow-xl p-4 max-w-md w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-primary" />
                  Estoque das lojas
                </p>
                <p className="text-xs mt-1">{estoqueLojas.descricao}</p>
                <p className="text-xs text-muted-foreground font-mono">{estoqueLojas.cod_pro}</p>
              </div>
              <button type="button" onClick={() => setEstoqueLojas(null)}>
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {erroEstoque ? (
              <p className="text-sm text-red-500 py-4 text-center">{erroEstoque}</p>
            ) : linhasEstoque === null ? (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Consultando lojas...</span>
              </div>
            ) : linhasEstoque.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma loja encontrada para este produto.
              </p>
            ) : (
              <div className="rounded-md border divide-y">
                {linhasEstoque.map((l) => (
                  <div key={l.filial} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{l.filial}</span>
                      {l.nome_filial || `Filial ${l.filial}`}
                    </span>
                    {l.estoque === null ? (
                      <span className="text-xs text-muted-foreground">sem cadastro</span>
                    ) : (
                      <span className={cn(
                        'font-mono font-semibold',
                        l.estoque <= 0 ? 'text-red-500' : 'text-primary',
                      )}>
                        {l.estoque.toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-sm bg-muted/40">
                  <span className="font-semibold">Total</span>
                  <span className="font-mono font-bold">
                    {linhasEstoque
                      .reduce((s, l) => s + (l.estoque ?? 0), 0)
                      .toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Historico do produto ── */}
      {historicoProduto && (
        <HistoricoProdutoModal
          idPro={historicoProduto.id_pro}
          codFilial={historicoProduto.cod_filial}
          descricao={historicoProduto.descricao}
          codPro={historicoProduto.cod_pro}
          onClose={() => setHistoricoProduto(null)}
        />
      )}
    </div>
  );
}
