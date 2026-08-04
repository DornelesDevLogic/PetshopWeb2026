import CollapsibleSidebar from '@/components/petshop/sidebar/CollapsibleSidebar';
import MobileHeader from '@/components/petshop/sidebar/MobileHeader';
import AcessoTracker from '@/components/petshop/AcessoTracker';
import { logout } from '@/app/login/actions';
import { getFilial } from '@/lib/api';
import { obterLogoEmpresa } from '@/lib/logo-empresa';
import { cookies } from 'next/headers';

interface UserInfo {
  codigo:  number;
  nome:    string;
  tipo:    string;
  empresa: number;       // filial de cadastro do usuário (SENHA.EMPRESA no legado)
  filial?: number;       // filial ATIVA da sessão (escolhida no login)
  filial_nome?: string;
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

export default async function PetShopLayout({ children }: { children: React.ReactNode }) {
  const user = getUser();
  const logoUrl = await obterLogoEmpresa();

  return (
    <div className="flex h-screen overflow-hidden">
      <AcessoTracker />

      {/* ── Sidebar colapsável (desktop) ──────────────────────────────────── */}
      <CollapsibleSidebar
        filial={getFilial()}
        filialNome={user?.filial_nome ?? ''}
        supervisor={user?.tipo === 'S'}
        user={user}
        logoutAction={logout}
        logoUrl={logoUrl}
      />

      {/* ── Área de conteúdo ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader filial={getFilial()} filialNome={user?.filial_nome ?? ''} user={user} logoUrl={logoUrl} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
