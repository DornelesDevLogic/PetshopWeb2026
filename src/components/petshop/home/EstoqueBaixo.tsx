import { cn } from '@/lib/utils';
import { PackageX } from 'lucide-react';
import type { ProdutoEstoqueBaixo } from '@/app/(petshop)/home/actions';

export default function EstoqueBaixo({ produtos }: { produtos: ProdutoEstoqueBaixo[] }) {
  if (!produtos || produtos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Nenhum produto com estoque crítico no momento.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {produtos.map((p, i) => {
        const zerado = p.estoque <= 0;
        // Crítico: já zerado ou cobre menos de ~3 dias no ritmo de venda atual.
        const critico = zerado || p.dias_cobertura <= 3;
        return (
          <li key={p.cod_pro + i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:bg-red-400/15 dark:text-red-400">
              <PackageX className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <span className="truncate block text-sm font-medium">{p.descricao || p.cod_pro}</span>
              <span className="text-xs text-muted-foreground">Cód. {p.cod_pro || '—'}</span>
            </div>
            <span className={cn('h-2 w-2 rounded-full shrink-0', critico ? 'bg-red-500' : 'bg-amber-500')} />
            <div className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                {p.estoque.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} un
              </span>
              <span className="block text-[11px] text-muted-foreground">
                cobre ~{p.dias_cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia(s)
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
