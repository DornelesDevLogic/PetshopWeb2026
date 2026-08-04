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

const ACCENT_ICON: Record<string, string> = {
  primary: 'bg-[#4F46E5]/10 text-[#4F46E5] dark:bg-[#6366F1]/15 dark:text-[#818CF8]',
  green:   'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400',
  blue:    'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
  amber:   'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
  violet:  'bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-400',
  rose:    'bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400',
};

export default function KpiCard({ label, valor, delta, icon, hint, accent = 'primary' }: Props) {
  const temDelta = typeof delta === 'number' && isFinite(delta);
  const positivo = temDelta && delta! > 0;
  const negativo = temDelta && delta! < 0;

  return (
    <div className="rounded-2xl border bg-card p-5 flex flex-col gap-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        {icon && (
          <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', ACCENT_ICON[accent])}>
            {icon}
          </span>
        )}
        {temDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold rounded-full px-2 py-0.5 text-[11px]',
              positivo && 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30',
              negativo && 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30',
              !positivo && !negativo && 'text-muted-foreground bg-muted',
            )}
          >
            {positivo ? <ArrowUpRight className="h-3 w-3" /> : negativo ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta!).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>
        )}
      </div>
      <div>
        <span className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums block">{valor}</span>
        <span className="text-xs font-medium text-muted-foreground mt-1 block">{label}</span>
      </div>
      {hint && <span className="text-xs text-muted-foreground -mt-1">{hint}</span>}
    </div>
  );
}
