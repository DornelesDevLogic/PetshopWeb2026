'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  Package, Search, X, ImageIcon, Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

export default function ProdutosView({ produtos, filtros }: Props) {
  const router = useRouter();
  const [busca,      setBusca]      = useState(filtros.busca);
  const [fabricante, setFabricante] = useState(filtros.fabricante);
  const [precoMin,   setPrecoMin]   = useState(filtros.precoMin);
  const [precoMax,   setPrecoMax]   = useState(filtros.precoMax);
  const [imgAmpliada, setImgAmpliada] = useState<ProdutoPesquisa | null>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (debRef.current) clearTimeout(debRef.current); }, []);

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
            <div className="flex items-center gap-1.5 rounded-md border border-input px-2 h-9">
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

      <p className="text-xs text-muted-foreground">
        {produtos.length} produto{produtos.length === 1 ? '' : 's'} encontrado{produtos.length === 1 ? '' : 's'}
        {produtos.length === 200 && ' (mostrando os 200 primeiros — refine a busca)'}
      </p>

      {/* ── Grid ── */}
      {produtos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
          <Package className="h-10 w-10 mb-2" />
          <p className="text-sm">Nenhum produto encontrado para os filtros.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 px-2">Foto</TableHead>
                <TableHead className="w-32 px-2">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="px-2">Fabricante</TableHead>
                <TableHead className="px-2 w-24">Espécie</TableHead>
                <TableHead className="text-center w-16 px-1">Unid.</TableHead>
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
                          src={`/api/produto-imagem?id_pro=${p.id_pro}`}
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
                  <TableCell className="font-mono text-xs text-muted-foreground px-2">{p.cod_pro || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{p.descricao}</TableCell>
                  <TableCell className="text-sm px-2">{p.fabricante || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground px-2">{p.especie || '—'}</TableCell>
                  <TableCell className="text-center text-xs px-1">{p.unidade || '—'}</TableCell>
                  <TableCell className="text-right text-sm font-mono font-semibold text-primary px-2">
                    R$ {fmtMoeda(p.preco)}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right text-sm font-mono px-2',
                    p.estoque <= 0 ? 'text-red-500 font-semibold' : '',
                  )}>
                    {p.estoque.toLocaleString('pt-BR')}
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
                src={`/api/produto-imagem?id_pro=${imgAmpliada.id_pro}`}
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
    </div>
  );
}
