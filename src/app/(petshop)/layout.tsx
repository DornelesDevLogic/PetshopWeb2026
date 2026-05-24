import NavLinks from '@/components/petshop/sidebar/NavLinks';
import { logout } from '@/app/login/actions';
import { PawPrint, LogOut } from 'lucide-react';
import { FILIAL } from '@/lib/api';

export default function PetShopLayout({ children }: { children: React.ReactNode }) {
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

        {/* Logout */}
        <div className="border-t px-3 py-3">
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
