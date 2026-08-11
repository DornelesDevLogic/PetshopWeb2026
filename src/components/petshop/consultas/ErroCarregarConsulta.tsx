import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

/** Mostra a mensagem real do erro (ex: "Backend 500: lock timeout") em vez
 * de um 404 genérico — erro de conexão/backend não é "consulta não existe". */
export default function ErroCarregarConsulta({
  mensagem,
  retryHref,
}: {
  mensagem: string;
  retryHref: string;
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 p-6 text-center space-y-4">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <h1 className="text-lg font-semibold">Não foi possível carregar a consulta</h1>
      <p className="text-sm text-muted-foreground break-words">{mensagem}</p>
      <div className="flex justify-center gap-2 pt-2">
        <Link href="/consultas" className={buttonVariants({ variant: 'outline' })}>
          Voltar para Consultas
        </Link>
        <Link href={retryHref} className={buttonVariants({ variant: 'default' })}>
          Tentar novamente
        </Link>
      </div>
    </div>
  );
}
