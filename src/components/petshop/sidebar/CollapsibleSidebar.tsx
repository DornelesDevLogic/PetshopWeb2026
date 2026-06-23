'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  PawPrint, LogOut, UserCircle2,
  CalendarDays, Users, Stethoscope, ShoppingCart, Wallet,
  BarChart3, Settings, BellRing, SlidersHorizontal, Package,
  Truck, ClipboardList, ChevronLeft,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/agenda',        label: 'Agenda',        icon: CalendarDays  },
  { href: '/clientes',      label: 'Clientes',      icon: Users         },
  { href: '/animais',       label: 'Animais',       icon: PawPrint      },
  { href: '/consultas',     label: 'Consultas',     icon: Stethoscope   },
  { href: '/estimativas',   label: 'Estimativas',   icon: BellRing      },
  { href: '/tele-entregas', label: 'Tele-entregas', icon: Truck         },
  { href: '/prevendas',     label: 'Pré-vendas',    icon: ClipboardList },
  { href: '/produtos',      label: 'Produtos',      icon: Package       },
  { href: '/vendas',        label: 'Vendas',        icon: ShoppingCart  },
  { href: '/financeiro',    label: 'Financeiro',    icon: Wallet        },
  { href: '/relatorios',    label: 'Relatórios',    icon: BarChart3     },
  { href: '/cadastros',     label: 'Cadastros',     icon: Settings      },
];

const linkConfig = { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal };

interface Props {
  filial:     number;
  supervisor: boolean;
  user:       { codigo: number; nome: string; tipo: string; empresa: number } | null;
  logoutAction: () => Promise<void>;
  backendVersion?: string;
}

const TIPO_LABEL: Record<string, string> = {
  S: 'Supervisor', G: 'Gerente', F: 'Ger. Especial', O: 'Operador',
};

export default function CollapsibleSidebar({ filial, supervisor, user, logoutAction, backendVersion }: Props) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(true);
  const todos = supervisor ? [...links, linkConfig] : links;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-background relative',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        open ? 'w-56' : 'w-[64px]',
      )}
    >
      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center border-b shrink-0 overflow-hidden',
        'transition-all duration-300',
        open ? 'gap-2 px-5 py-4' : 'justify-center px-0 py-4',
      )}>
        <PawPrint className="h-6 w-6 text-primary shrink-0" />
        <div className={cn(
          'flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap',
          'transition-all duration-300',
          open ? 'opacity-100 max-w-[160px] ml-0' : 'opacity-0 max-w-0 ml-0',
        )}>
          <span className="font-semibold text-base leading-none">PetShop</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Filial {filial}
          </span>
        </div>
      </div>

      {/* ── Navegação ─────────────────────────────────────────────────────── */}
      <nav className={cn(
        'flex-1 overflow-y-auto overflow-x-hidden py-3',
        'transition-all duration-300',
        open ? 'px-3' : 'px-2',
      )}>
        <div className="flex flex-col gap-1">
          {todos.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={!open ? label : undefined}
                className={cn(
                  'flex items-center rounded-md text-sm font-medium transition-colors',
                  'overflow-hidden whitespace-nowrap',
                  open ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2.5',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(
                  'transition-all duration-300 overflow-hidden',
                  open ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0',
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Usuário + Logout ──────────────────────────────────────────────── */}
      <div className={cn(
        'border-t space-y-1 shrink-0 overflow-hidden',
        'transition-all duration-300',
        open ? 'px-3 py-3' : 'px-2 py-3',
      )}>
        {user && (
          <div className={cn(
            'flex items-center rounded-md bg-muted/50 text-xs text-muted-foreground overflow-hidden',
            'transition-all duration-300',
            open ? 'gap-2 px-3 py-2' : 'justify-center px-0 py-2',
          )}>
            <UserCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <div className={cn(
              'min-w-0 overflow-hidden transition-all duration-300',
              open ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0',
            )}>
              <p className="font-medium text-foreground truncate">{user.nome}</p>
              <p className="truncate">
                Cód. {user.codigo}
                {user.tipo ? ` · ${TIPO_LABEL[user.tipo] ?? user.tipo}` : ''}
              </p>
            </div>
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            title={!open ? 'Sair' : undefined}
            className={cn(
              'flex w-full items-center rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground overflow-hidden',
              open ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2.5',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(
              'transition-all duration-300 overflow-hidden whitespace-nowrap',
              open ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0',
            )}>
              Sair
            </span>
          </button>
        </form>
        <ThemeToggle collapsed={!open} />

        {/* ── Versão do backend ───────────────────────────────────────────── */}
        {backendVersion && (
          <div
            title={`API PetShop v${backendVersion}`}
            className={cn(
              'flex items-center text-[10px] text-muted-foreground/60 overflow-hidden',
              'transition-all duration-300',
              open ? 'justify-center gap-1 pt-1' : 'justify-center pt-1',
            )}
          >
            {open ? (
              <span className="whitespace-nowrap">API v{backendVersion}</span>
            ) : (
              <span className="font-mono">v{backendVersion.split('.').slice(0, 2).join('.')}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Botão colapsar ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Recolher menu' : 'Expandir menu'}
        className={cn(
          'absolute -right-4 top-[68px] z-10',
          'h-8 w-8 rounded-full border-2 border-primary/30 bg-background shadow-lg',
          'flex items-center justify-center',
          'text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:scale-110',
          'transition-all duration-200',
        )}
      >
        <ChevronLeft className={cn(
          'h-4 w-4 transition-transform duration-300',
          !open && 'rotate-180',
        )} />
      </button>
    </aside>
  );
}
