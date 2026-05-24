import NavLinks from '@/components/petshop/sidebar/NavLinks';
import { logout } from '@/app/login/actions';
import { PawPrint, LogOut, UserCircle2 } from 'lucide-react';
import { FILIAL } from '@/lib/api';
import { cookies } from 'next/headers';

interface UserInfo {
  codigo:  number;
  nome:    string;
  tipo:    string;
  empresa: number;
}

function getUser(): UserInfo | null {
  try {
    const raw = cookies().get('ps_user')?.value;
    if (!raw) return null;
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

const TIPO_LABEL: Record<string, string> = {
  S: 'Supervisor',
  G: 'Gerente',
  F: 'Ger. Especial',
  O: 'Operador',
};

export default function PetShopLayout({ children }: { children: React.ReactNode }) {
  const user = getUser();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r bg-white">
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <PawPrint className="h-6 w-6 text-primary" />
          <span className="font-semibold text-base leading-none">PetShop</span>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            Filial {FILIAL}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3">
          <NavLinks />
        </div>

        {/* Usuário logado + Logout */}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
