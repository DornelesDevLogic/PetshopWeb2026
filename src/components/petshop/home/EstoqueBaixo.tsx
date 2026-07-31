import { cn } from '@/lib/utils';
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
    <ul className="space-y-2">
      {produtos.map((p, i) => {
        const zerado = p.estoque <= 0;
        return (
          <li
            key={p.cod_pro + i}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <span className="truncate block text-sm font-medium">{p.descricao || p.cod_pro}</span>
              <span className="text-xs text-muted-foreground">
                Cód. {p.cod_pro || '—'} · vendeu {p.qtd_hoje.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} hoje
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  zerado ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
                )}
              >
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
