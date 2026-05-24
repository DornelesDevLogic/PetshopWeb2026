'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  PawPrint,
  Stethoscope,
  ShoppingCart,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react';

const links = [
  { href: '/agenda',     label: 'Agenda',      icon: CalendarDays },
  { href: '/clientes',   label: 'Clientes',    icon: Users },
  { href: '/animais',    label: 'Animais',     icon: PawPrint },
  { href: '/consultas',  label: 'Consultas',   icon: Stethoscope },
  { href: '/vendas',     label: 'Vendas',      icon: ShoppingCart },
  { href: '/financeiro', label: 'Financeiro',  icon: Wallet },
  { href: '/relatorios', label: 'Relatórios',  icon: BarChart3 },
  { href: '/cadastros',  label: 'Cadastros',   icon: Settings },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
