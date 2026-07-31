'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { login } from './actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PawPrint, AlertCircle, Loader2, Building2, User, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

export interface FilialOption {
  id: number;
  nome: string;
}

interface Props {
  filiais:       FilialOption[];
  filialPadrao:  number;       // última usada (cookie) ou env
  erroFiliais?:  string;       // backend indisponível ao carregar a lista
}

export default function LoginForm({ filiais, filialPadrao, erroFiliais }: Props) {
  const [error, setError]            = useState('');
  const [showSenha, setShowSenha]    = useState(false);
  const [isPending, startTransition] = useTransition();

  // Pré-seleção: última filial usada; se só existe 1, ela é a única opção
  const padraoValida = filiais.some((f) => f.id === filialPadrao)
    ? String(filialPadrao)
    : filiais.length === 1 ? String(filiais[0].id) : '';
  const [filial, setFilial] = useState(padraoValida);

  const filialUnica = filiais.length === 1;
  const nomeFilial  = filiais.find((f) => String(f.id) === filial)?.nome ?? '';

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!filial) {
      setError('Selecione a filial para continuar.');
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set('filial', filial);
    formData.set('filial_nome', nomeFilial);
    startTransition(async () => {
      const result = await login({}, formData);
      if (result?.error) setError(result.error);
      // Se não houve erro, o Server Action faz redirect('/')
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">

      {/* Filial */}
      {filiais.length > 0 ? (
        filialUnica ? (
          <div className="flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            {filiais[0].id} — {filiais[0].nome}
          </div>
        ) : (
          <Select
            value={filial || null}
            onValueChange={(v) => { if (v) setFilial(String(v)); }}
            items={filiais.map((f) => ({ value: String(f.id), label: `${f.id} — ${f.nome}` }))}
          >
            <SelectTrigger id="filial" className="w-full h-11">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />
              <SelectValue placeholder="Selecione a filial..." />
            </SelectTrigger>
            <SelectContent>
              {filiais.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>{f.id} — {f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erroFiliais ?? 'Não foi possível carregar as filiais. Recarregue a página.'}
        </div>
      )}

      {/* Usuário */}
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="codigo" name="codigo" type="number" inputMode="numeric"
          autoComplete="username" required placeholder="Usuário" min={0}
          className="h-11 pl-9 rounded-lg"
        />
      </div>

      {/* Senha */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="senha" name="senha" type={showSenha ? 'text' : 'password'}
          autoComplete="current-password" required placeholder="Senha"
          className="h-11 pl-9 pr-10 rounded-lg"
        />
        <button
          type="button"
          onClick={() => setShowSenha((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {/* Lembrar usuário */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
        <input type="checkbox" name="lembrar" className="h-4 w-4 rounded border-input" />
        Lembrar usuário
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 rounded-lg bg-blue-700 hover:bg-blue-800 text-base font-semibold"
        disabled={isPending || filiais.length === 0}
      >
        {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>) : 'Entrar'}
      </Button>

      {/* ou */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
      </div>

      <a
        href="mailto:suporte@logicbox.com.br?subject=Recuperar%20senha"
        className="flex items-center justify-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
      >
        <KeyRound className="h-4 w-4" /> Esqueci minha senha
      </a>

      <Link
        href="/registro"
        className="block text-center text-xs text-muted-foreground hover:text-blue-700 transition-colors"
      >
        Primeiro acesso? Registrar este dispositivo
      </Link>

      <p className="text-center text-xs text-muted-foreground">Versão 2.0.0</p>
    </form>
  );
}

export function LoginBrand() {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2">
        <PawPrint className="h-6 w-6 text-blue-700" />
        <h1 className="text-2xl font-bold text-blue-700">PetShop</h1>
      </div>
      <p className="text-sm text-muted-foreground">Sistema de gestão para petshops</p>
    </div>
  );
}
