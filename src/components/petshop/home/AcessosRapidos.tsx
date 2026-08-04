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
          className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-center">{label}</span>
        </Link>
      ))}
    </div>
  );
}
