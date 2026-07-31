import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface Props {
  label:      string;
  valor:      string;                 // já formatado (ex.: "R$ 1.234,56")
  delta?:     number | null;          // variação % vs período anterior
  icon?:      React.ReactNode;
  hint?:      string;                 // legenda pequena (ex.: "vs. período anterior")
  accent?:    'primary' | 'green' | 'blue' | 'amber' | 'violet' | 'rose';
}

const ACCENT: Record<string, string> = {
  primary: 'text-primary',
  green:   'text-green-600 dark:text-green-400',
  blue:    'text-blue-600 dark:text-blue-400',
  amber:   'text-amber-600 dark:text-amber-400',
  violet:  'text-violet-600 dark:text-violet-400',
  rose:    'text-rose-600 dark:text-rose-400',
};

export default function KpiCard({ label, valor, delta, icon, hint, accent = 'primary' }: Props) {
  const temDelta = typeof delta === 'number' && isFinite(delta);
  const positivo = temDelta && delta! > 0;
  const negativo = temDelta && delta! < 0;

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-1.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className={cn('shrink-0', ACCENT[accent])}>{icon}</span>}
      </div>
      <span className="text-2xl font-bold leading-tight tabular-nums">{valor}</span>
      {temDelta && (
        <div className="flex items-center gap-1 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold rounded px-1 py-0.5',
              positivo && 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30',
              negativo && 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
              !positivo && !negativo && 'text-muted-foreground bg-muted',
            )}
          >
            {positivo ? <ArrowUpRight className="h-3 w-3" /> : negativo ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta!).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      )}
    </div>
  );
}
