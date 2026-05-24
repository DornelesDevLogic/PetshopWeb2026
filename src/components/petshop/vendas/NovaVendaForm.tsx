'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buscarClientes, createPrevenda } from '@/app/(petshop)/vendas/nova/actions';
import { Cliente } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Loader2, AlertCircle, User, X } from 'lucide-react';

export default function NovaVendaForm() {
  const router = useRouter();

  const [clienteQ, setClienteQ]       = useState('');
  const [resultados, setResultados]   = useState<Cliente[]>([]);
  const [clienteSel, setClienteSel]   = useState<Cliente | null>(null);
  const [isBuscando, startBusca]      = useTransition();
  const [isPending, startSubmit]      = useTransition();
  const [errorMsg, setErrorMsg]       = useState('');

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteQ.trim()) return;
    startBusca(async () => {
      const lista = await buscarClientes(clienteQ);
      setResultados(lista);
    });
  }

  function selecionar(c: Cliente) {
    setClienteSel(c);
    setResultados([]);
    setClienteQ('');
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    const formData = new FormData(e.currentTarget);
    formData.set('cliente_id',    String(clienteSel?.id     ?? ''));
    formData.set('cliente_filial',String(clienteSel?.filial ?? ''));
    formData.set('cliente_nome',  clienteSel?.nome           ?? '');

    startSubmit(async () => {
      const result = await createPrevenda({}, formData);
      if (result.error) { setErrorMsg(result.error); return; }
      router.push(`/vendas/${result.id}`);
    });
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/vendas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Vendas
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Nova Pré-venda</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Cliente */}
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Cliente *
          </h2>

          {clienteSel ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="font-medium">{clienteSel.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {clienteSel.celular || clienteSel.telefone || clienteSel.cpf_cnpj || '—'}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setClienteSel(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome, CPF ou telefone..."
                  value={clienteQ}
                  onChange={(e) => setClienteQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBuscar(e as unknown as React.FormEvent); } }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleBuscar} disabled={isBuscando}>
                  {isBuscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {resultados.length > 0 && (
                <div className="rounded-md border divide-y bg-white shadow-sm overflow-hidden">
                  {resultados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selecionar(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.celular || c.telefone || c.cpf_cnpj || '—'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Dados opcionais */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dados da Venda
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="formapgto">Forma de Pagamento</Label>
            <Input id="formapgto" name="formapgto" placeholder="Dinheiro, Cartão, PIX..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <textarea
              id="obs"
              name="obs"
              rows={3}
              placeholder="Observações gerais da venda..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/vendas">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={isPending || !clienteSel}>
            {isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
              : 'Criar Pré-venda'}
          </Button>
        </div>

      </form>
    </div>
  );
}
