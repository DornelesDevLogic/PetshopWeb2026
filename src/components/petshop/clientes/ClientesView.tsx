'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
import { Users, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Props {
  clientes: Cliente[];
  total: number;
  qAtual: string;
  situacaoAtual: string;
  skipAtual: number;
  limit: number;
}

function SituacaoBadge({ s }: { s: string }) {
  const ativo = s === 'A' || s === '';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ativo
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500 line-through',
      )}
    >
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
  situacaoAtual,
  skipAtual,
  limit,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(qAtual);
  const [, startTransition] = useTransition();

  function nav(params: Record<string, string | number | null | undefined>) {
    const sp = new URLSearchParams();
    if (qAtual)       sp.set('q', qAtual);
    if (situacaoAtual) sp.set('situacao', situacaoAtual);
    sp.set('skip', String(skipAtual));
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') sp.set(k, String(v));
      else sp.delete(k);
    });
    startTransition(() => router.push('/clientes?' + sp.toString()));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    nav({ q: q.trim(), skip: 0 });
  }

  const temProx  = clientes.length === limit;
  const temAnter = skipAtual > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Clientes
          </h1>
          <span className="text-sm text-muted-foreground">
            {total > 0 ? `${total} resultado${total !== 1 ? 's' : ''}` : ''}
          </span>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mt-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <Input
              placeholder="Buscar por nome, CPF, telefone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" size="icon" variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Select
            value={situacaoAtual || 'todos'}
            onValueChange={(v) => nav({ situacao: v === 'todos' ? '' : v, skip: 0 })}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="A">Ativos</SelectItem>
              <SelectItem value="I">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          <div className="rounded-md border bg-white">
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
                  <TableRow key={`${c.id}-${c.filial}`} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium">{c.nome}</div>
                      {c.nome_fantasia && (
                        <div className="text-xs text-muted-foreground">{c.nome_fantasia}</div>
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
                      <SituacaoBadge s={c.situacao} />
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
        )}

        {/* Paginação (só aparece quando não há busca por texto) */}
        {!qAtual && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!temAnter}
              onClick={() => nav({ skip: Math.max(0, skipAtual - limit) })}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {skipAtual + 1}–{skipAtual + clientes.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!temProx}
              onClick={() => nav({ skip: skipAtual + limit })}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
