'use client';

import { useState } from 'react';
import { Menu, X, PawPrint, UserCircle2, LogOut } from 'lucide-react';
import NavLinks from './NavLinks';
import ThemeToggle from './ThemeToggle';
import { logout } from '@/app/login/actions';
import { cn } from '@/lib/utils';

const TIPO_LABEL: Record<string, string> = {
  S: 'Supervisor', G: 'Gerente', F: 'Ger. Especial', O: 'Operador',
};

interface UserInfo { codigo: number; nome: string; tipo: string; empresa: number; }
interface Props { filial: number; user: UserInfo | null; }

export default function MobileHeader({ filial, user }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Top bar (mobile only) ─────────────────────────────────────────── */}
      <header className="md:hidden flex items-center gap-2 border-b bg-background px-3 h-11 shrink-0 z-30 safe-top" style={{ paddingTop: 'max(0.125rem, env(safe-area-inset-top))' }}>
        <button
          onClick={() => setOpen(true)}
          className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <div className="flex items-center gap-1.5 flex-1">
          <PawPrint className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm leading-none">PetShop</span>
          <span className="ml-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Filial {filial}
          </span>
        </div>
      </header>

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background md:hidden',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand + fechar */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="font-semibold text-base leading-none">PetShop</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links — clicar em qualquer link fecha o drawer */}
        <div className="flex-1 overflow-y-auto py-3" onClick={() => setOpen(false)}>
          <NavLinks supervisor={user?.tipo === 'S'} />
        </div>

        {/* Usuário + tema + logout */}
        <div className="border-t px-3 py-3 space-y-1">
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
              <UserCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{user.nome}</p>
                <p className="truncate">
                  Cód. {user.codigo}
                  {user.tipo ? ` · ${TIPO_LABEL[user.tipo] ?? user.tipo}` : ''}
                </p>
              </div>
            </div>
          )}
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
