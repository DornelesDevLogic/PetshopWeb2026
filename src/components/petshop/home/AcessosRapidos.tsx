import Link from 'next/link';
import type { AcessoRapido } from '@/lib/acessos-rapidos';

interface Props {
  itens: AcessoRapido[];
}

// Cards de acesso rápido — a ordem reflete o que o dispositivo mais usa
// (ver src/lib/acessos-rapidos.ts), então vai se ajustando sozinha com o uso.
export default function AcessosRapidos({ itens }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {itens.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col items-center gap-2.5 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#6366F1]/50 hover:shadow-lg"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] transition-all group-hover:bg-gradient-to-br group-hover:from-[#4F46E5] group-hover:to-[#6366F1] group-hover:text-white dark:bg-[#6366F1]/15 dark:text-[#818CF8]">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-center">{label}</span>
        </Link>
      ))}
    </div>
  );
}
