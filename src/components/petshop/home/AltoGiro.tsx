import { cn } from '@/lib/utils';
import { Package } from 'lucide-react';
import type { ProdutoAltoGiro } from '@/app/(petshop)/home/actions';

const MEDALHA = ['bg-[#C99A2E]', 'bg-[#9098A8]', 'bg-[#B4703B]'];

export default function AltoGiro({ produtos }: { produtos: ProdutoAltoGiro[] }) {
  if (!produtos || produtos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Sem movimento de produtos nos últimos 30 dias.
      </div>
    );
  }

  const maiorQtd = Math.max(...produtos.map((p) => p.qtd), 1);
  const totalQtd = produtos.reduce((s, p) => s + p.qtd, 0) || 1;

  return (
    <ul className="divide-y">
      {produtos.map((p, i) => (
        <li key={p.cod_pro + i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className={cn(
            'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
            i < 3 ? MEDALHA[i] : 'bg-muted text-muted-foreground',
          )}>
            {i + 1}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] dark:bg-[#6366F1]/15 dark:text-[#818CF8]">
            <Package className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <span className="truncate block text-sm font-medium">{p.descricao || p.cod_pro}</span>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#6366F1]"
                style={{ width: `${Math.max(4, (p.qtd / maiorQtd) * 100)}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="block text-sm font-semibold tabular-nums">
              {p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} un
            </span>
            <span className="block text-[11px] text-muted-foreground tabular-nums">
              {((p.qtd / totalQtd) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
