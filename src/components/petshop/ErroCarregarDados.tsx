import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

/** Mostra a mensagem real do erro (ex: "Backend 429: limite de requisicoes
 * excedido") em vez de um 404 genérico — erro de conexão/backend não
 * significa que o registro não existe. */
export default function ErroCarregarDados({
  mensagem,
  retryHref,
  voltarHref = '/',
  voltarLabel = 'Voltar',
}: {
  mensagem: string;
  retryHref: string;
  voltarHref?: string;
  voltarLabel?: string;
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 p-6 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <h1 className="text-lg font-semibold">Não foi possível carregar os dados</h1>
      <p className="text-sm text-muted-foreground break-words">{mensagem}</p>
      <div className="flex justify-center gap-2 pt-2">
        <Link href={voltarHref} className={buttonVariants({ variant: 'outline' })}>
          {voltarLabel}
        </Link>
        <Link href={retryHref} className={buttonVariants({ variant: 'default' })}>
          Tentar novamente
        </Link>
      </div>
    </div>
  );
}
