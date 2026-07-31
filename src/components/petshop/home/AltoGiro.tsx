import type { ProdutoAltoGiro } from '@/app/(petshop)/home/actions';

export default function AltoGiro({ produtos }: { produtos: ProdutoAltoGiro[] }) {
  if (!produtos || produtos.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Sem movimento de produtos nos últimos 30 dias.
      </div>
    );
  }

  const maiorQtd = Math.max(...produtos.map((p) => p.qtd), 1);

  return (
    <ul className="space-y-2.5">
      {produtos.map((p, i) => (
        <li key={p.cod_pro + i} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <span className="truncate block text-sm font-medium">{p.descricao || p.cod_pro}</span>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (p.qtd / maiorQtd) * 100)}%` }}
              />
            </div>
          </div>
          <span className="shrink-0 w-14 text-right text-xs text-muted-foreground tabular-nums">
            {p.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} un
          </span>
        </li>
      ))}
    </ul>
  );
}
