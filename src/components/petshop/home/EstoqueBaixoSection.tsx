import { carregarEstoqueBaixo } from '@/app/(petshop)/home/actions';
import EstoqueBaixo from './EstoqueBaixo';
import { AlertTriangle } from 'lucide-react';

export default async function EstoqueBaixoSection() {
  const produtos = await carregarEstoqueBaixo();

  if (produtos === null) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Endpoint indisponível (recompilar backend).
      </div>
    );
  }

  return <EstoqueBaixo produtos={produtos} />;
}
