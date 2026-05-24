import NavLinks from '@/components/petshop/sidebar/NavLinks';
import { PawPrint } from 'lucide-react';
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

        {/* Footer */}
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          PetShop API v1
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
