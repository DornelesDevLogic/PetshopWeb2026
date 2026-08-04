import CollapsibleSidebar from '@/components/petshop/sidebar/CollapsibleSidebar';
import MobileHeader from '@/components/petshop/sidebar/MobileHeader';
import AcessoTracker from '@/components/petshop/AcessoTracker';
import { logout } from '@/app/login/actions';
import { getFilial } from '@/lib/api';
import { obterInfoEmpresa } from '@/lib/empresa-info';
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
  const { nomeFantasia, logoUrl } = await obterInfoEmpresa();
  // Nome fantasia (TBLCAPFILIAIS) é o mais "de marca" — cai pro nome da
  // filial da sessão se a filial não tiver fantasia cadastrada.
  const nomeExibicao = nomeFantasia || user?.filial_nome || '';

  return (
    <div className="flex h-screen overflow-hidden">
      <AcessoTracker />

      {/* ── Sidebar colapsável (desktop) ──────────────────────────────────── */}
      <CollapsibleSidebar
        filial={getFilial()}
        filialNome={nomeExibicao}
        supervisor={user?.tipo === 'S'}
        user={user}
        logoutAction={logout}
        logoUrl={logoUrl}
      />

      {/* ── Área de conteúdo ──────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader filial={getFilial()} filialNome={nomeExibicao} user={user} logoUrl={logoUrl} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
