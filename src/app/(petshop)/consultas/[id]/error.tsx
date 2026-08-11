'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

export default function ErrorConsultaDetalhe({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro ao carregar consulta:', error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-16 p-6 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <h1 className="text-lg font-semibold">Não foi possível carregar a consulta</h1>
      <p className="text-sm text-muted-foreground break-words">
        {error.message || 'Erro desconhecido ao buscar os dados da consulta.'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Código: {error.digest}</p>
      )}
      <div className="flex justify-center gap-2 pt-2">
        <Link href="/consultas" className={buttonVariants({ variant: 'outline' })}>
          Voltar para Consultas
        </Link>
        <Button onClick={() => reset()}>Tentar novamente</Button>
      </div>
    </div>
  );
}
