'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCliente } from '@/app/(petshop)/clientes/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, Plus } from 'lucide-react';

export default function NovoClienteDialog() {
  const router = useRouter();
  const [open, setOpen]            = useState(false);
  const [error, setError]          = useState('');
  const [pessoa, setPessoa]        = useState<string>('F');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    formData.set('pessoa', pessoa);
    startTransition(async () => {
      const result = await createCliente({}, formData);
      if (result.error) { setError(result.error); return; }
      setOpen(false);
      router.push(`/clientes/${result.id}`);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Novo Cliente
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(''); }}>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          {/* Tipo de pessoa + Nome */}
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={pessoa} onValueChange={(v) => { if (v) setPessoa(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Pessoa Física</SelectItem>
                  <SelectItem value="J">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" name="nome" required placeholder="Nome completo" />
            </div>
          </div>

          {/* Nome fantasia / CPF/CNPJ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome_fantasia">
                {pessoa === 'J' ? 'Nome Fantasia' : 'Apelido'}
              </Label>
              <Input id="nome_fantasia" name="nome_fantasia" placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf_cnpj">{pessoa === 'J' ? 'CNPJ' : 'CPF'}</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" placeholder={pessoa === 'J' ? '00.000.000/0000-00' : '000.000.000-00'} />
            </div>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" name="celular" placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="email@exemplo.com" />
            </div>
          </div>

          {/* Endereço */}
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" placeholder="Rua, Avenida..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" name="numero" placeholder="N°" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" name="bairro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" />
            </div>
            <div className="grid grid-cols-[50px_1fr] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" name="uf" maxLength={2} placeholder="RS" className="uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" name="cep" placeholder="00000-000" />
              </div>
            </div>
          </div>

          {/* Data nascimento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input id="data_nascimento" name="data_nascimento" type="date" />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="comentario">Observações</Label>
            <textarea
              id="comentario"
              name="comentario"
              rows={2}
              placeholder="Informações adicionais..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : 'Salvar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
