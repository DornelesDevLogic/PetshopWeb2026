'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '@/lib/nav-items';

const links = NAV_ITEMS;

// Visível apenas para Supervisor (SENHA.TIPO = 'S') — regra do sistema legado
const linkConfiguracoes: NavItem = {
  href: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal,
};

interface Props {
  supervisor?: boolean;
}

export default function NavLinks({ supervisor }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const todos = supervisor ? [...links, linkConfiguracoes] : links;
  const [relatoriosAberto, setRelatoriosAberto] = useState(pathname.startsWith('/relatorios'));

  useEffect(() => {
    if (pathname.startsWith('/relatorios')) setRelatoriosAberto(true);
  }, [pathname]);

  // Mesmo o drawer fechando na hora, a tela pode ficar alguns segundos sem
  // reação nenhuma até a próxima página (ex: Dashboards) carregar — o spinner
  // fica visível no instante entre o clique e o drawer fechar.
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

  return (
    <nav className="flex flex-col gap-1 px-3">
      {todos.map(({ href, label, icon: Icon, submenu, grupo }, i) => {
        const mostraDivisor = grupo && grupo !== todos[i - 1]?.grupo;
        const divisor = mostraDivisor && (
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {grupo}
            </span>
          </div>
        );

        if (submenu) {
          return (
            <div key={href}>
              {divisor}
              <button
                type="button"
                onClick={(e) => {
                  // Só alterna o submenu — não deve fechar o drawer mobile,
                  // que fecha em qualquer clique dentro do menu (ver MobileHeader).
                  e.stopPropagation();
                  setRelatoriosAberto((v) => !v);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
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

        const active = pathname.startsWith(href);
        const carregando = pendingHref === href;
        return (
          <div key={href}>
            {divisor}
            <button
              type="button"
              onClick={() => navegar(href)}
              className={cn(
                'w-full',
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                active
                  ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.55)]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {carregando
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                : <Icon className="h-4 w-4 shrink-0" />}
              {label}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
