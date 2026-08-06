'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PawPrint, LogOut, UserCircle2, SlidersHorizontal, ChevronLeft, ChevronDown, ChevronRight, Menu, Loader2, Plus } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { NAV_ITEMS, type NavItem } from '@/lib/nav-items';

const links = NAV_ITEMS;

const linkConfig: NavItem = { href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal };

interface Props {
  filial:     number;
  filialNome?: string;
  supervisor: boolean;
  user:       { codigo: number; nome: string; tipo: string; empresa: number } | null;
  logoutAction: () => Promise<void>;
  logoUrl?:   string | null;
}

const TIPO_LABEL: Record<string, string> = {
  S: 'Supervisor', G: 'Gerente', F: 'Ger. Especial', O: 'Operador',
};

export default function CollapsibleSidebar({ filial, filialNome, supervisor, user, logoutAction, logoUrl }: Props) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = useState(true);
  const todos = supervisor ? [...links, linkConfig] : links;
  const [relatoriosAberto, setRelatoriosAberto] = useState(pathname.startsWith('/relatorios'));

  // Feedback imediato no clique: páginas mais pesadas (ex: Dashboards) demoram
  // pra carregar, e sem isso o clique parece "não fazer nada" até o conteúdo
  // aparecer. `pendingHref` marca qual item mostra o spinner enquanto navega.
  // Importante: NÃO envolver o router.push em useTransition aqui — isso faz
  // o React suprimir o loading.tsx da página de destino (tela fica em branco
  // em vez de mostrar o "Carregando..."), já confirmado ao vivo em produção.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  function navegar(href: string) {
    if (href === pathname) return;
    setPendingHref(href);
    router.push(href);
  }
  useEffect(() => { setPendingHref(null); }, [pathname]);

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
        'hidden md:flex flex-col border-r border-border/70 bg-background/80 backdrop-blur-xl relative',
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
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="h-7 w-7 rounded-lg object-contain shrink-0" />
        ) : (
          <PawPrint className="h-6 w-6 text-primary shrink-0" />
        )}
        <div className={cn(
          'flex flex-col overflow-hidden whitespace-nowrap min-w-0',
          'transition-all duration-300',
          open ? 'opacity-100 max-w-[170px] ml-0' : 'opacity-0 max-w-0 ml-0',
        )}>
          <span title={filialNome || undefined} className="font-semibold text-sm leading-tight truncate">
            {filialNome || 'PetShop'}
          </span>
          <span className="text-[11px] text-muted-foreground">
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
          {todos.map(({ href, label, icon: Icon, submenu, grupo, quickCreateHref }, i) => {
            const active = pathname.startsWith(href) && (!submenu || pathname === href);
            const mostraDivisor = grupo && grupo !== todos[i - 1]?.grupo;

            const divisor = mostraDivisor && (
              <div className={cn('px-3 pt-3 pb-1', !open && 'text-center')}>
                {open ? (
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {grupo}
                  </span>
                ) : (
                  <div className="h-px bg-border mx-1" />
                )}
              </div>
            );

            if (submenu) {
              return (
                <div key={href}>
                  {divisor}
                  <button
                    type="button"
                    onClick={() => {
                      if (!open) { setOpen(true); setRelatoriosAberto(true); return; }
                      setRelatoriosAberto((v) => !v);
                    }}
                    title={!open ? label : undefined}
                    className={cn(
                      'flex w-full items-center rounded-xl text-sm font-medium transition-colors',
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
                              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors truncate',
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

            const carregando = pendingHref === href;
            return (
              <div key={href} className="relative group">
                {divisor}
                <button
                  type="button"
                  title={!open ? label : undefined}
                  onClick={() => navegar(href)}
                  className={cn(
                    'w-full',
                    'flex items-center rounded-xl text-sm font-medium transition-all',
                    'overflow-hidden whitespace-nowrap',
                    open ? 'gap-3 px-3 py-2' : 'justify-center px-0 py-2.5',
                    active
                      ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.55)]'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {carregando
                    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    : <Icon className="h-4 w-4 shrink-0" />}
                  <span className={cn(
                    'transition-all duration-300 overflow-hidden',
                    open ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0',
                  )}>
                    {label}
                  </span>
                </button>

                {/* Atalho de criação rápida — só aparece depois de ~2s com o
                    mouse parado em cima do item (transition-delay, sem timer). */}
                {quickCreateHref && (
                  <button
                    type="button"
                    title={`Novo em ${label}`}
                    onClick={() => navegar(quickCreateHref)}
                    className={cn(
                      'absolute right-1.5 top-1/2 -translate-y-1/2 z-20',
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      'bg-primary text-primary-foreground shadow-md hover:scale-110',
                      'opacity-0 scale-75 pointer-events-none',
                      'transition-all duration-200',
                      'group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-hover:delay-[2000ms]',
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Usuário + Logout ──────────────────────────────────────────────── */}
      <div className={cn(
        'border-t space-y-0.5 shrink-0 overflow-hidden',
        'transition-all duration-300',
        open ? 'px-3 py-2' : 'px-2 py-2',
      )}>
        {user && (
          <div className={cn(
            'flex items-center rounded-md bg-muted/50 text-[11px] text-muted-foreground overflow-hidden',
            'transition-all duration-300',
            open ? 'gap-2 px-2.5 py-1.5' : 'justify-center px-0 py-1.5',
          )}
            title={open ? undefined : `${user.nome} · Cód. ${user.codigo}`}
          >
            <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className={cn(
              'min-w-0 overflow-hidden transition-all duration-300 truncate',
              open ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0',
            )}>
              <span className="font-medium text-foreground">{user.nome}</span>
              {' · '}Cód. {user.codigo}
            </p>
          </div>
        )}
        <div className={cn('flex items-center', open ? 'justify-between gap-1' : 'flex-col gap-0.5')}>
          <form action={logoutAction} className={open ? 'flex-1' : undefined}>
            <button
              type="submit"
              title="Sair"
              className={cn(
                'flex items-center rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground overflow-hidden',
                open ? 'w-full gap-2 px-2.5 py-1.5' : 'justify-center px-0 py-1.5 w-full',
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span className={cn(
                'transition-all duration-300 overflow-hidden whitespace-nowrap',
                open ? 'opacity-100 max-w-[80px]' : 'opacity-0 max-w-0',
              )}>
                Sair
              </span>
            </button>
          </form>
          <ThemeToggle collapsed={!open} compact />
        </div>

        {/* ── Versão do backend ───────────────────────────────────────────── */}
        {backendVersion && (
          <div
            title={`API PetShop v${backendVersion}`}
            className="flex items-center justify-center text-[9px] text-muted-foreground/50 overflow-hidden"
          >
            <span className="font-mono">v{backendVersion.split('.').slice(0, 2).join('.')}</span>
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
