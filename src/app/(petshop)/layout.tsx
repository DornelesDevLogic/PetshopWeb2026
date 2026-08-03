import CollapsibleSidebar from '@/components/petshop/sidebar/CollapsibleSidebar';
import MobileHeader from '@/components/petshop/sidebar/MobileHeader';
import { logout } from '@/app/login/actions';
import { getFilial } from '@/lib/api';
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

export default function PetShopLayout({ children }: { children: React.ReactNode }) {
  const user = getUser();

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Sidebar colapsável (desktop) ──────────────────────────────────── */}
      <CollapsibleSidebar
        filial={getFilial()}
        filialNome={user?.filial_nome ?? ''}
        supervisor={user?.tipo === 'S'}
        user={user}
        logoutAction={logout}
      />

      {/* ── Área de conteúdo ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader filial={getFilial()} user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
