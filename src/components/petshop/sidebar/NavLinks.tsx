'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  CalendarDays,
  Users,
  PawPrint,
  Stethoscope,
  Wallet,
  BarChart3,
  Settings,
  BellRing,
  SlidersHorizontal,
  Package,
  Truck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SubmenuItem { href: string; label: string; }

const RELATORIOS_SUBMENU: SubmenuItem[] = [
  { href: '/relatorios/comissoes',             label: 'Comissões' },
  { href: '/relatorios/comissao-profissional', label: 'Comissão por Profissional' },
  { href: '/relatorios/vendas-secao',          label: 'Vendas por Seção' },
  { href: '/relatorios/atendimentos',          label: 'Agendas / Atendimentos' },
  { href: '/relatorios/espelho-cupons',        label: 'Espelho de Cupons' },
  { href: '/relatorios/vales',                 label: 'Vales de Clientes' },
];

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: SubmenuItem[];
}

const links: NavLink[] = [
  { href: '/home',           label: 'Início',         icon: Home },
  { href: '/agenda',         label: 'Agenda',         icon: CalendarDays },
  { href: '/clientes',       label: 'Clientes',       icon: Users },
  { href: '/animais',        label: 'Animais',        icon: PawPrint },
  { href: '/consultas',      label: 'Consultas',      icon: Stethoscope },
  { href: '/estimativas',    label: 'Estimativas',    icon: BellRing },
  { href: '/tele-entregas',  label: 'Tele-entregas',  icon: Truck },
  { href: '/prevendas',      label: 'Pré-vendas',     icon: ClipboardList },
  { href: '/produtos',       label: 'Produtos',       icon: Package },
  { href: '/financeiro', label: 'Financeiro',  icon: Wallet },
  { href: '/relatorios', label: 'Relatórios',  icon: BarChart3, submenu: RELATORIOS_SUBMENU },
  { href: '/cadastros',  label: 'Cadastros',   icon: Settings },
  { href: '/sobre',      label: 'Sobre',       icon: Sparkles },
];

// Visível apenas para Supervisor (SENHA.TIPO = 'S') — regra do sistema legado
const linkConfiguracoes: NavLink = {
  href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal,
};

interface Props {
  supervisor?: boolean;
}

export default function NavLinks({ supervisor }: Props) {
  const pathname = usePathname();
  const todos = supervisor ? [...links, linkConfiguracoes] : links;
  const [relatoriosAberto, setRelatoriosAberto] = useState(pathname.startsWith('/relatorios'));

  useEffect(() => {
    if (pathname.startsWith('/relatorios')) setRelatoriosAberto(true);
  }, [pathname]);

  return (
    <nav className="flex flex-col gap-1 px-3">
      {todos.map(({ href, label, icon: Icon, submenu }) => {
        if (submenu) {
          return (
            <div key={href}>
              <button
                type="button"
                onClick={() => setRelatoriosAberto((v) => !v)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {relatoriosAberto
                  ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              </button>
              {relatoriosAberto && (
                <div className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l pl-3">
                  {submenu.map((s) => {
                    const subAtivo = pathname === s.href;
                    return (
                      <Link
                        key={s.href}
                        href={s.href}
                        className={cn(
                          'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors truncate',
                          subAtivo
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        {s.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

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
