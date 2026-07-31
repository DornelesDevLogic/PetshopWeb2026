'use client';

import { useState, useTransition } from 'react';
import {
  testarIntegracaoPetlove,
  type TesteIntegracaoPetlove,
} from '@/app/(petshop)/configuracoes/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock, Unlock, AlertCircle, CheckCircle2, Loader2, PawPrint,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SENHA_ACESSO = '102030';

export default function IntegracoesPanel() {
  const [desbloqueado, setDesbloqueado] = useState(false);
  const [senha, setSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  function tentarDesbloquear(e: React.FormEvent) {
    e.preventDefault();
    if (senha === SENHA_ACESSO) {
      setDesbloqueado(true);
      setErroSenha('');
    } else {
      setErroSenha('Senha incorreta.');
    }
  }

  if (!desbloqueado) {
    return (
      <div className="rounded-xl border bg-card p-8 flex flex-col items-center gap-4 max-w-sm mx-auto text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Área restrita</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Digite a senha de acesso pra ver as integrações disponíveis.
          </p>
        </div>
        <form onSubmit={tentarDesbloquear} className="w-full space-y-2">
          <Input
            type="password"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErroSenha(''); }}
            placeholder="Senha"
            autoFocus
            className="text-center"
          />
          {erroSenha && <p className="text-xs text-destructive">{erroSenha}</p>}
          <Button type="submit" className="w-full">
            <Unlock className="h-4 w-4 mr-1.5" /> Acessar
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PetloveCard />
    </div>
  );
}

function PetloveCard() {
  const [busca, setBusca] = useState('');
  const [isPending, startT] = useTransition();
  const [resultado, setResultado] = useState<TesteIntegracaoPetlove | null>(null);

  function testar() {
    setResultado(null);
    startT(async () => {
      const r = await testarIntegracaoPetlove(busca);
      setResultado(r);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PawPrint className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Petlove — teste de integração</h2>
          <p className="text-xs text-muted-foreground">Consulta por CPF do proprietário ou nº da carteirinha.</p>
        </div>
      </div>

      <div className="flex items-end gap-2 max-w-md">
        <div className="flex-1 space-y-1">
          <Label htmlFor="petlove_busca" className="text-xs">CPF ou nº da carteirinha</Label>
          <Input
            id="petlove_busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="000.000.000-00 ou nº da carteirinha"
          />
        </div>
        <Button onClick={testar} disabled={isPending || !busca.trim()}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar'}
        </Button>
      </div>

      {resultado && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md px-4 py-3 text-sm',
            resultado.ok
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900'
              : resultado.simulado
                ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900'
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900',
          )}
        >
          {resultado.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <div className="space-y-1">
            <p>{resultado.mensagem}</p>
            {resultado.dados && (
              <pre className="text-xs bg-black/5 dark:bg-white/5 rounded p-2 overflow-x-auto">
                {JSON.stringify(resultado.dados, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
