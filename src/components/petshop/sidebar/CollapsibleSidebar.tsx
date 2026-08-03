'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  PawPrint, LogOut, UserCircle2,
  Home, CalendarDays, Users, Stethoscope, Wallet,
  BarChart3, Settings, BellRing, SlidersHorizontal, Package,
  Truck, ClipboardList, ChevronLeft, ChevronDown, ChevronRight, LayoutDashboard, Menu,
  Sparkles,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface SubmenuItem { href: string; label: string; }

const RELATORIOS_SUBMENU: SubmenuItem[] = [
  { href: '/relatorios/comissoes',            label: 'Comissões' },
  { href: '/relatorios/comissao-profissional', label: 'Comissão por Profissional' },
  { href: '/relatorios/vendas-secao',         label: 'Vendas por Seção' },
  { href: '/relatorios/atendimentos',         label: 'Agendas / Atendimentos' },
  { href: '/relatorios/espelho-cupons',       label: 'Espelho de Cupons' },
  { href: '/relatorios/vales',                label: 'Vales de Clientes' },
];

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  submenu?: SubmenuItem[];
}

const links: NavLink[] = [
  { href: '/home',          label: 'Início',        icon: Home          },
  { href: '/agenda',        label: 'Agenda',        icon: CalendarDays  },
  { href: '/clientes',      label: 'Clientes',      icon: Users         },
  { href: '/animais',       label: 'Animais',       icon: PawPrint      },
  { href: '/consultas',     label: 'Consultas',     icon: Stethoscope   },
  { href: '/estimativas',   label: 'Estimativas',   icon: BellRing      },
  { href: '/tele-entregas', label: 'Tele-entregas', icon: Truck         },
  { href: '/prevendas',     label: 'Pré-vendas',    icon: ClipboardList },
  { href: '/produtos',      label: 'Produtos',      icon: Package       },
  { href: '/financeiro',    label: 'Financeiro',    icon: Wallet        },
  { href: '/relatorios',    label: 'Relatórios',    icon: BarChart3, submenu: RELATORIOS_SUBMENU },
  { href: '/dashboards',    label: 'Dashboards',    icon: LayoutDashboard },
  { href: '/cadastros',     label: 'Cadastros',     icon: Settings      },
  { href: '/sobre',         label: 'Sobre',         icon: Sparkles      },
];

const linkConfig: NavLink = { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal };

interface Props {
  filial:     number;
  filialNome?: string;
  supervisor: boolean;
  user:       { codigo: number; nome: string; tipo: string; empresa: number } | null;
  logoutAction: () => Promise<void>;
}

const TIPO_LABEL: Record<string, string> = {
  S: 'Supervisor', G: 'Gerente', F: 'Ger. Especial', O: 'Operador',
};

export default function CollapsibleSidebar({ filial, filialNome, supervisor, user, logoutAction }: Props) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(true);
  const todos = supervisor ? [...links, linkConfig] : links;
  const [relatoriosAberto, setRelatoriosAberto] = useState(pathname.startsWith('/relatorios'));

  // Buscada pelo cliente, depois que a tela já apareceu — é só cosmético
  // (versão da API no rodapé do menu) e não deve atrasar a primeira
  // renderização de nenhuma tela do sistema.
  const [backendVersion, setBackendVersion] = useState('');
  useEffect(() => {
    fetch('/api/backend-version')
      .then((r) => r.json())
      .then((d: { versao?: string }) => setBackendVersion(d.versao ?? ''))
      .catch(() => {});
  }, []);

  // Se navegar para dentro de Relatórios por outro caminho (ex: link direto), expande sozinho.
  useEffect(() => {
    if (pathname.startsWith('/relatorios')) setRelatoriosAberto(true);
  }, [pathname]);

  // Ao entrar na Agenda, recolhe o menu automaticamente (mais espaço para o grid).
  // Em outras telas não força nada — o usuário mantém o estado que preferir.
  useEffect(() => {
    if (pathname.startsWith('/agenda')) setOpen(false);
  }, [pathname]);

  // Recolhido → o menu some por completo (mais área de tela) e fica só um
  // botão flutuante (☰) que reabre. Somente desktop (mobile usa o MobileHeader).
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Abrir menu"
        className={cn(
          'hidden md:flex fixed top-2.5 left-2.5 z-40 h-9 w-9 items-center justify-center',
          'rounded-lg border bg-background shadow-md',
          'text-foreground hover:bg-muted transition-colors',
        )}
      >
        <Menu className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-background relative',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        'w-56',
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
          <span
            title={filialNome || undefined}
            className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[110px]"
          >
            {filialNome ? `${filial} · ${filialNome}` : `Filial ${filial}`}
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
          {todos.map(({ href, label, icon: Icon, submenu }) => {
            const active = pathname.startsWith(href) && (!submenu || pathname === href);

            if (submenu) {
              return (
                <div key={href}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!open) { setOpen(true); setRelatoriosAberto(true); return; }
                      setRelatoriosAberto((v) => !v);
                    }}
                    title={!open ? label : undefined}
                    className={cn(
                      'flex w-full items-center rounded-md text-sm font-medium transition-colors',
                      'overflow-hidden whitespace-nowrap',
                      open ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2.5',
                      pathname.startsWith(href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={cn(
                      'flex-1 text-left transition-all duration-300 overflow-hidden',
                      open ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0',
                    )}>
                      {label}
                    </span>
                    {open && (relatoriosAberto
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0" />)}
                  </button>
                  {open && relatoriosAberto && (
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
