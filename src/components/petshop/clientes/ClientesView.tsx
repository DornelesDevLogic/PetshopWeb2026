'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, useEffect, useRef } from 'react';
import { Cliente } from '@/types/petshop';
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
import { Users, Search, ChevronLeft, ChevronRight, Eye, PawPrint, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import NovoClienteDialog from './NovoClienteDialog';

interface Props {
  clientes:      Cliente[];
  total:         number;
  qAtual:        string;
  qPetAtual:     string;
  situacaoAtual: string;
  skipAtual:     number;
  limit:         number;
}

function SituacaoBadge({ statusAtivo }: { statusAtivo: number }) {
  const ativo = statusAtivo === 0;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      ativo ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground line-through',
    )}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function fmtFone(f: string): string {
  return f || '—';
}

export default function ClientesView({
  clientes,
  total,
  qAtual,
  qPetAtual,
  situacaoAtual,
  skipAtual,
  limit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // campo único — começa com o valor atual (qualquer um dos dois)
  const [q, setQ] = useState(qAtual || qPetAtual);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  function nav(params: Record<string, string | number | null | undefined>) {
    const sp = new URLSearchParams();
    if (situacaoAtual) sp.set('situacao', situacaoAtual);
    sp.set('skip', String(skipAtual));
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
      else sp.delete(k);
    });
    startTransition(() => router.push('/clientes?' + sp.toString()));
  }

  // debounce: dispara busca 400ms após última digitação, mínimo 3 chars (ou 0 = limpar)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      // campo limpo → só navega se havia busca ativa (evita fetch no mount)
      if (qAtual || qPetAtual) nav({ q: null, qPet: null, skip: 0 });
      return;
    }
    if (trimmed.length < 3) return; // aguarda mais caracteres
    timerRef.current = setTimeout(() => {
      nav({ q: trimmed, qPet: null, skip: 0 });
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function handleLimpar() {
    setQ('');
    nav({ q: null, qPet: null, skip: 0 });
  }

  const buscando = !!(qAtual || qPetAtual);
  const temProx  = clientes.length === limit;
  const temAnter = skipAtual > 0;
  const termoBusca = qAtual || qPetAtual;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clientes
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {total > 0 ? `${total} resultado${total !== 1 ? 's' : ''}` : ''}
            </span>
            <NovoClienteDialog />
          </div>
        </div>

        {/* Campo único de busca */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            {isPending
              ? <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />
              : <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />}
            <Input
              placeholder="Nome, CPF, telefone, nome do pet..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 pr-8"
              autoComplete="off"
            />
            {q && (
              <button type="button" onClick={handleLimpar}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {buscando && (
            <Button type="button" size="sm" variant="ghost" onClick={handleLimpar}>
              Limpar
            </Button>
          )}

          {/* Situação — oculto quando há busca; sem seleção = tela vazia */}
          {!buscando && (
            <Select value={situacaoAtual || null} onValueChange={(v) => { if (v) nav({ situacao: v, skip: 0 }); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Ativos</SelectItem>
                <SelectItem value="I">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Dica quando há busca ativa */}
        {buscando && termoBusca && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Search className="h-3 w-3" />
            Buscando por &quot;{termoBusca}&quot; em clientes e pets
          </p>
        )}
        {q.trim().length > 0 && q.trim().length < 3 && (
          <p className="text-xs text-muted-foreground mt-2">
            Digite ao menos 3 letras para buscar...
          </p>
        )}
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              {buscando
                ? 'Nenhum cliente encontrado.'
                : situacaoAtual || skipAtual > 0
                  ? 'Nenhum cliente cadastrado.'
                  : 'Use a busca acima ou o filtro de situação para listar clientes.'}
            </p>
          </div>
        ) : (
          <>
            {/* Cards (mobile) */}
            <div className="flex flex-col gap-3 md:hidden">
              {clientes.map((c) => (
                <Link key={`card-${c.id}-${c.filial}`} href={`/clientes/${c.id}`}>
                  <div className="rounded-xl border bg-card p-4 hover:shadow-md active:scale-[0.99] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm leading-tight truncate">{c.nome}</p>
                          <SituacaoBadge statusAtivo={c.status_ativo} />
                        </div>
                        {buscando && c.pets_resumo ? (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                            <PawPrint className="h-3 w-3 shrink-0" />
                            {c.pets_resumo}
                          </p>
                        ) : c.nome_fantasia && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                            {buscando && <PawPrint className="h-3 w-3 shrink-0" />}
                            {c.nome_fantasia}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {(c.celular || c.telefone) && (
                            <span>📱 {fmtFone(c.celular || c.telefone)}</span>
                          )}
                          {c.cpf_cnpj && <span className="font-mono">{c.cpf_cnpj}</span>}
                          {c.cidade && <span>{c.cidade}{c.uf ? ` / ${c.uf}` : ''}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Tabela (desktop) */}
            <div className="hidden md:block rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">CPF / CNPJ</TableHead>
                    <TableHead className="hidden md:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Cidade / UF</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={`${c.id}-${c.filial}`} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="font-medium">{c.nome}</div>
                        {buscando && c.pets_resumo ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <PawPrint className="h-3 w-3 shrink-0" />
                            {c.pets_resumo}
                          </div>
                        ) : c.nome_fantasia && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            {buscando && <PawPrint className="h-3 w-3 shrink-0" />}
                            {c.nome_fantasia}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm">
                        {c.cpf_cnpj || '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {fmtFone(c.celular || c.telefone)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {c.cidade ? `${c.cidade} / ${c.uf}` : '—'}
                      </TableCell>
                      <TableCell>
                        <SituacaoBadge statusAtivo={c.status_ativo} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/clientes/${c.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Paginação — só quando há listagem ativa */}
        {!buscando && (clientes.length > 0 || skipAtual > 0) && (
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" disabled={!temAnter}
              onClick={() => nav({ skip: Math.max(0, skipAtual - limit) })}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {skipAtual + 1}–{skipAtual + clientes.length}
            </span>
            <Button variant="outline" size="sm" disabled={!temProx}
              onClick={() => nav({ skip: skipAtual + limit })}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
